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

import { query, deleteRows } from '../lib/supabaseQuery'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../types/admin'

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

/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - admin-delete-user Netlify function: Handles actual deletion
 *   → CRITICAL: Response format must be { success: true, ok: true, ... }
 *   → CRITICAL: Accepts deleteBusinesses parameter (true = hard delete, false = soft delete)
 * - AuthContext: Provides session token for API call
 *   → CRITICAL: Must have valid session.access_token
 * - Supabase providers table: Queries businesses owned by user
 *   → CRITICAL: Must have RLS policy allowing admin to read providers
 *   → CRITICAL: Queries by owner_user_id to find businesses
 * - successResponse() utility: Standardized response format
 *   → CRITICAL: MUST include both success and ok fields
 * 
 * WHAT DEPENDS ON THIS:
 * - Admin.tsx: Calls deleteUser() when admin deletes user
 *   → CRITICAL: Passes userId, expects deleteBusinesses to be prompted automatically
 * - UsersSection: Calls deleteUser() from Admin.tsx
 * 
 * BREAKING CHANGES:
 * - If admin-delete-user response format changes → This function won't recognize success
 * - If admin-delete-user removes deleteBusinesses parameter → Businesses always soft-deleted
 * - If session token format changes → API call fails
 * - If providers table RLS changes → Can't check for businesses before deletion
 * - If you change function name → Admin.tsx breaks
 * - If you remove business check logic → Admin won't be prompted about businesses
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Check admin-delete-user response format first
 * 2. Verify successResponse() includes both success and ok
 * 3. Test response parsing handles both formats
 * 4. Test Admin UI still works
 * 5. Test business deletion prompt appears when user has businesses
 * 6. Test deleteBusinesses parameter is passed correctly to backend
 * 7. Verify providers table query works (RLS allows admin read access)
 * 
 * RELATED FILES:
 * - netlify/functions/admin-delete-user.ts: Backend endpoint (accepts deleteBusinesses)
 * - netlify/functions/utils/userDeletion.ts: Handles actual business deletion logic
 * - netlify/functions/utils/response.ts: Response format utility
 * - src/pages/Admin.tsx: Uses this function
 * 
 * RECENT BREAKS:
 * - API response format (2025-01-XX): Changed from { ok: true } to { success: true }
 *   → Fix: Check both result.success === true || result.ok === true
 * - Business deletion (2025-01-XX): Added deleteBusinesses parameter
 *   → Fix: Check for businesses before deletion, prompt admin, pass parameter to backend
 * 
 * See: docs/prevention/API_CONTRACT_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

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
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>,
  deleteBusinesses?: boolean // Optional: if not provided, will prompt admin
) {
  setMessage(null)
  setDeletingUserId(userId)
  try {
    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }
    
    // Check if user has businesses and prompt admin if deleteBusinesses not provided
    let shouldDeleteBusinesses = deleteBusinesses
    if (shouldDeleteBusinesses === undefined) {
      try {
        // Fetch businesses owned by this user
        const businessResult = await query('providers', { logPrefix: '[AdminUserUtils]' })
          .select('id, name')
          .eq('owner_user_id', userId)
          .execute()
        
        const businesses = businessResult.data
        const businessError = businessResult.error
        
        if (!businessError && businesses && Array.isArray(businesses) && businesses.length > 0) {
          const businessNames = businesses.map((b: any) => b.name || 'Unnamed Business').join(', ')
          const confirmMessage = 
            `This user has ${businesses.length} business(es) linked to their account:\n\n` +
            `${businessNames}\n\n` +
            `Would you like to DELETE these businesses permanently?\n\n` +
            `• Click "OK" to DELETE businesses permanently\n` +
            `• Click "Cancel" to keep businesses (they will be unlinked from the account and can be reconnected later)`
          
          shouldDeleteBusinesses = confirm(confirmMessage)
        }
      } catch (err) {
        console.warn('[Admin] Error checking for businesses:', err)
        // Continue with deletion even if we can't check businesses
      }
    }
    
    // Call Netlify function to delete user
    const url = '/.netlify/functions/admin-delete-user'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ 
        user_id: userId,
        deleteBusinesses: shouldDeleteBusinesses === true
      })
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
    
    // CRITICAL: Reload profiles from database to ensure deletion is reflected
    // This ensures the user list is updated even if page is refreshed
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (token) {
        const url = '/.netlify/functions/admin-list-profiles'
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (res.ok) {
          const result = await res.json()
          if (result.success === true || result.ok === true) {
            const updatedProfiles = result.profiles || []
            setProfiles(updatedProfiles)
            console.log('[Admin] Profiles reloaded after deletion:', updatedProfiles.length, 'profiles')
          }
        } else {
          console.warn('[Admin] Failed to reload profiles after deletion, using local update')
          // Fallback to local update if reload fails
          setProfiles((arr) => arr.filter((p) => p.id !== userId))
        }
      } else {
        // Fallback to local update if no session
        setProfiles((arr) => arr.filter((p) => p.id !== userId))
      }
    } catch (reloadErr) {
      console.warn('[Admin] Error reloading profiles after deletion:', reloadErr)
      // Fallback to local update if reload fails
      setProfiles((arr) => arr.filter((p) => p.id !== userId))
    }
    
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
    
    // Build success message based on what was deleted
    const deletedCounts = result.deletedCounts || {}
    const providersCount = deletedCounts.providers || 0
    
    let message = 'User deleted successfully'
    if (providersCount > 0) {
      if (shouldDeleteBusinesses === true) {
        message += ` - ${providersCount} business(es) permanently deleted`
      } else {
        message += ` - ${providersCount} business(es) unlinked (can be reconnected later)`
      }
    } else {
      message += ' - all associated data removed'
    }
    setMessage(message)
  } catch (err: any) {
    console.error('[Admin] Delete user error:', err)
    setError(err?.message || 'Failed to delete user')
  } finally {
    setDeletingUserId(null)
  }
}

