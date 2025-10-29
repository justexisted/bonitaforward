/**
 * Account Data Loading Utilities
 */

import { supabase } from '../../lib/supabase'
import type { Booking, SavedBusiness, PendingApplication, MyBusiness } from './types'
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
      .order('created_at', { ascending: false })
    
    if (!eventsError && eventsData && eventsData.length > 0) {
      return eventsData.map((b: any) => ({
        id: b.id,
        provider_id: b.provider_id || b.providers?.id,
        provider_name: b.providers?.name,
        time: null,
        status: b.status,
        created_at: b.created_at,
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

export async function loadMyEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('created_by_user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('[Account] Error loading user events:', error)
      return []
    }
    
    return (data || []) as CalendarEvent[]
  } catch (err) {
    console.log('[Account] Error loading user events:', err)
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
      
      return uniqueBusinesses as MyBusiness[]
    }
    
    return (ownerData || []) as MyBusiness[]
  } catch (err) {
    console.log('[Account] Error loading user businesses:', err)
    return []
  }
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
    
    if (error) {
      return { success: false, error: error.message }
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

export async function updateProfile(userId: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the profile
    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', userId)
    
    if (error) {
      console.error('[Account] Profile update error:', error)
      return { success: false, error: error.message }
    }
    
    // Verify the update succeeded
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()
    
    if (verifyError || !verifyData) {
      console.error('[Account] Could not verify update:', verifyError)
      return { success: false, error: 'Update may not have saved' }
    }
    
    if (verifyData.name !== name) {
      console.error('[Account] Update verification failed. Expected:', name, 'Got:', verifyData.name)
      return { success: false, error: 'Update did not persist' }
    }
    
    console.log('[Account] Profile updated and verified successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[Account] Exception during update:', error)
    return { success: false, error: error.message }
  }
}

