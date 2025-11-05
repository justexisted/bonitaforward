/**
 * Admin Data Loading Utilities
 * 
 * This file contains all data loading functions that fetch data from Netlify functions.
 * These functions were extracted from Admin.tsx to improve code organization.
 * 
 * Functions included:
 * - loadChangeRequests: Load provider change requests
 * - loadJobPosts: Load provider job posts
 * - loadBookingEvents: Load calendar booking events
 * 
 * Why Netlify functions?
 * These functions use Netlify serverless functions to bypass RLS (Row Level Security)
 * policies using the SERVICE_ROLE_KEY, allowing admins to access all data.
 */

import { supabase } from '../lib/supabase'
import { query } from '../lib/supabaseQuery'
import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'

// Extended type for change requests with joined provider and profile data
type ProviderChangeRequestWithDetails = ProviderChangeRequest & {
  providers?: {
    id: string
    name: string
    email: string | null
  }
  profiles?: {
    id: string
    email: string
    name: string | null
  }
}

// Extended type for job posts with provider information
type ProviderJobPostWithDetails = ProviderJobPost & {
  provider?: {
    id: string
    name: string
    email: string | null
  }
  owner?: {
    id: string
    email: string
    name: string | null
  }
}

// Type for booking events
type BookingEvent = {
  id: string
  provider_id: string
  customer_email: string
  customer_name: string | null
  booking_date: string
  booking_duration_minutes: number | null
  booking_notes: string | null
  status: string | null
  created_at: string
  providers?: {
    name: string
    category_key: string
    address: string | null
    phone: string | null
  }
}

/**
 * LOAD CHANGE REQUESTS
 * 
 * This function loads all change requests from the database for admin review.
 * It uses a Netlify function with SERVICE_ROLE_KEY to bypass RLS policies.
 * 
 * How it works:
 * 1. Gets the current auth session and token
 * 2. Calls Netlify function with auth token
 * 3. Netlify function uses SERVICE_ROLE_KEY to fetch all change requests
 * 4. Updates the changeRequests state with the fetched data
 * 
 * This provides the admin with a complete list of all pending change requests.
 */
export async function loadChangeRequests(
  setError: (err: string | null) => void,
  setChangeRequests: React.Dispatch<React.SetStateAction<ProviderChangeRequestWithDetails[]>>
) {
  try {
    console.log('[Admin] STARTING loadChangeRequests')
    
    // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
    // refreshSession() was causing the auth state to be cleared, signing out the user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Admin] ❌ Session get failed:', sessionError)
      setError('Session error. Please refresh the page and sign in again.')
      return
    }
    
    if (!session?.access_token) {
      console.error('[Admin] ❌ No auth token available')
      setError('Not authenticated. Please refresh the page and sign in again.')
      return
    }

    console.log('[Admin] ✓ Session acquired, auth token obtained')

    // Call Netlify function that uses service role to bypass RLS and auto-create missing profiles
    const url = '/.netlify/functions/admin-list-change-requests'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Admin] ❌ Error response body:', errorText)
      setError(`Failed to load change requests (HTTP ${response.status}): ${errorText}`)
      return
    }

    const result = await response.json()
    
    if (!result.requests) {
      console.error('[Admin] ❌ Result has no requests property:', result)
      setError('Invalid response from server')
      return
    }
    
    console.log('[Admin] ✓ Setting changeRequests state with', result.requests.length, 'items')
    setChangeRequests(result.requests)
    
  } catch (error: any) {
    console.error('========================================')
    console.error('[Admin] ❌ EXCEPTION in loadChangeRequests:', error)
    console.error('[Admin] Error stack:', error.stack)
    console.error('========================================')
    setError(`Failed to load change requests: ${error.message}`)
  }
}

/**
 * LOAD JOB POSTS
 * 
 * This function loads all provider job posts from the database for admin review.
 * It uses a Netlify function with SERVICE_ROLE_KEY to bypass RLS policies.
 * 
 * How it works:
 * 1. Gets the current auth session and token
 * 2. Calls Netlify function with auth token
 * 3. Netlify function uses SERVICE_ROLE_KEY to fetch all job posts
 * 4. Updates the jobPosts state with the fetched data
 */
