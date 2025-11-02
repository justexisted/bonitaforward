/**
 * Admin User Management Utilities
 * 
 * This file contains all user-related administrative functions.
 * These functions were extracted from Admin.tsx to improve code organization
 * and maintainability.
 * 
 * Functions included:
 * - deleteUser: Delete a user and all associated data
 * - deleteCustomerUser: Delete a customer user by email
 * - fetchBusinessDetails: Fetch business details for a business account
 * - collapseBusinessDetails: Collapse expanded business details
 */

import { supabase } from '../lib/supabase'

// Type definitions
type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * DELETE USER
 * 
 * Deletes a user and all their associated data using Netlify function.
 * This includes their profile, funnel responses, and bookings.
 */
export async function deleteUser(
  userId: string,
  profiles: ProfileRow[],
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setDeletingUserId: (id: string | null) => void,
  setProfiles: React.Dispatch<React.SetStateAction<ProfileRow[]>>,
  setFunnels: React.Dispatch<React.SetStateAction<FunnelRow[]>>,
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>
) {
  setMessage(null)
  setDeletingUserId(userId)
  try {
    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }
    
    // Call Netlify function to delete user
    const url = '/.netlify/functions/admin-delete-user'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ user_id: userId })
    })
    
    if (!response.ok) {
      // Try to parse as JSON first for detailed error
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        console.error('[Admin] Delete error details:', errorData)
        
        if (errorData.error) {
          errorMessage = errorData.error
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
          if (errorData.hint) {
            errorMessage += ` (${errorData.hint})`
          }
          if (errorData.code) {
            console.error('[Admin] Error code:', errorData.code)
          }
        }
      } catch (parseErr) {
        // Fallback to text if JSON parsing fails
        const errorText = await response.text()
        console.error('[Admin] Delete error text:', errorText)
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    const result = await response.json()
    
    // Log response for debugging
    console.log('[Admin] Delete user response:', result)
    
    // Check for success field (new format) or ok field (legacy format)
    // The new refactored function returns { success: true, message: ..., deletedCounts: ... }
    if (result.success === true || result.ok === true) {
      // Success - continue with deletion cleanup
    } else {
      // No success indicator found - this is an error
      console.error('[Admin] Delete response missing success indicator:', result)
      throw new Error(result.error || result.message || 'Delete failed - no success indicator in response')
    }
    
    // Remove from local lists - get the user's email first
    const deletedProfile = profiles.find(p => p.id === userId)
    const deletedEmail = deletedProfile?.email?.toLowerCase().trim()
    
    // Remove profile from profiles list
    setProfiles((arr) => arr.filter((p) => p.id !== userId))
    
    // CRITICAL FIX: Remove funnel responses and bookings by email
    // This ensures the "All users" dropdown updates immediately
    if (deletedEmail) {
      setFunnels((arr) => arr.filter((f) => {
        const funnelEmail = f.user_email?.toLowerCase().trim()
        return funnelEmail !== deletedEmail
      }))
      setBookings((arr) => arr.filter((b) => {
        const bookingEmail = b.user_email?.toLowerCase().trim()
        return bookingEmail !== deletedEmail
      }))
    }
    
    setMessage('User deleted successfully - all associated data removed')
  } catch (err: any) {
    console.error('[Admin] Delete user error:', err)
    setError(err?.message || 'Failed to delete user')
  } finally {
    setDeletingUserId(null)
  }
}

/**
 * DELETE CUSTOMER USER
 * 
 * Deletes a customer user by email. This removes their funnel responses,
 * bookings, and optionally their auth profile if they're not a business owner.
 */
export async function deleteCustomerUser(
  email: string,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setDeletingCustomerEmail: (email: string | null) => void,
  setProfiles: React.Dispatch<React.SetStateAction<ProfileRow[]>>,
  setFunnels: React.Dispatch<React.SetStateAction<FunnelRow[]>>,
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>
) {
  setMessage(null)
  setDeletingCustomerEmail(email)
  try {
    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }
    
    // Remove funnel responses and bookings for this email
    try { await supabase.from('funnel_responses').delete().eq('user_email', email) } catch {}
    try { await supabase.from('bookings').delete().eq('user_email', email) } catch {}
    
    // If an auth profile exists (and is not a business owner), delete the auth user as well
    try {
      const { data: prof } = await supabase.from('profiles').select('id,role').eq('email', email).limit(1).maybeSingle()
      const pid = (prof as any)?.id as string | undefined
      const role = (prof as any)?.role as string | undefined
      if (pid && role !== 'business') {
        // Call Netlify function to delete user
        const url = '/.netlify/functions/admin-delete-user'
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ user_id: pid })
        })
        
        if (response.ok) {
          setProfiles((arr) => arr.filter((p) => p.id !== pid))
        }
      }
    } catch {}
    
    // Update local UI lists
    setFunnels((arr) => arr.filter((f) => f.user_email !== email))
    setBookings((arr) => arr.filter((b) => b.user_email !== email))
    setMessage('Customer user deleted')
  } catch (err: any) {
    setError(err?.message || 'Failed to delete customer user')
  } finally {
    setDeletingCustomerEmail(null)
  }
}

/**
 * FETCH BUSINESS DETAILS
 * 
 * This function fetches business details for a specific business account user.
 * It uses a Netlify function to bypass RLS policies and fetch provider data.
 * 
 * How it works:
 * 1. Sets loading state for the specific user
 * 2. Uses existing profile data to get user email and name
 * 3. Calls Netlify function with SERVICE_ROLE_KEY to bypass RLS
 * 4. Returns business name, phone, and other relevant details
 * 5. Updates expandedBusinessDetails state with the fetched data
 */
export async function fetchBusinessDetails(
  userId: string,
  profiles: ProfileRow[],
  setLoadingBusinessDetails: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setExpandedBusinessDetails: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setError: (err: string | null) => void
) {
  setLoadingBusinessDetails(prev => ({ ...prev, [userId]: true }))
  
  try {
    // Get the user's email and name from the existing profiles data
    const userProfile = profiles.find(p => p.id === userId)
    const userEmail = userProfile?.email
    const userName = userProfile?.name

    // Get auth session for the request
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('No authentication token available')
    }

    // Call Netlify function to fetch business details (bypasses RLS)
    const url = '/.netlify/functions/admin-get-business-details'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        userEmail,
        userName
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.details || result.error || 'Failed to fetch business details')
    }

    const uniqueBusinessData = result.businessData || []

    // Update expanded details with the fetched business data
    setExpandedBusinessDetails(prev => ({
      ...prev,
      [userId]: uniqueBusinessData
    }))

  } catch (err: any) {
    console.error('[Admin] Error fetching business details:', err)
    setError(`Failed to fetch business details: ${err.message}`)
  } finally {
    setLoadingBusinessDetails(prev => ({ ...prev, [userId]: false }))
  }
}

/**
 * COLLAPSE BUSINESS DETAILS
 * 
 * This function collapses the expanded business details for a specific user.
 * It removes the user's data from the expandedBusinessDetails state.
 */
export function collapseBusinessDetails(
  userId: string,
  setExpandedBusinessDetails: React.Dispatch<React.SetStateAction<Record<string, any>>>
) {
  setExpandedBusinessDetails(prev => {
    const newState = { ...prev }
    delete newState[userId]
    return newState
  })
}

