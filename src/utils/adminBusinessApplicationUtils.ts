/**
 * Admin Business Application Management Utilities
 * 
 * This file contains functions for managing business applications in the admin panel.
 * These functions were extracted from Admin.tsx to improve code organization.
 * 
 * Functions included:
 * - approveApplication: Approve a pending business application and create a provider
 * - deleteApplication: Reject and delete a business application
 * 
 * These functions handle the critical workflow of turning business applications
 * into actual provider listings in the system.
 */

import { query, insert, update, selectOne } from '../lib/supabaseQuery'
import { notifyApplicationApproved, notifyChangeRequestRejected } from '../services/emailNotificationService'

// Type definitions
type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  created_at: string
  tier_requested: string | null
  status: string | null
}

export type ProviderRow = {
  id: string
  name: string
  category_key: string
  tags: string[] | null
  badges: string[] | null
  rating: number | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  images: string[] | null
  owner_user_id: string | null
  is_member?: boolean | null
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  bonita_resident_discount?: string | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
}

/**
 * APPROVE APPLICATION
 * 
 * This function approves a pending business application and creates a new provider.
 * It includes duplicate prevention, data parsing, and proper error handling.
 * 
 * Key features:
 * - Prevents double-approval by checking status
 * - Checks for duplicate business names
 * - Parses challenge data (JSON with business details)
 * - Combines admin-edited tags with application tags
 * - Links provider to user profile if email matches
 * - Auto-publishes provider (published: true) so business is immediately visible in directory
 * - Respects tier_requested field: Sets is_member/is_featured based on requested tier
 * - Sets featured_since timestamp for featured tier applications
 * - Updates application status to 'approved'
 * - Refreshes providers list
 * 
 * CRITICAL: Immediately removes from UI to prevent double-clicks
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - app.tier_requested: Must be 'free' or 'featured' to set correct tier
 * - app.challenge: Contains JSON with all business details (website, address, images, etc.)
 * - app.email: Used to find owner_user_id and send notifications
 * - appEdits: Admin-edited category and tags
 * 
 * WHAT DEPENDS ON THIS:
 * - Admin.tsx: Calls this function when approving applications
 * - BusinessListingCard: Displays businesses created by this function (checks is_member for featured status)
 * - fetchProvidersFromSupabase: Filters by published=true (businesses created here are now published)
 * - NotificationBell: Displays notifications sent by this function
 * - EmailNotificationService: Sends approval emails with tier information
 * 
 * BREAKING CHANGES:
 * - If you change published default → Businesses won't appear in directory (fixed: now always published)
 * - If you change tier logic → Featured businesses won't show correctly (fixed: now respects tier_requested)
 * - If you change is_member/is_featured logic → BusinessListingCard will show wrong tier
 * - If you change email notification tier → Users will get wrong tier info in emails
 * 
 * RECENT CHANGES (2025-01-XX):
 * - ✅ Changed published: false → published: true (businesses now immediately visible after approval)
 * - ✅ Added tier_requested support: Sets is_member/is_featured based on app.tier_requested
 * - ✅ Added featured_since timestamp for featured tier applications
 * - ✅ Updated email notification to use correct tier (was always 'free', now uses actual tier)
 * 
 * RELATED FILES:
 * - src/components/admin/sections/BusinessApplicationsSection-2025-10-19.tsx: Displays tier_requested to admin
 * - src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx: Similar tier logic for featured upgrades
 * - src/pages/MyBusiness/components/BusinessListingCard.tsx: Displays tier based on is_member
 * - src/lib/supabaseData.ts: fetchProvidersFromSupabase filters by published=true
 * 
 * See: docs/prevention/CASCADING_FAILURES.md - Section #26 (Admin INSERT Policy)
 */