export async function loadJobPosts(
  setError: (err: string | null) => void,
  setJobPosts: React.Dispatch<React.SetStateAction<ProviderJobPostWithDetails[]>>
) {
  try {
    console.log('[Admin] STARTING loadJobPosts')
    
    // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      console.error('[Admin] No session token available for job posts')
      setError('Session error. Please refresh the page.')
      return
    }

    // Call Netlify function with service role to bypass RLS
    const url = '/.netlify/functions/admin-list-job-posts'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Admin] Job posts function error:', response.status, errorText)
      throw new Error(`Function call failed: ${response.status}`)
    }

    const result = await response.json()

    if (result.error) {
      console.error('[Admin] Function returned error:', result.error)
      throw new Error(result.error)
    }

    // Process the job posts data
    const jobPostsData = result.jobPosts || []
    console.log('[Admin] ✓ Received', jobPostsData.length, 'job posts from function')
    
    // Update state with the fetched data
    setJobPosts(jobPostsData)
    
  } catch (error: any) {
    console.error('[Admin] ❌ EXCEPTION in loadJobPosts:', error)
    setError(`Failed to load job posts: ${error.message}`)
    setJobPosts([])
  }
}

/**
 * LOAD BOOKING EVENTS
 * 
 * This function loads all calendar booking events from the database for admin review.
 * It uses a Netlify function with SERVICE_ROLE_KEY to bypass RLS policies.
 * Falls back to direct Supabase query if Netlify function is unavailable.
 * 
 * How it works:
 * 1. Gets the current auth session and token
 * 2. Tries to call Netlify function with auth token
 * 3. Netlify function uses SERVICE_ROLE_KEY to fetch all booking events
 * 4. Falls back to direct query if function fails (for local dev)
 * 5. Updates the bookingEvents state with the fetched data
 */
export async function loadBookingEvents(
  setError: (err: string | null) => void,
  setBookingEvents: React.Dispatch<React.SetStateAction<BookingEvent[]>>
) {
  try {
    console.log('[Admin] STARTING loadBookingEvents')
    
    // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      console.error('[Admin] No session token available for booking events')
      setError('Session error. Please refresh the page.')
      return
    }

    // Try to call Netlify function with service role to bypass RLS
    // Fall back to direct query if function not available (local dev)
    const url = '/.netlify/functions/admin-list-booking-events'
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // No customer email filter - get all bookings
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[Admin] Booking events function error:', response.status, errorText)
        throw new Error(`Function call failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        console.warn('[Admin] Function returned error:', result.error)
        throw new Error(result.error)
      }

      // Process the booking events data
      const bookingEventsData = result.bookingEvents || []
      console.log('[Admin] ✓ Received', bookingEventsData.length, 'booking events from function')
      
      // Update state with the fetched data
      setBookingEvents(bookingEventsData)
    } catch (fetchError: any) {
      // Fallback: Try direct Supabase query (may hit RLS in production)
      console.warn('[Admin] Netlify function unavailable, trying direct query:', fetchError.message)
      
      try {
        // Uses centralized query utility with automatic retry logic and standardized error handling
        // Fallback query when Netlify function is unavailable (local dev)
        const { data, error: directError } = await query('booking_events', { logPrefix: '[Admin]' })
          .select('*')
          .order('created_at', { ascending: false })
        
        if (directError) {
          // Error already logged by query utility with standardized format
          console.warn('[Admin] Direct query also failed (expected if RLS not configured):', directError.message)
          setBookingEvents([])
        } else {
          console.log('[Admin] ✓ Loaded', data?.length || 0, 'booking events via direct query')
          setBookingEvents(data || [])
        }
      } catch (directQueryError) {
        console.warn('[Admin] Direct query error:', directQueryError)
        setBookingEvents([])
      }
    }
    
  } catch (error: any) {
    console.error('[Admin] ❌ EXCEPTION in loadBookingEvents:', error)
    setBookingEvents([])
  }
}


