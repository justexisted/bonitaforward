/**
 * Account Data Loading Utilities
 * 
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */

import { supabase } from '../../lib/supabase'
import { query, update, deleteRows } from '../../lib/supabaseQuery'
import { generateSlug } from '../../utils/helpers'
import { updateUserProfile } from '../../utils/profileUtils'
import type { Booking, SavedBusiness, SavedCoupon, PendingApplication, MyBusiness } from './types'
import type { CalendarEvent } from '../Calendar'

export async function loadBookings(email: string): Promise<Booking[]> {
  // Try booking_events table first (has customer data)
  try {
    const result = await query('booking_events', { logPrefix: '[Account]' })
      .select(`
        id,
        status,
        created_at,
        booking_date,
        customer_name,
        customer_email,
        booking_duration_minutes,
        booking_notes,
        provider_id,
        providers (
          id,
          name,
          category_key,
          address,
          phone
        )
      `)
      .eq('customer_email', email)
      .order('booking_date', { ascending: false })
      .execute()
    
    if (!result.error && result.data && result.data.length > 0) {
      return result.data.map((b: any) => ({
        id: b.id,
        provider_id: b.provider_id || b.providers?.id,
        provider_name: b.providers?.name,
        time: null,
        status: b.status,
        created_at: b.created_at,
          booking_date: b.booking_date,
        customer_name: b.customer_name,
        customer_email: b.customer_email,
        booking_duration_minutes: b.booking_duration_minutes,
        booking_notes: b.booking_notes,
        provider_category: b.providers?.category_key,
        provider_address: b.providers?.address,
        provider_phone: b.providers?.phone,
      }))
    }
  } catch (err) {
    console.log('[Account] booking_events query failed:', err)
  }

  // Fallback to bookings table (simpler structure - no category_key)
  try {
    const result = await query('bookings', { logPrefix: '[Account]' })
      .select('id, status, created_at, user_email, name, notes')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []).map((b: any) => ({
      id: b.id,
      provider_id: null,
      provider_name: b.name || 'Booking Request',
      time: null,
      status: b.status,
      created_at: b.created_at,
      customer_name: null,
      customer_email: b.user_email,
      booking_duration_minutes: null,
      booking_notes: b.notes,
      provider_category: null, // bookings table doesn't have category_key
      provider_address: null,
      provider_phone: null,
    }))
  } catch (err) {
    console.log('[Account] Error in bookings query:', err)
    return []
  }
}

export async function loadSavedBusinesses(userId: string): Promise<SavedBusiness[]> {
  try {
    const result = await query('saved_providers', { logPrefix: '[Account]' })
      .select(`
        id,
        provider_id,
        created_at,
        providers (
          name,
          category_key,
          address,
          phone,
          tags
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []).map((s: any) => ({
      id: s.id,
      provider_id: s.provider_id,
      created_at: s.created_at,
      provider_name: s.providers?.name,
      provider_category: s.providers?.category_key,
      provider_address: s.providers?.address,
      provider_phone: s.providers?.phone,
      provider_tags: s.providers?.tags,
    }))
  } catch (err) {
    console.log('[Account] Error loading saved businesses:', err)
    return []
  }
}

/**
 * Load saved coupons for the user
 * Shows in "Saved" section on account page
 * Uses centralized query utility with automatic retry logic
 */
export async function loadSavedCoupons(userId: string): Promise<SavedCoupon[]> {
  try {
    const result = await query('coupon_redemptions', { logPrefix: '[Account]' })
      .select(`
        id,
        provider_id,
        code,
        created_at,
        providers (
          name,
          coupon_code,
          coupon_discount,
          coupon_description
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []).map((c: any) => ({
      id: c.id,
      provider_id: c.provider_id,
      code: c.code,
      created_at: c.created_at,
      provider_name: c.providers?.name,
      coupon_code: c.providers?.coupon_code || c.code,
      coupon_discount: c.providers?.coupon_discount,
      coupon_description: c.providers?.coupon_description,
    }))
  } catch (err) {
    console.log('[Account] Error loading saved coupons:', err)
    return []
  }
}

/**
 * Load events CREATED by the user
 * Shows in "My Events" section on account page
 * Uses centralized query utility with automatic retry logic
 */
export async function loadMyEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const result = await query('calendar_events', { logPrefix: '[Account]' })
      .select('*')
      .eq('created_by_user_id', userId)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as CalendarEvent[]
  } catch (err) {
    console.log('[Account] Error loading created events:', err)
    return []
  }
}