export async function approveApplication(
  appId: string,
  bizApps: BusinessApplicationRow[],
  appEdits: Record<string, { category: string; tagsInput: string }>,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setBizApps: React.Dispatch<React.SetStateAction<BusinessApplicationRow[]>>,
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
) {
  setMessage(null)
  setError(null)
  
  const app = bizApps.find((b) => b.id === appId)
  if (!app) return
  
  // CRITICAL: Check if this application was already approved
  if (app.status === 'approved') {
    setError('This application has already been approved. Please refresh the page.')
    return
  }
  
  // Parse the challenge field which contains all the business details as JSON
  let challengeData: any = {}
  try {
    if (app.challenge) {
      challengeData = JSON.parse(app.challenge)
    }
  } catch (err) {
    console.error('[Admin] Error parsing challenge data:', err)
    setError('Failed to parse application data. Please contact support.')
    return
  }
  
  const businessName = app.business_name || 'Unnamed Business'
  
  // DUPLICATE PREVENTION: Check if a provider with this name already exists
  try {
    const checkResult = await query('providers', { logPrefix: '[Admin]' })
      .select('id, name')
      .ilike('name', businessName)
      .limit(5)
      .execute()
    
    const existingProviders = checkResult.data
    const checkError = checkResult.error
    
    if (checkError) {
      console.error('[Admin] Error checking for duplicates:', checkError)
      setError('Failed to check for duplicate businesses. Please try again.')
      return
    }
    
    if (existingProviders && Array.isArray(existingProviders) && existingProviders.length > 0) {
      // Found potential duplicates - warn the admin
      const duplicateNames = existingProviders.map((p: any) => p.name).join(', ')
      const confirmed = window.confirm(
        `⚠️ WARNING: A business with a similar name already exists:\n\n${duplicateNames}\n\n` +
        `Are you sure you want to create "${businessName}"?\n\n` +
        `Click OK to create anyway, or Cancel to prevent duplicate.`
      )
      
      if (!confirmed) {
        setMessage('Application approval cancelled to prevent duplicate.')
        return
      }
    }
  } catch (err: any) {
    console.error('[Admin] Exception checking duplicates:', err)
    setError(`Failed to verify duplicates: ${err.message}`)
    return
  }
  
  // Get admin-edited category and tags, or fall back to application's category
  const draft = appEdits[appId] || { category: app.category || 'professional-services', tagsInput: '' }
  const adminTags = draft.tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
  
  // Combine tags from challenge data and admin input
  const challengeTags = Array.isArray(challengeData.tags) ? challengeData.tags : []
  const allTags = [...new Set([...challengeTags, ...adminTags])]  // Remove duplicates
  
  // Attempt to find a profile/user by the application's email so we can assign ownership to the applicant
  let ownerUserId: string | null = null
  try {
    if (app.email) {
      const profResult = await query('profiles', { logPrefix: '[Admin]' })
        .select('id')
        .eq('email', app.email)
        .limit(1)
        .execute()
      
      if (!profResult.error && profResult.data) {
        const profRows = Array.isArray(profResult.data) ? profResult.data : [profResult.data]
        ownerUserId = ((profRows as any[])?.[0]?.id as string | undefined) || null
      }
    }
  } catch (err) {
    console.warn('[Admin] Could not find owner user:', err)
  }
  
  // IMMEDIATELY remove from UI to prevent double-approval
  setBizApps((rows) => rows.filter((r) => r.id !== appId))
  
  // Create provider with ALL data from the application
  const payload: Partial<ProviderRow> = {
    name: businessName as any,
    category_key: draft.category as any,
    tags: allTags as any,
    phone: (app.phone || null) as any,
    email: (app.email || null) as any,
    website: (challengeData.website || null) as any,
    address: (challengeData.address || null) as any,
    description: (challengeData.description || null) as any,
    images: (Array.isArray(challengeData.images) ? challengeData.images : []) as any,
    specialties: (Array.isArray(challengeData.specialties) ? challengeData.specialties : []) as any,
    social_links: (challengeData.social_links || {}) as any,
    business_hours: (challengeData.business_hours || {}) as any,
    service_areas: (Array.isArray(challengeData.service_areas) ? challengeData.service_areas : []) as any,
    google_maps_url: (challengeData.google_maps_url || null) as any,
    bonita_resident_discount: (challengeData.bonita_resident_discount || null) as any,
    owner_user_id: (ownerUserId || null) as any,
    published: true,  // Auto-publish when approved so business is immediately visible in directory
    // Set tier based on what was requested in the application
    is_member: app.tier_requested === 'featured',  // Set to true if featured tier was requested
    is_featured: app.tier_requested === 'featured',  // Also set is_featured for consistency
    featured_since: app.tier_requested === 'featured' ? new Date().toISOString() : null  // Set featured_since timestamp if featured
  }
  
  console.log('[Admin] Approving application with payload:', payload)
  
  // Create the provider
  const insertResult = await insert(
    'providers',
    [payload as any],
    { logPrefix: '[Admin]' }
  )
  
  if (insertResult.error) {
    // Error already logged by query utility
    setError(`Failed to create provider: ${insertResult.error.message}`)
    
    // ROLLBACK: Re-add the application to the UI since creation failed
    setBizApps((rows) => [app, ...rows])
    return
  }
  
  // Update application status to approved
  const updateResult = await update(
    'business_applications',
    { status: 'approved' },
    { id: appId },
    { logPrefix: '[Admin]' }
  )
  
  if (updateResult.error) {
    // Error already logged by query utility
    // Don't rollback here - the provider was created successfully
    // Just log the error and continue
  }
  
  setMessage(`✅ Application approved! "${businessName}" has been created as a new provider.`)
  
  // Send notification to the applicant if they have a user account
  if (ownerUserId) {
    try {
      const notificationTitle = '✅ Business Application Approved!'
      const notificationMessage = `Great news! Your application for "${businessName}" has been approved and your business listing has been created. You can now manage it from your account.`
      
      console.log('[Admin] Sending approval notification to user:', ownerUserId)
      
      // FIXED: Added 'subject' field which is required by the database schema
      const notifResult = await insert(
        'user_notifications',
        {
          user_id: ownerUserId,
          subject: notificationTitle, // Database schema uses subject/body
          body: notificationMessage,
          title: notificationTitle, // Retained for forward compatibility with newer UI mapping
          message: notificationMessage,
          type: 'application_approved',
          metadata: {
            type: 'application_approved',
            link: '/my-business'
          }
        },
        { logPrefix: '[Admin]' }
      )
      
      if (notifResult.error) {
        // Error already logged by query utility
        console.error('[Admin] ❌ Failed to insert approval notification')
      }
      
      console.log('[Admin] ✅ Approval notification sent')
    } catch (err) {
      console.error('[Admin] Failed to send approval notification:', err)
      // Don't fail the approval just because notification failed
    }
  }

  // Send email notification to applicant (works even if they don't have an account yet)
  if (app.email) {
    try {
      console.log('[Admin] Sending approval email to:', app.email)
      await notifyApplicationApproved(
        app.email,
        businessName,
        draft.category,
        (app.tier_requested === 'featured' ? 'featured' : 'free') as 'free' | 'featured'  // Use the tier that was requested and approved
      )
      console.log('[Admin] ✅ Approval email sent successfully')
    } catch (err) {
      console.error('[Admin] Failed to send approval email:', err)
      // Don't fail the approval just because email failed
    }
  }
  
  // Refresh providers list
  try {
    const refreshResult = await query('providers', { logPrefix: '[Admin]' })
      .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
      .order('name', { ascending: true })
      .execute()
    
    if (!refreshResult.error && refreshResult.data) {
      setProviders((refreshResult.data as ProviderRow[]) || [])
    }
  } catch (err) {
    console.error('[Admin] Error refreshing providers:', err)
  }
}

