/**
 * Account Data Loading Utilities
 */

import { supabase } from '../../lib/supabase'
import { generateSlug } from '../../utils/helpers'
import { updateUserProfile } from '../../utils/profileUtils'
import type { Booking, SavedBusiness, SavedCoupon, PendingApplication, MyBusiness } from './types'
import type { CalendarEvent } from '../Calendar'

export async function loadBookings(email: string): Promise<Booking[]> {
  // Try booking_events table first (has customer data)
  try {
    const { data: eventsData, error: eventsError } = await supabase
      .from('booking_events')
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
    
    if (!eventsError && eventsData && eventsData.length > 0) {
      return eventsData.map((b: any) => ({
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
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, created_at, user_email, name, notes')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('[Account] Error loading bookings:', error)
      return []
    }
    
    return (data || []).map((b: any) => ({
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
    const { data, error } = await supabase
      .from('saved_providers')
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
    
    if (error) {
      console.log('[Account] Error loading saved businesses:', error)
      return []
    }
    
    return (data || []).map((s: any) => ({
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
 */
export async function loadSavedCoupons(userId: string): Promise<SavedCoupon[]> {
  try {
    const { data, error } = await supabase
      .from('coupon_redemptions')
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
    
    if (error) {
      console.log('[Account] Error loading saved coupons:', error)
      return []
    }
    
    return (data || []).map((c: any) => ({
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
 */
export async function loadMyEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('created_by_user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('[Account] Error loading created events:', error)
      return []
    }
    
    return (data || []) as CalendarEvent[]
  } catch (err) {
    console.log('[Account] Error loading created events:', err)
    return []
  }
}

/**
 * Load events SAVED/BOOKMARKED by the user (from user_saved_events table)
 * Shows in "Saved Events" section on account page
 */
export async function loadSavedEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    // Get event IDs that user has saved
    const { data: savedData, error: savedError } = await supabase
      .from('user_saved_events')
      .select('event_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (savedError) {
      console.log('[Account] Error loading saved event IDs:', savedError)
      return []
    }
    
    if (!savedData || savedData.length === 0) {
      return []
    }
    
    // Get the full event details for those IDs
    const eventIds = savedData.map(s => s.event_id)
    const { data: eventsData, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)
      .order('date', { ascending: true })
    
    if (eventsError) {
      console.log('[Account] Error loading saved events:', eventsError)
      return []
    }
    
    return (eventsData || []) as CalendarEvent[]
  } catch (err) {
    console.log('[Account] Error loading saved events:', err)
    return []
  }
}

export async function loadPendingApplications(email: string): Promise<PendingApplication[]> {
  try {
    const { data, error } = await supabase
      .from('business_applications')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.log('[Account] Error loading applications:', error)
      return []
    }
    
    return (data || []).map((r: any) => ({
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
    }))
  } catch (err) {
    console.log('[Account] Error loading applications:', err)
    return []
  }
}

export async function requestApplicationUpdate(applicationId: string, message: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Create a change request or notification for the admin
    // For now, we'll update the application with a note
    const { error } = await supabase
      .from('business_applications')
      .update({
        challenge: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
    
    if (error) {
      console.error('[Account] Error requesting update:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('[Account] Error requesting update:', err)
    return { success: false, error: err.message || 'Failed to request update' }
  }
}

export async function loadMyBusinesses(userId: string, userEmail?: string): Promise<MyBusiness[]> {
  try {
    // First try to load by owner_user_id
    const { data: ownerData, error: ownerError } = await supabase
      .from('providers')
      .select('id, name, category_key, address, phone, email, website, published, created_at')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
    
    if (ownerError) {
      console.log('[Account] Error loading businesses by owner_user_id:', ownerError)
    }
    
    // If user has an email, also try to find businesses by email (fallback for older businesses)
    if (userEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from('providers')
        .select('id, name, category_key, address, phone, email, website, published, created_at')
        .ilike('email', userEmail.trim())
        .is('owner_user_id', null) // Only get businesses not already linked
        .order('created_at', { ascending: false })
      
      if (emailError) {
        console.log('[Account] Error loading businesses by email:', emailError)
      }
      
      // Combine results and deduplicate by id
      const allBusinesses = [...(ownerData || []), ...(emailData || [])]
      const uniqueBusinesses = Array.from(
        new Map(allBusinesses.map(b => [b.id, b])).values()
      )
      
      // If we found businesses by email, log a warning that they need to be linked
      if (emailData && emailData.length > 0) {
        console.warn('[Account] Found businesses by email but not linked to user:', {
          userId,
          userEmail,
          unlinkedCount: emailData.length,
          businessNames: emailData.map(b => b.name)
        })
      }
      
      return uniqueBusinesses.map((b: any) => ({ ...b, slug: generateSlug(b.name) })) as MyBusiness[]
    }
    
    return ((ownerData || []) as any[]).map(b => ({ ...b, slug: generateSlug(b.name) })) as MyBusiness[]
  } catch (err) {
    console.log('[Account] Error loading user businesses:', err)
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
    const { error } = await supabase
      .from('saved_providers')
      .delete()
      .eq('id', savedId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        address: event.address,
        category: event.category,
      })
      .eq('id', eventId)
    
    if (error) {
      return { success: false, error: error.message }
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
      
      const { data: verify, error: verifyError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle()
      
      if (verifyError) {
        console.error(`[Account] Verification query error (attempt ${attempt}):`, verifyError)
        continue
      }
      
      if (!verify) {
        console.warn(`[Account] Verification returned no data (attempt ${attempt})`)
        continue
      }
      
      verifyData = verify
      const verifiedName = (verify.name || '').trim()
      
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
    const { data, error } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, marketing_emails_enabled, email_consent_date, email_unsubscribe_date')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Account] Error loading email preferences:', error)
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

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('[Account] Error updating email preferences:', error)
      return { success: false, error: error.message }
    }

    console.log('[Account] Email preferences updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[Account] Exception updating email preferences:', error)
    return { success: false, error: error.message }
  }
}

