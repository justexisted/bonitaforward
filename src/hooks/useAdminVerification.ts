/**
 * Admin Verification Hook
 * 
 * This hook provides secure admin verification with server-side validation
 * and client-side fallback. It was extracted from Admin.tsx to improve
 * code organization and reusability.
 * 
 * Features:
 * - Server-side verification via Netlify function
 * - Client-side fallback for offline/development
 * - Prevents race conditions during auth state changes
 * - Caches verification result to prevent unnecessary re-checks
 * - Extensive debug logging for troubleshooting
 * 
 * CRITICAL: This hook contains carefully crafted logic to prevent
 * sign-out bugs caused by race conditions during auth state transitions.
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContext {
  email: string | null | undefined
  loading: boolean
  isAuthed: boolean
  userId: string | null | undefined
}

interface AdminStatus {
  isAdmin: boolean
  loading: boolean
  verified: boolean
  error?: string
}

/**
 * USE ADMIN VERIFICATION
 * 
 * Verifies if the current user is an admin using server-side verification
 * with client-side fallback.
 * 
 * @param auth - Authentication context with email, loading state, etc.
 * @returns Object containing isAdmin status and verification details
 */
export function useAdminVerification(auth: AuthContext) {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    loading: true,
    verified: false
  })

  // CRITICAL FIX: Memoize adminList to prevent unnecessary recalculations
  // Without this, adminList gets a new reference on every render, causing isClientAdmin 
  // to recalculate and potentially trigger auth state changes that sign out the user
  const adminList = useMemo(() => {
    const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  }, []) // Empty deps - admin emails don't change during runtime

  const isClientAdmin = useMemo(
    () => !!auth.email && adminList.includes(auth.email.toLowerCase()),
    [auth.email, adminList]
  )

  /**
   * CRITICAL FIX: Admin verification race condition
   * 
   * Issue: Admin verification re-runs during auth state changes, causing isAdmin to flip from true to false.
   * 
   * Root cause: useEffect runs on every auth.email change, including during auth initialization.
   * During auth state transitions, auth.email might be temporarily undefined or the verification fails.
   * 
   * Fix: Only run verification once when auth is fully loaded, and cache the result.
   */
  useEffect(() => {
    async function verifyAdmin() {
      console.log('=== ADMIN VERIFICATION START ===')
      console.log('[Admin] Auth state:', {
        email: auth.email,
        loading: auth.loading,
        isAuthed: auth.isAuthed,
        userId: auth.userId
      })
      console.log('[Admin] Current adminStatus:', adminStatus)
      console.log('[Admin] isClientAdmin:', isClientAdmin)

      if (!auth.email) {
        console.log('[Admin] ❌ No email, setting admin status to false')
        setAdminStatus({ isAdmin: false, loading: false, verified: false })
        return
      }

      // CRITICAL: Don't re-verify if already verified for this email
      if (adminStatus.verified && adminStatus.isAdmin && auth.email) {
        console.log('[Admin] ✓ Already verified as admin, skipping re-verification')
        return
      }

      // CRITICAL: Don't verify during auth loading to prevent race conditions
      if (auth.loading) {
        console.log('[Admin] ⏳ Auth still loading, skipping verification')
        return
      }

      console.log('[Admin] 🔍 Starting admin verification for:', auth.email)
      setAdminStatus(prev => ({ ...prev, loading: true }))

      try {
        console.log('[Admin] Getting session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Admin] Session result:', {
          hasSession: !!session,
          hasToken: !!session?.access_token,
          sessionError: sessionError?.message
        })

        const token = session?.access_token

        if (!token) {
          console.log('[Admin] ⚠️ No auth token, using client-side admin check:', isClientAdmin)
          setAdminStatus({ isAdmin: isClientAdmin, loading: false, verified: false })
          return
        }

        // Use relative URL for Netlify functions (works in both dev and production)
        const url = '/.netlify/functions/admin-verify'
        console.log('[Admin] 📡 Making server verification request to:', url)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('[Admin] Server response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        })

        if (response.ok) {
          const result = await response.json()
          console.log('[Admin] ✅ Server verification SUCCESS:', result)
          setAdminStatus({
            isAdmin: result.isAdmin,
            loading: false,
            verified: true
          })
        } else {
          const errorText = await response.text()
          console.log('[Admin] ❌ Server verification FAILED:', {
            status: response.status,
            error: errorText
          })
          console.log('[Admin] Falling back to client-side check:', isClientAdmin)
          // Fallback to client-side check if server verification fails
          setAdminStatus({
            isAdmin: isClientAdmin,
            loading: false,
            verified: false,
            error: 'Server verification unavailable'
          })
        }
      } catch (err: any) {
        console.log('[Admin] ❌ Exception during verification:', err)
        console.log('[Admin] Error details:', {
          message: err?.message,
          stack: err?.stack
        })
        console.log('[Admin] Falling back to client-side check:', isClientAdmin)
        // Fallback to client-side check on error
        setAdminStatus({
          isAdmin: isClientAdmin,
          loading: false,
          verified: false,
          error: 'Server verification failed'
        })
      }
      console.log('=== ADMIN VERIFICATION END ===')
    }

    /**
     * CRITICAL FIX: Prevent re-verification during auth state changes
     * 
     * Issue: useEffect was running on every isClientAdmin change, which happens
     * during auth state updates, causing admin status to flip from true to false.
     * 
     * Root cause: isClientAdmin is a computed value that changes during auth updates,
     * triggering unnecessary re-verification that fails.
     * 
     * Fix: Only run verification when email changes AND auth is not loading.
     * Remove isClientAdmin from dependencies to prevent unnecessary re-runs.
     */

    // Only verify when email changes and auth is stable (not loading)
    if (!auth.loading) {
      verifyAdmin()
    }
  }, [auth.email, auth.loading]) // Removed isClientAdmin dependency

  // DEBUG: Log when isAdmin changes
  useEffect(() => {
    console.log('[Admin] 🔐 isAdmin changed to:', adminStatus.isAdmin, 'adminStatus:', adminStatus)
  }, [adminStatus.isAdmin, adminStatus])

  return {
    isAdmin: adminStatus.isAdmin,
    adminStatus,
    isClientAdmin
  }
}