/**
 * Load events SAVED/BOOKMARKED by the user (from user_saved_events table)
 * Shows in "Saved Events" section on account page
 * Uses centralized query utility with automatic retry logic
 */
export async function loadSavedEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    // Get event IDs that user has saved
    const savedResult = await query('user_saved_events', { logPrefix: '[Account]' })
      .select('event_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .execute()
    
    if (savedResult.error) {
      // Error already logged by query utility
      return []
    }
    
    if (!savedResult.data || savedResult.data.length === 0) {
      return []
    }
    
    // Get the full event details for those IDs
    const eventIds = savedResult.data.map((s: any) => s.event_id)
    const eventsResult = await query('calendar_events', { logPrefix: '[Account]' })
      .select('*')
      .in('id', eventIds)
      .order('date', { ascending: true })
      .execute()
    
    if (eventsResult.error) {
      // Error already logged by query utility
      return []
    }
    
    return (eventsResult.data || []) as CalendarEvent[]
  } catch (err) {
    console.log('[Account] Error loading saved events:', err)
    return []
  }
}

export async function loadPendingApplications(email: string): Promise<PendingApplication[]> {
  try {
    // DIAGNOSTIC: Log what we're querying for
    console.log('[Account] Loading pending applications for email:', email)
    
    const result = await query('business_applications', { logPrefix: '[Account]' })
      .select('*')
      .eq('email', email?.trim() || '')
      .order('created_at', { ascending: false })
      .limit(10)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      console.error('[Account] ❌ Error loading applications:', result.error)
      return []
    }
    
    const applications = (result.data || [])
      // Skip applications hidden by owner or cancelled
      .filter((r: any) => r.status !== 'cancelled' && !r.owner_hidden_at)
      .map((r: any) => ({
      id: r.id,
      business_name: r.business_name,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      category: r.category,
      challenge: r.challenge,
      tier_requested: r.tier_requested,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      owner_hidden_at: r.owner_hidden_at,
    }))
    
    console.log('[Account] ✅ Loaded applications:', {
      count: applications.length,
      emails: applications.map((a: PendingApplication) => a.email),
      businessNames: applications.map((a: PendingApplication) => a.business_name),
      statuses: applications.map((a: PendingApplication) => a.status)
    })
    
    return applications
  } catch (err) {
    console.error('[Account] ❌ Exception loading applications:', err)
    return []
  }
}

export async function requestApplicationUpdate(applicationId: string, message: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Create a change request or notification for the admin
    // For now, we'll update the application with a note
    const result = await update(
      'business_applications',
      {
        challenge: message,
        updated_at: new Date().toISOString()
      },
      { id: applicationId },
      { logPrefix: '[Account]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('[Account] Error requesting update:', err)
    return { success: false, error: err.message || 'Failed to request update' }
  }
}

export async function cancelPendingApplication(applicationId: string, accessToken: string): Promise<{ success: boolean, error?: string }> {
  try {
    const timestamp = new Date().toISOString()

    console.log('[Account] cancelPendingApplication invoked:', {
      applicationId,
      timestamp,
      updatePayload: {
        status: 'cancelled',
        decided_at: timestamp,
        updated_at: timestamp
      }
    })

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const endpoint = isLocal
      ? 'http://localhost:8888/.netlify/functions/cancel-business-application'
      : '/.netlify/functions/cancel-business-application'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        application_id: applicationId
      })
    })

    const responseBody = await response.json().catch(() => ({}))

    console.log('[Account] cancelPendingApplication function response:', {
      status: response.status,
      ok: response.ok,
      body: responseBody
    })

    if (!response.ok || responseBody?.success === false) {
      const errorMessage = responseBody?.error || `Request failed with status ${response.status}`
      return { success: false, error: errorMessage }
    }

    const statusFromFunction = responseBody?.status || responseBody?.data?.status
    if (statusFromFunction && statusFromFunction !== 'cancelled') {
      return { success: false, error: `Unexpected application status "${statusFromFunction}" from cancel function` }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Account] Error cancelling application:', err)
    return { success: false, error: err?.message || 'Failed to cancel application' }
  }
}

