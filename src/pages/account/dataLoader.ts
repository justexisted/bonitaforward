/**
 * Account Data Loading Utilities
 */

import { supabase } from '../../lib/supabase'
import type { Booking, SavedBusiness, PendingApplication } from './types'
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

  // Fallback to bookings table (simpler structure)
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, created_at, user_email, category_key, name, notes')
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
      provider_category: b.category_key,
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

export async function loadMyEvents(_userId: string): Promise<CalendarEvent[]> {
  // Calendar events table doesn't have user association
  // Return empty array for now
  return []
}

export async function loadPendingApplications(email: string): Promise<PendingApplication[]> {
  try {
    const { data, error } = await supabase
      .from('business_applications')
      .select('id,business_name,created_at,email')
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
      created_at: r.created_at,
    }))
  } catch (err) {
    console.log('[Account] Error loading applications:', err)
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
    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', userId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