/**
 * DELETE USER BY EMAIL ONLY
 * 
 * Deletes a user's data by email when they don't have a profile.
 * This removes their funnel responses, bookings, and booking events (email-keyed data).
 * Cannot delete auth user since there's no profile/user_id.
 * 
 * Note: booking_events table uses 'customer_email' column, not 'user_email'.
 */
export async function deleteUserByEmailOnly(
  email: string,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setDeletingCustomerEmail: (email: string | null) => void,
  setFunnels: React.Dispatch<React.SetStateAction<FunnelRow[]>>,
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>,
  setBookingEvents?: React.Dispatch<React.SetStateAction<any[]>>
) {
  setMessage(null)
  setError(null)
  setDeletingCustomerEmail(email)
  
  try {
    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    // Call Netlify function to delete email-keyed data
    // We'll create a new function for this or use an existing one
    // For now, delete directly via Supabase (requires RLS to allow admin)
    const normalizedEmail = email.toLowerCase().trim()
    
    // Delete funnel responses by email
    const funnelResult = await deleteRows(
      'funnel_responses',
      { user_email: normalizedEmail },
      { logPrefix: '[AdminUserUtils]' }
    )
    
    if (funnelResult.error) {
      console.warn('[Admin] Error deleting funnel responses:', funnelResult.error.message)
    }
    
    // Delete bookings by email
    const bookingResult = await deleteRows(
      'bookings',
      { user_email: normalizedEmail },
      { logPrefix: '[AdminUserUtils]' }
    )
    
    if (bookingResult.error) {
      console.warn('[Admin] Error deleting bookings:', bookingResult.error.message)
    }
    
    // Delete booking events by customer_email (booking_events table uses customer_email, not user_email)
    const bookingEventResult = await deleteRows(
      'booking_events',
      { customer_email: normalizedEmail },
      { logPrefix: '[AdminUserUtils]' }
    )
    
    if (bookingEventResult.error) {
      console.warn('[Admin] Error deleting booking events:', bookingEventResult.error.message)
    }
    
    // Update local state
    setFunnels((arr) => arr.filter((f) => {
      const funnelEmail = f.user_email?.toLowerCase().trim()
      return funnelEmail !== normalizedEmail
    }))
    setBookings((arr) => arr.filter((b) => {
      const bookingEmail = b.user_email?.toLowerCase().trim()
      return bookingEmail !== normalizedEmail
    }))
    // Update booking events state if setter is provided
    if (setBookingEvents) {
      setBookingEvents((arr: any[]) => arr.filter((be: any) => {
        const bookingEventEmail = be.customer_email?.toLowerCase().trim()
        return bookingEventEmail !== normalizedEmail
      }))
    }
    
    // Note: deleteRows doesn't return count, but deletion was attempted
    setMessage(`Deleted email-keyed data for ${email}. User had no profile, so only email-keyed data was removed.`)
    console.log(`[Admin] Deleted email-keyed data for email: ${email}`)
  } catch (err: any) {
    console.error('[Admin] Delete user by email error:', err)
    setError(err?.message || 'Failed to delete user data')
  } finally {
    setDeletingCustomerEmail(null)
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
    try {
      await deleteRows('funnel_responses', { user_email: email }, { logPrefix: '[AdminUserUtils]' })
    } catch {}
    try {
      await deleteRows('bookings', { user_email: email }, { logPrefix: '[AdminUserUtils]' })
    } catch {}
    
    // If an auth profile exists (and is not a business owner), delete the auth user as well
    try {
      const profResult = await query('profiles', { logPrefix: '[AdminUserUtils]' })
        .select('id,role')
        .eq('email', email)
        .limit(1)
        .maybeSingle()
        .execute()
      
      const pid = (profResult.data as any)?.id as string | undefined
      const role = (profResult.data as any)?.role as string | undefined
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