export async function deleteRejectedApplication(applicationId: string, accessToken: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('[Account] deleteRejectedApplication invoked:', { applicationId })

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const endpoint = isLocal
      ? 'http://localhost:8888/.netlify/functions/delete-business-application'
      : '/.netlify/functions/delete-business-application'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        application_id: applicationId
      })
    })

    const responseBody = await response.json().catch(() => ({}))

    console.log('[Account] deleteRejectedApplication function response:', {
      status: response.status,
      ok: response.ok,
      body: responseBody
    })

    if (!response.ok || responseBody?.success === false) {
      const errorMessage = responseBody?.error || `Request failed with status ${response.status}`
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Account] Error deleting application:', err)
    return { success: false, error: err?.message || 'Failed to delete application' }
  }
}

export async function loadMyBusinesses(userId: string, userEmail?: string): Promise<MyBusiness[]> {
  try {
    console.log('[Account] loadMyBusinesses called:', { userId, userEmail })
    
    // First try to load by owner_user_id
    // CRITICAL FIX: Filter out businesses with 'deleted' badge at the query level
    // This prevents deleted businesses from even being loaded
    const ownerResult = await query('providers', { logPrefix: '[Account]' })
      .select('id, name, category_key, address, phone, email, website, published, created_at, owner_user_id, badges')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .execute()
    
    let ownerData = ownerResult.data
    // CRITICAL FIX: Filter out businesses with 'deleted' badge immediately after query
    if (ownerData && Array.isArray(ownerData)) {
      ownerData = ownerData.filter((b: any) => {
        const hasDeletedBadge = Array.isArray(b.badges) && b.badges.includes('deleted')
        if (hasDeletedBadge) {
          console.log('[Account] 🔴 FILTERING OUT deleted business from owner query:', {
            id: b.id,
            name: b.name,
            badges: b.badges
          })
        }
        return !hasDeletedBadge
      })
    }
    
    console.log('[Account] Query by owner_user_id result (after filtering deleted):', {
      error: ownerResult.error,
      count: ownerData?.length || 0,
      ids: ownerData?.map((b: any) => b.id) || []
    })
    
    if (ownerResult.error) {
      // Error already logged by query utility
      console.log('[Account] Error loading businesses by owner_user_id')
    }
    
    // If user has an email, also try to find businesses by email (fallback for older businesses or unlinked)
    // This is important: we want to find businesses even if owner_user_id is null or different
    let emailData: Array<{
      id: string
      name: string
      category_key: string
      address?: string | null
      phone?: string | null
      email?: string | null
      website?: string | null
      published?: boolean | null
      created_at?: string | null
      owner_user_id?: string | null
      badges?: string[] | null
    }> = []
    if (userEmail) {
      const emailResult = await query('providers', { logPrefix: '[Account]' })
        .select('id, name, category_key, address, phone, email, website, published, created_at, owner_user_id, badges')
        .ilike('email', userEmail.trim())
        .order('created_at', { ascending: false })
        .execute()
      
      // CRITICAL FIX: Filter out businesses with 'deleted' badge immediately after query
      if (emailResult.data && Array.isArray(emailResult.data)) {
        emailData = emailResult.data.filter((b: any) => {
          const hasDeletedBadge = Array.isArray(b.badges) && b.badges.includes('deleted')
          if (hasDeletedBadge) {
            console.log('[Account] 🔴 FILTERING OUT deleted business from email query:', {
              id: b.id,
              name: b.name,
              badges: b.badges
            })
          }
          return !hasDeletedBadge
        }) as any[]
      }
      
      console.log('[Account] Query by email result (after filtering deleted):', {
        error: emailResult.error,
        count: emailData.length,
        businesses: emailData.map((b: any) => ({ id: b.id, name: b.name, owner_user_id: b.owner_user_id })) || []
      })
      
      if (emailResult.error) {
        // Error already logged by query utility
        console.log('[Account] Error loading businesses by email')
      }
    }
    
    // Combine results and deduplicate by id
    const allBusinesses = [...(ownerData || []), ...emailData]
    const uniqueBusinesses = Array.from(
      new Map(allBusinesses.map(b => [b.id, b])).values()
    )
    
    console.log('[Account] Combined businesses:', {
      ownerCount: ownerData?.length || 0,
      emailCount: emailData.length,
      totalUnique: uniqueBusinesses.length,
      allIds: uniqueBusinesses.map(b => b.id)
    })
    
    // CRITICAL FIX: Filter out businesses with 'deleted' badge from the final result
    // These businesses were intentionally deleted and should NOT appear in the list
    const businessesWithoutDeleted = uniqueBusinesses.filter(b => {
      const hasDeletedBadge = Array.isArray(b.badges) && b.badges.includes('deleted')
      if (hasDeletedBadge) {
        console.log('[Account] 🔴 FILTERING OUT deleted business from result:', {
          id: b.id,
          name: b.name,
          badges: b.badges
        })
      }
      return !hasDeletedBadge
    })
    
    console.log('[Account] After filtering deleted businesses:', {
      beforeFilter: uniqueBusinesses.length,
      afterFilter: businessesWithoutDeleted.length,
      filteredOut: uniqueBusinesses.length - businessesWithoutDeleted.length
    })
    
    // If we found businesses by email but not linked (owner_user_id is null or different), automatically reconnect them
    // This handles the case where user deleted account and signed up again
    // CRITICAL: Do NOT reconnect businesses with 'deleted' badge - these were intentionally deleted
    const unlinkedBusinesses = emailData.filter(b => {
      const hasDeletedBadge = Array.isArray(b.badges) && b.badges.includes('deleted')
      const isUnlinked = !b.owner_user_id || b.owner_user_id !== userId
      // Only reconnect if unlinked AND not marked as deleted
      return isUnlinked && !hasDeletedBadge
    })
    
    if (unlinkedBusinesses.length > 0) {
      console.log('[Account] Found businesses by email but not linked to user. Automatically reconnecting...', {
        userId,
        userEmail,
        unlinkedCount: unlinkedBusinesses.length,
        businessNames: unlinkedBusinesses.map(b => b.name)
      })
      
      // Automatically reconnect businesses by updating owner_user_id
      // This allows users to recover their businesses after account deletion (only if not marked as deleted)
      for (const business of unlinkedBusinesses) {
        try {
          const reconnectResult = await update(
            'providers',
            { 
              owner_user_id: userId
            },
            { id: business.id },
            { logPrefix: '[Account]' }
          )
          
          if (reconnectResult.error) {
            // Error already logged by query utility
            console.warn('[Account] Failed to reconnect business:', business.name)
          } else {
            console.log('[Account] ✓ Reconnected business:', business.name)
            // Update the business object so it appears as linked
            business.owner_user_id = userId
          }
        } catch (err) {
          console.warn('[Account] Error reconnecting business:', business.name, err)
        }
      }
    }
    
    // Log businesses that were NOT reconnected because they have 'deleted' badge
    const deletedBusinesses = emailData.filter(b => {
      const hasDeletedBadge = Array.isArray(b.badges) && b.badges.includes('deleted')
      const isUnlinked = !b.owner_user_id || b.owner_user_id !== userId
      return isUnlinked && hasDeletedBadge
    })
    if (deletedBusinesses.length > 0) {
      console.log('[Account] ⚠️ Found businesses with "deleted" badge - NOT reconnecting (intentionally deleted):', {
        count: deletedBusinesses.length,
        businessNames: deletedBusinesses.map(b => b.name),
        businessIds: deletedBusinesses.map(b => b.id)
      })
    }
    
    // CRITICAL FIX: Use businessesWithoutDeleted instead of uniqueBusinesses
    // This ensures deleted businesses are NEVER returned to the UI
    const result = businessesWithoutDeleted.map((b: any) => ({ ...b, slug: generateSlug(b.name) })) as MyBusiness[]
    console.log('[Account] Final loadMyBusinesses result (after filtering deleted):', {
      count: result.length,
      names: result.map(b => b.name)
    })
    return result
  } catch (err) {
    console.error('[Account] Error loading user businesses:', err)
    return []
  }
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use server function to cancel booking in booking_events with service role
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email
    if (!userEmail) {
      return { success: false, error: 'Not signed in' }
    }

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const url = isLocal
      ? 'http://localhost:8888/.netlify/functions/manage-booking'
      : '/.netlify/functions/manage-booking'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', bookingId, userEmail })
    })

    if (!res.ok) {
      const details = await res.json().catch(() => ({} as any))
      return { success: false, error: details?.error || 'Cancel failed' }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function unsaveBusiness(savedId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await deleteRows(
      'saved_providers',
      { id: savedId },
      { logPrefix: '[Account]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await deleteRows(
      'calendar_events',
      { id: eventId },
      { logPrefix: '[Account]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<{ success: boolean; error?: string }> {
  try {
    // CRITICAL: Preserve image_url and image_type when updating events
    // First, fetch the existing event to preserve its image data
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('image_url, image_type')
      .eq('id', eventId)
      .single()

    if (fetchError) {
      console.error('[Account] Failed to fetch existing event for image preservation:', fetchError)
      // Continue anyway - better to lose image than fail update
    }

    const result = await update(
      'calendar_events',
      {
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        address: event.address,
        category: event.category,
        // CRITICAL: Preserve existing image_url and image_type
        image_url: existingEvent?.image_url || event.image_url || null,
        image_type: existingEvent?.image_type || event.image_type || null
      },
      { id: eventId },
      { logPrefix: '[Account]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * REFACTORED: Uses updateUserProfile() from profileUtils to ensure ALL fields are saved
 * 
 * This function now uses the centralized profile update utility which:
 * - Ensures ALL fields are included (name, email, role, resident verification)
 * - Validates data before saving
 * - Handles INSERT vs UPDATE automatically
 * - Prevents missing fields during profile updates
 * 
 * Session validation and verification logic is preserved for security.
 * 
 * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
 */
export async function updateProfile(userId: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedName = name.trim()
    
    // CRITICAL: Verify session is valid and matches userId
    // RLS policies check auth.uid() - if session is invalid or doesn't match, UPDATE will silently fail
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Account] Error getting session:', sessionError)
      return { success: false, error: 'Session expired. Please refresh the page and try again.' }
    }
    
    if (!session) {
      return { success: false, error: 'Not signed in. Please refresh the page and try again.' }
    }
    
    const sessionUserId = session.user?.id
    if (sessionUserId !== userId) {
      console.error('[Account] Session userId mismatch:', { sessionUserId, userId })
      return { success: false, error: 'Session mismatch. Please refresh the page and try again.' }
    }
    
    // First verify profile exists and user has permission to read it
    // We also need to get the current email and role to preserve them during update
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', userId)
      .maybeSingle()
    
    if (checkError) {
      console.error('[Account] Error checking profile:', checkError)
      return { success: false, error: `Unable to access profile: ${checkError.message}` }
    }
    
    if (!existingProfile) {
      return { success: false, error: 'Profile not found' }
    }
    
    // Check if name is actually changing
    const currentName = (existingProfile.name || '').trim()
    if (currentName === trimmedName) {
      // Name is already set to this value - no update needed
      return { success: true }
    }
    
    // CRITICAL: Use updateUserProfile() to ensure ALL fields are preserved
    // We must include email and role from existing profile to prevent them from being cleared
    // updateUserProfile will merge with existing data and ensure completeness
    const result = await updateUserProfile(
      userId,
      {
        email: existingProfile.email || session.user?.email || '',
        name: trimmedName,
        role: (existingProfile.role as 'business' | 'community' | null) || null
      },
      'account-settings'
    )
    
    if (!result.success) {
      console.error('[Account] Profile update error:', result.error)
      return { success: false, error: result.error || 'Failed to update profile' }
    }
    
    // CRITICAL: Verify the update succeeded with retries
    // RLS might silently block UPDATE (0 rows affected) without throwing an error
    // We need to verify that the value actually changed
    const maxRetries = 3
    let verifyData: { name: string | null } | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait longer on each retry for eventual consistency
      await new Promise(resolve => setTimeout(resolve, 100 * attempt))
      
      const verifyResult = await query('profiles', { logPrefix: '[Account]' })
        .select('name')
        .eq('id', userId)
        .maybeSingle()
        .execute()
      
      if (verifyResult.error) {
        // Error already logged by query utility
        console.error(`[Account] Verification query error (attempt ${attempt}):`, verifyResult.error.message)
        continue
      }
      
      if (!verifyResult.data) {
        console.warn(`[Account] Verification returned no data (attempt ${attempt})`)
        continue
      }
      
      verifyData = verifyResult.data
      const verifiedName = (verifyData?.name || '').trim()
      
      if (verifiedName === trimmedName) {
        // Update succeeded!
        return { success: true }
      }
      
      console.warn(`[Account] Update verification failed (attempt ${attempt}). Expected: "${trimmedName}", Got: "${verifiedName}"`)
    }
    
    // All retries failed - update did not persist
    // Get current session for debugging
    const { data: { session: debugSession } } = await supabase.auth.getSession()
    console.error('[Account] Update verification failed after all retries', {
      userId,
      sessionUserId: debugSession?.user?.id || null,
      currentName,
      expectedName: trimmedName,
      verifiedName: verifyData?.name || null
    })
    
    // Check if RLS might be blocking the update
    // If we can read but not update, it's likely an RLS issue
    // The RLS policy "profiles_update_own" requires: USING (id = auth.uid())
    // If this fails, the UPDATE affects 0 rows without throwing an error
    if (existingProfile && currentName !== trimmedName) {
      return { 
        success: false, 
        error: 'Update was blocked by security policy. This usually means the Row Level Security (RLS) policy for profiles UPDATE is not configured correctly. Please contact support to verify your RLS policies are set up correctly.' 
      }
    }
    
    return { success: false, error: 'Update did not persist. Please try again.' }
  } catch (error: any) {
    console.error('[Account] Exception during update:', error)
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}

export async function loadEmailPreferences(userId: string): Promise<{
  email_notifications_enabled: boolean
  marketing_emails_enabled: boolean
  email_consent_date: string | null
  email_unsubscribe_date: string | null
} | null> {
  try {
    const result = await query('profiles', { logPrefix: '[Account]' })
      .select('email_notifications_enabled, marketing_emails_enabled, email_consent_date, email_unsubscribe_date')
      .eq('id', userId)
      .single()
      .execute()

    if (result.error) {
      // Error already logged by query utility
      return null
    }

    const data = result.data
    if (!data) {
      return null
    }

    // CRITICAL: Default to true for both preferences (matching signup defaults)
    // This ensures preferences set during signup are preserved
    // Only default to false if explicitly set to false in database
    return {
      email_notifications_enabled: data.email_notifications_enabled !== null && data.email_notifications_enabled !== undefined 
        ? data.email_notifications_enabled 
        : true, // Default to true (matches signup default)
      marketing_emails_enabled: data.marketing_emails_enabled !== null && data.marketing_emails_enabled !== undefined
        ? data.marketing_emails_enabled
        : true, // Default to true (matches signup default)
      email_consent_date: data.email_consent_date,
      email_unsubscribe_date: data.email_unsubscribe_date
    }
  } catch (error) {
    console.error('[Account] Exception loading email preferences:', error)
    return null
  }
}

export async function updateEmailPreferences(
  userId: string,
  preferences: {
    email_notifications_enabled?: boolean
    marketing_emails_enabled?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { ...preferences }
    
    // If disabling notifications, set unsubscribe date
    if (preferences.email_notifications_enabled === false) {
      updateData.email_unsubscribe_date = new Date().toISOString()
    }
    
    // If re-enabling notifications, clear unsubscribe date and set consent date
    if (preferences.email_notifications_enabled === true) {
      updateData.email_unsubscribe_date = null
      updateData.email_consent_date = new Date().toISOString()
    }

    const result = await update(
      'profiles',
      updateData,
      { id: userId },
      { logPrefix: '[Account]' }
    )

    if (result.error) {
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }

    console.log('[Account] Email preferences updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[Account] Exception updating email preferences:', error)
    return { success: false, error: error.message }
  }
}