/**
 * DELETE APPLICATION
 * 
 * This function rejects and deletes a business application.
 * It updates the status to 'rejected' before deleting for audit trail purposes.
 * IMPORTANT: Now sends a notification to the applicant explaining why they were rejected.
 */
export async function deleteApplication(
  appId: string,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setBizApps: React.Dispatch<React.SetStateAction<BusinessApplicationRow[]>>
) {
  setMessage(null)
  
  // Get the application details before deleting
  const appResult = await query('business_applications', { logPrefix: '[Admin]' })
    .select('*')
    .eq('id', appId)
    .single()
    .execute()
  
  if (appResult.error || !appResult.data) {
    setError('Application not found')
    return
  }
  
  const app = appResult.data as BusinessApplicationRow
  
  // Ask admin for rejection reason
  const reason = prompt('Reason for rejection (will be sent to applicant):')
  if (reason === null) {
    // Admin cancelled - don't reject
    return
  }
  
  // Update status to rejected - DO NOT DELETE
  // CRITICAL: Keep rejected applications for audit trail and user visibility
  // Users need to see their rejected applications in "Recently Rejected" section
  // TODO: Add decided_at column to database and set it here when column exists
  const updateResult = await update(
    'business_applications',
    { status: 'rejected' },
    { id: appId },
    { logPrefix: '[Admin]' }
  )
    
  if (updateResult.error) {
    // Error already logged by query utility
    setError(updateResult.error.message)
    return
  }
  
  // Send notification to the applicant if they have a user account
  if (app.email) {
    try {
      // Find user by email
      const profileResult = await selectOne(
        'profiles',
        { email: app.email },
        { logPrefix: '[Admin]' }
      )
      
      if (profileResult) {
        const profile = profileResult as { id: string }
        const notificationTitle = '❌ Business Application Rejected'
        const notificationMessage = reason 
          ? `Your application for "${app.business_name || 'your business'}" was rejected. Reason: ${reason}\n\nYou can submit a new application after addressing these concerns.`
          : `Your application for "${app.business_name || 'your business'}" was rejected. Please contact us if you have questions.`
        
        console.log('[Admin] Sending rejection notification to user:', profile.id)
        
        // FIXED: Added 'subject' field which is required by the database schema
        const notifResult = await insert(
          'user_notifications',
          {
            user_id: profile.id,
            subject: notificationTitle,
            body: notificationMessage,
            title: notificationTitle,
            message: notificationMessage,
            type: 'application_rejected',
            metadata: {
              type: 'application_rejected',
              reason: reason || 'No reason provided',
              link: '/account',
              link_section: 'applications'
            }
          },
          { logPrefix: '[Admin]' }
        )
        
        if (notifResult.error) {
          // Error already logged by query utility
          console.error('[Admin] ❌ Failed to insert rejection notification')
        } else {
          console.log('[Admin] ✅ Rejection notification sent')
        }
      }
    } catch (err) {
      console.error('[Admin] Failed to send rejection notification:', err)
      // Don't fail the rejection just because notification failed
    }
  }

  // Send email notification to applicant (works even if they don't have an account yet)
  if (app.email) {
    try {
      console.log('[Admin] Sending rejection email to:', app.email)
      await notifyChangeRequestRejected(
        app.email,
        app.business_name || 'your business',
        'update', // Use 'update' as closest match for application rejection
        reason || undefined
      )
      console.log('[Admin] ✅ Rejection email sent successfully')
    } catch (err) {
      console.error('[Admin] Failed to send rejection email:', err)
      // Don't fail the rejection just because email failed
    }
  }
  
  // CRITICAL FIX: DO NOT DELETE REJECTED APPLICATIONS
  // Keep them in the database so users can see them in "Recently Rejected" section
  // Only remove from UI list, but keep in database
  setMessage(`Application rejected. ${app.email ? 'Applicant has been notified.' : ''}`)
  setBizApps((rows) => rows.filter((r) => r.id !== appId))
  
  // NOTE: Application remains in database with status = 'rejected'
  // This allows users to see their rejected applications in /my-business page
}

