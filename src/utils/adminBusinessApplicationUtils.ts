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

import { supabase } from '../lib/supabase'

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
 * - Creates unpublished provider (admin must manually publish)
 * - Updates application status to 'approved'
 * - Refreshes providers list
 * 
 * CRITICAL: Immediately removes from UI to prevent double-clicks
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
    const { data: existingProviders, error: checkError } = await supabase
      .from('providers')
      .select('id, name')
      .ilike('name', businessName)
      .limit(5)
    
    if (checkError) {
      console.error('[Admin] Error checking for duplicates:', checkError)
      setError('Failed to check for duplicate businesses. Please try again.')
      return
    }
    
    if (existingProviders && existingProviders.length > 0) {
      // Found potential duplicates - warn the admin
      const duplicateNames = existingProviders.map(p => p.name).join(', ')
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
      const { data: profRows } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', app.email)
        .limit(1)
      ownerUserId = ((profRows as any[])?.[0]?.id as string | undefined) || null
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
    published: false,  // Keep unpublished until admin manually publishes
    is_member: false   // Default to free tier
  }
  
  console.log('[Admin] Approving application with payload:', payload)
  
  // Create the provider
  const { error: insertError } = await supabase.from('providers').insert([payload as any])
  
  if (insertError) {
    console.error('[Admin] Error creating provider:', insertError)
    setError(`Failed to create provider: ${insertError.message}`)
    
    // ROLLBACK: Re-add the application to the UI since creation failed
    setBizApps((rows) => [app, ...rows])
    return
  }
  
  // Update application status to approved
  const { error: updateError } = await supabase
    .from('business_applications')
    .update({ status: 'approved' })
    .eq('id', appId)
  
  if (updateError) {
    console.error('[Admin] Error updating application status:', updateError)
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
      
      await supabase.from('user_notifications').insert({
        user_id: ownerUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'application_approved'
      })
      
      console.log('[Admin] ✅ Approval notification sent')
    } catch (err) {
      console.error('[Admin] Failed to send approval notification:', err)
      // Don't fail the approval just because notification failed
    }
  }
  
  // Refresh providers list
  try {
    const { data: pData } = await supabase
      .from('providers')
      .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
      .order('name', { ascending: true })
    setProviders((pData as ProviderRow[]) || [])
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
  const { data: app } = await supabase
    .from('business_applications')
    .select('*')
    .eq('id', appId)
    .single()
  
  if (!app) {
    setError('Application not found')
    return
  }
  
  // Ask admin for rejection reason
  const reason = prompt('Reason for rejection (will be sent to applicant):')
  if (reason === null) {
    // Admin cancelled - don't reject
    return
  }
  
  // Update status to rejected before deleting the application
  const { error: updateError } = await supabase
    .from('business_applications')
    .update({ status: 'rejected' })
    .eq('id', appId)
    
  if (updateError) {
    setError(updateError.message)
    return
  }
  
  // Send notification to the applicant if they have a user account
  if (app.email) {
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', app.email)
        .single()
      
      if (profile) {
        const notificationTitle = '❌ Business Application Rejected'
        const notificationMessage = reason 
          ? `Your application for "${app.business_name || 'your business'}" was rejected. Reason: ${reason}\n\nYou can submit a new application after addressing these concerns.`
          : `Your application for "${app.business_name || 'your business'}" was rejected. Please contact us if you have questions.`
        
        console.log('[Admin] Sending rejection notification to user:', profile.id)
        
        await supabase.from('user_notifications').insert({
          user_id: profile.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'application_rejected'
        })
        
        console.log('[Admin] ✅ Rejection notification sent')
      }
    } catch (err) {
      console.error('[Admin] Failed to send rejection notification:', err)
      // Don't fail the rejection just because notification failed
    }
  }
  
  const { error } = await supabase
    .from('business_applications')
    .delete()
    .eq('id', appId)
    
  if (error) {
    setError(error.message)
  } else {
    setMessage(`Application rejected and deleted. ${app.email ? 'Applicant has been notified.' : ''}`)
    setBizApps((rows) => rows.filter((r) => r.id !== appId))
  }
}

