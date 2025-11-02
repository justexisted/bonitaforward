import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

type AuthContextValue = {
  isAuthed: boolean
  loading: boolean
  name?: string
  email?: string
  userId?: string
  role?: 'business' | 'community'
  profileState: { name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (email: string, password: string, name?: string, role?: 'business' | 'community') => Promise<{ error?: string; session: any }>
  resetPassword: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue>({
  isAuthed: false,
  loading: true,
  name: undefined,
  email: undefined,
  userId: undefined,
  role: undefined,
  profileState: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: undefined }),
  signUpWithEmail: async () => ({ error: undefined, session: null }),
  resetPassword: async () => ({ error: undefined }),
  signOut: async () => {},
})

// ============================================================================
// AUTH UTILITY FUNCTIONS
// ============================================================================

/**
 * Save current URL to localStorage for redirect after authentication
 */
function saveReturnUrl(): void {
  try {
    const url = window.location.pathname + window.location.search + window.location.hash
    localStorage.setItem('bf-return-url', url)
  } catch (e) {
    console.warn('Failed to save return URL:', e)
  }
}

/**
 * Fetch user profile (name and role) from database
 */
async function fetchUserProfile(userId: string): Promise<{ name?: string; role?: 'business' | 'community' }> {
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', userId)
      .maybeSingle()
    
    if (prof) {
      const dbRole = String((prof as any)?.role || '').toLowerCase()
      return {
        name: (prof as any)?.name || undefined,
        role: (dbRole === 'business' || dbRole === 'community') ? dbRole as 'business' | 'community' : undefined
      }
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
  }
  return {}
}

/**
 * Fetch user role from database (legacy - use fetchUserProfile instead)
 */
async function fetchUserRole(userId: string): Promise<'business' | 'community' | undefined> {
  const profile = await fetchUserProfile(userId)
  return profile.role
}

/**
 * Clear auth-related state and localStorage
 */
function clearLocalAuthData(): void {
  try {
    localStorage.removeItem('bf-auth')
    localStorage.removeItem('bf-return-url')
  } catch (e) {
    console.warn('Error clearing localStorage:', e)
  }
}

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)
  const [loading, setLoading] = useState(true)
  
  // CRITICAL FIX: Use a ref to track profile state for immediate access
  // This prevents the race condition where profile state isn't immediately available in context
  const profileRef = useRef<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)

  useEffect(() => {
    let mounted = true

    // Helper: ensure a profile row exists with role/name
    // CRITICAL FIX: Use separate INSERT/UPDATE instead of upsert to avoid RLS 403 errors
    async function ensureProfile(userId?: string | null, email?: string | null, name?: string | null, metadataRole?: any) {
      if (!userId || !email) return
      try {
        let role: 'business' | 'community' | undefined
        let residentVerification: {
          is_bonita_resident?: boolean | null
          resident_verification_method?: string | null
          resident_zip_code?: string | null
          resident_verified_at?: string | null
        } = {}
        
        try {
          const raw = localStorage.getItem('bf-pending-profile')
          if (raw) {
            const pref = JSON.parse(raw) as {
              name?: string
              email?: string
              role?: 'business' | 'community'
              is_bonita_resident?: boolean
              resident_verification_method?: string
              resident_zip_code?: string | null
              resident_verified_at?: string | null
            }
            if (pref?.role === 'business' || pref?.role === 'community') role = pref.role
            // CRITICAL FIX: Always use name from localStorage during signup, even if name already exists
            // This ensures the name entered during signup is saved, not overwritten by empty/null values
            if (pref?.name && pref?.name.trim()) {
              name = pref.name.trim()
            }
            if (pref && (pref.email === email || !pref.email)) {
              // Extract resident verification data
              if (pref.is_bonita_resident !== undefined) {
                residentVerification = {
                  is_bonita_resident: pref.is_bonita_resident,
                  resident_verification_method: pref.resident_verification_method || null,
                  resident_zip_code: pref.resident_zip_code || null,
                  resident_verified_at: pref.resident_verified_at || null
                }
              }
              // keep until successfully saved
            }
          }
        } catch {}
        if (!role && (metadataRole === 'business' || metadataRole === 'community')) {
          role = metadataRole
        }
        
        // Check if profile already exists to avoid RLS issues with upsert
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        
        const updatePayload: any = {
          email,
          name: name || null,
          role: role || metadataRole || null,
          ...residentVerification
        }
        
        // Log resident verification data for debugging
        if (Object.keys(residentVerification).length > 0) {
          console.log('[Auth] Saving resident verification data:', residentVerification)
        }
        
        // Log name being saved for debugging
        if (name) {
          console.log('[Auth] Saving name to profile:', name)
        }
        
        if (existingProfile) {
          // Profile exists - use UPDATE
          // Don't use .select() immediately after update - it can fail due to RLS
          // Instead, verify with a separate query if needed
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId)
          
          if (updateError) {
            console.error('[Auth] Error updating profile:', updateError)
            console.error('[Auth] Update payload was:', updatePayload)
            return
          }
          
          // CRITICAL FIX: Refresh profile state after update so name is immediately available
          const profileData = await fetchUserProfile(userId)
          if (profileData.name) {
            if (mounted) {
              setProfile(prev => ({ ...prev, name: profileData.name }))
              profileRef.current = { ...profileRef.current, name: profileData.name } as any
            }
          }
          
          // Verify update with a separate query (small delay for eventual consistency)
          setTimeout(async () => {
            const { data: verifyData } = await supabase
              .from('profiles')
              .select('is_bonita_resident, resident_verification_method, resident_zip_code')
              .eq('id', userId)
              .maybeSingle()
            
            if (verifyData) {
              console.log('[Auth] Profile update verified:', verifyData)
            } else {
              console.warn('[Auth] Profile update verification returned no data')
            }
          }, 500)
        } else {
          // Profile doesn't exist - use INSERT
          const insertPayload: any = {
            id: userId,
            ...updatePayload
          }
          
          // Don't use .select() immediately after insert - it can fail due to RLS
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(insertPayload)
          
          if (insertError) {
            console.error('[Auth] Error creating profile:', insertError)
            console.error('[Auth] Insert payload was:', insertPayload)
            return
          }
          
          // CRITICAL FIX: Refresh profile state after insert so name is immediately available
          const profileData = await fetchUserProfile(userId)
          if (profileData.name) {
            if (mounted) {
              setProfile(prev => ({ ...prev, name: profileData.name }))
              profileRef.current = { ...profileRef.current, name: profileData.name } as any
            }
          }
          
          // Verify insert with a separate query (small delay for eventual consistency)
          setTimeout(async () => {
            const { data: verifyData } = await supabase
              .from('profiles')
              .select('is_bonita_resident, resident_verification_method, resident_zip_code')
              .eq('id', userId)
              .maybeSingle()
            
            if (verifyData) {
              console.log('[Auth] Profile creation verified:', verifyData)
            } else {
              console.warn('[Auth] Profile creation verification returned no data')
            }
          }, 500)
        }
        
        // Clear pending profile data after successful save
        try { localStorage.removeItem('bf-pending-profile') } catch {}
      } catch (error) {
        console.error('Error ensuring profile:', error)
      }
    }

    /**
     * CRITICAL FIX: Auth initialization
     * 
     * Issue: User was seeing "SIGNED_IN" events even when not actively signing in.
     * This happened because a previous session was persisting in localStorage.
     * 
     * Fix: Better session handling and clear logging to understand auth state.
     */
    const initializeAuth = async () => {
      try {
        // console.log('[Auth] Initializing auth state...')
        
        // CRITICAL FIX: Don't initialize if user is already signed in
        // This prevents initialization from overriding a successful sign-in
        // NOTE: On refresh, profile state resets to null, so this check won't work
        // We need to rely on the session check below instead
        if (profile?.email) {
          // console.log('[Auth] User already signed in, skipping initialization')
          setLoading(false)
          initializationComplete = true
          return
        }
        
        // Get initial session from localStorage/cookies
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth] Error getting session:', error)
          if (mounted) {
            setLoading(false)
            initializationComplete = true
          }
          return
        }

        // console.log('[Auth] Initial session check:', { 
        //   hasSession: !!session, 
        //   email: session?.user?.email,
        //   userId: session?.user?.id
        // })
        
        // CRITICAL FIX: If no session exists, mark initialization as complete immediately
        // This prevents the auth state change handler from interfering
        if (!session?.user) {
          // console.log('[Auth] No session found during initialization')
          if (mounted) {
            setLoading(false)
            initializationComplete = true
          }
          return
        }

        /**
         * CRITICAL FIX: React state not updating despite valid session
         * 
         * Issue: localStorage has valid session but React UI shows signed out.
         * Root cause: The profile state is being set but something immediately clears it.
         * 
         * Fix: Add immediate state logging and ensure profile is set synchronously.
         */
        if (session?.user && mounted) {
          const email = session.user.email
          const userId = session.user.id
          
          // Fetch fresh profile data from database (not stale session metadata)
          let name: string | undefined
          let role: 'business' | 'community' | undefined

          // console.log('[Auth] Processing existing session for:', email, 'userId:', userId)
          
          // CRITICAL FIX: Don't override profile if user is already signed in
          // This prevents initialization from clearing a successful sign-in
          if (profile?.email === email) {
            // console.log('[Auth] User already signed in, skipping initialization profile setting')
            setLoading(false)
            initializationComplete = true
            return
          }

          /**
           * CRITICAL FIX: Fetch name and role from database, not session metadata
           * 
           * Issue: session.user.user_metadata contains stale data from sign-up
           * and doesn't update when profiles table is updated.
           * 
           * Fix: Always fetch current name and role from profiles table.
           */
          if (userId) {
            const profileData = await fetchUserProfile(userId)
            name = profileData.name
            role = profileData.role
            // console.log('[Auth] Profile fetched from database:', { name, role })
          }

          // console.log('[Auth] About to set profile state:', { name, email, userId, role })
          
          // CRITICAL FIX: Set profile state and immediately verify it was set
          const newProfile = { name, email, userId, role }
          setProfile(newProfile)
          profileRef.current = newProfile
          
          // console.log('[Auth] Profile state set, current auth context will be:', {
          //   isAuthed: Boolean(email),
          //   name,
          //   email,
          //   userId,
          //   role
          // })

          // Ensure profile exists in database with proper role
          if (userId && email) {
            await ensureProfile(userId, email, name, role)
          }
        } else {
          // console.log('[Auth] No session found during initialization')
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error)
      } finally {
        if (mounted) {
          // console.log('[Auth] Auth initialization complete, setting loading to false')
          // console.log('[Auth] Final profile state before loading=false:', profile)
          setLoading(false)
          
          // CRITICAL: Mark initialization as complete AFTER setting loading to false
          initializationComplete = true
          // console.log('[Auth] Initialization complete, auth events will now be processed')
        }
      }
    }

    /**
     * CRITICAL FIX: Race condition between initialization and auth events
     * 
     * Issue: onAuthStateChange fires during initialization, causing conflicts.
     * 
     * Root cause: Both initializeAuth and onAuthStateChange try to set profile
     * simultaneously, causing the profile to be set then immediately cleared.
     * 
     * Fix: Use a flag to prevent onAuthStateChange from interfering during initialization.
     */
    let initializationComplete = false
    
    // Set up auth listener first, but make it wait for initialization
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // console.log('[Auth] State change event:', event, 'email:', session?.user?.email, 'initComplete:', initializationComplete)
      
      // CRITICAL FIX: During initialization, ignore ALL auth events to prevent race conditions
      // The initializeAuth function handles the initial session, and onAuthStateChange
      // should only process events AFTER initialization is complete
      if (!initializationComplete) {
        // console.log('[Auth] Ignoring auth event during initialization:', event, 'session exists:', !!session)
        return
      }

      // CRITICAL FIX: Only process SIGNED_IN if we haven't already processed it during initialization
      // AND if the user is not already signed in (prevents duplicate processing)
      if (event === 'SIGNED_IN' && session?.user && initializationComplete) {
        const email = session.user.email
        const userId = session.user.id
        
        // Fetch fresh profile data from database (not stale session metadata)
        let name: string | undefined
        let role: 'business' | 'community' | undefined

        // CRITICAL FIX: Don't process SIGNED_IN if user is already signed in with same email
        // This prevents the auth state reset when switching tabs
        if (profileRef.current?.email === email) {
          // console.log('[Auth] User already signed in with same email, ignoring SIGNED_IN event')
          return
        }

        // console.log('User signed in:', { email, userId })

        /**
         * CRITICAL: Async Operation Order Matters!
         * 
         * During signup, we must save the name BEFORE trying to read it.
         * 
         * CORRECT Order (prevents "Hi, User"):
         * 1. Read from localStorage (bf-pending-profile) - get name from signup form
         * 2. Save to database (ensureProfile) - INSERT/UPDATE profiles table with name
         * 3. Read from database (fetchUserProfile) - SELECT from profiles table
         * 4. Update auth state with name
         * 
         * WRONG Order (causes "Hi, User"):
         * 1. Read from database (name is empty/null) ❌
         * 2. Save to database (name saved too late) ❌
         * 
         * Why: We can't read data we haven't written yet!
         * 
         * See: docs/prevention/ASYNC_FLOW_PREVENTION.md
         */
        if (userId && email) {
          // Step 1: Read from localStorage (signup flow)
          // This contains the name entered during signup
          try {
            const raw = localStorage.getItem('bf-pending-profile')
            if (raw) {
              const pref = JSON.parse(raw) as {
                name?: string
                role?: 'business' | 'community'
              }
              // Use name from localStorage if available (signup flow)
              if (pref?.name && pref.name.trim()) {
                name = pref.name.trim()
              }
              if (pref?.role === 'business' || pref?.role === 'community') {
                role = pref.role
              }
            }
          } catch {}
          
          // Step 2: Save to database FIRST (with name from localStorage)
          // This ensures the name is in the database before we try to read it
          await ensureProfile(userId, email, name, role)
          
          // Step 3: THEN read from database (now it has the name)
          // This reads the name we just saved
          const profileData = await fetchUserProfile(userId)
          // Use database name if it exists, otherwise keep localStorage name
          name = profileData.name || name
          role = profileData.role || role
          // console.log('Profile fetched from database on sign in:', { name, role })
        }

        // console.log('[Auth] Setting profile state:', { name, email, userId, role })
        const newProfile = { name, email, userId, role }
        setProfile(newProfile)
        profileRef.current = newProfile
        
        // CRITICAL FIX: Set loading to false after setting profile
        // This ensures isAuthed becomes true and user gets redirected
        // console.log('[Auth] Setting loading to false after successful sign-in')
        setLoading(false)
        
        // console.log('[Auth] Sign-in process complete, user should now be authenticated')
      } else if (event === 'SIGNED_OUT' || !session) {
        // console.log('[Auth] SIGNED_OUT event or no session - checking if this is a false positive')
        
        // CRITICAL FIX: Double-check session before clearing profile
        // Sometimes Supabase fires SIGNED_OUT during refresh even with valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (currentSession?.user?.email) {
          // console.log('[Auth] False SIGNED_OUT detected - session still exists, maintaining profile')
          // Don't clear profile if session actually exists
          return
        }
        
        // console.log('[Auth] Confirmed SIGNED_OUT - clearing profile')
        setProfile(null)
        profileRef.current = null
        // Clear any remaining auth data
        clearLocalAuthData()
        // console.log('[Auth] Cleared custom app data, Supabase will handle its own session cleanup')
      } else if (event === 'TOKEN_REFRESHED') {
        // console.log('[Auth] TOKEN_REFRESHED event, session exists:', !!session)
        // Only update if we have a valid session
        if (session?.user?.email) {
          // console.log('[Auth] Token refreshed with valid session, maintaining profile')
          const newProfile = profile ? { ...profile } : null
          setProfile(newProfile)
          profileRef.current = newProfile
        } else {
          // console.log('[Auth] Token refresh but no session - this should not happen, clearing profile')
          setProfile(null)
          profileRef.current = null
        }
      } else {
        // console.log('[Auth] Unhandled auth event:', event, 'session exists:', !!session)
      }
    })

    // Start initialization process
    // CRITICAL FIX: Await initialization to ensure it completes before auth events are processed
    // This prevents race conditions where auth events interfere with initialization
    initializeAuth().then(() => {
      // console.log('[Auth] Initialization completed, auth events can now be processed')
    }).catch((error) => {
      console.error('[Auth] Initialization failed:', error)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Removed legacy local sign-in helper

  const signInWithGoogle = async () => {
    // Save the current location for redirect after OAuth
    saveReturnUrl()

    // Use current origin for redirect to avoid SSL issues
    const redirectTo = `${window.location.origin}/onboarding`
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo
      }
    })
  }

  const signOut = async () => {
    try {
      // console.log('Signing out user...')
      
      // Force clear profile state immediately
      setProfile(null)
      profileRef.current = null
      
      // CRITICAL FIX: Don't manually clear Supabase tokens - let Supabase handle its own session management
      // Manual clearing interferes with Supabase's built-in session persistence and causes auth issues
      // Only clear our custom app data, not Supabase's internal session management
      clearLocalAuthData()
      // console.log('[Auth] Cleared custom app data, leaving Supabase session management intact')

      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Sign out error:', error)
      } else {
        // console.log('Sign out successful')
      }

      // Force page reload to ensure clean state
      window.location.href = '/signin'
      
    } catch (err) {
      console.error('Sign out exception:', err)
      // Force clear state even if signOut fails
      setProfile(null)
      profileRef.current = null
      window.location.href = '/signin'
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }

  /**
   * CRITICAL DEBUG: Sign-up function with extensive logging
   * 
   * This function calls Supabase auth.signUp and returns the result.
   * Adding logging to see exactly what Supabase returns in different scenarios.
   * 
   * Supabase behavior depends on email confirmation settings:
   * - Confirmation disabled: Returns session immediately
   * - Confirmation enabled: Returns no session, user must confirm email
   * - User exists: Returns error without creating duplicate
   */
  const signUpWithEmail = async (email: string, password: string, name?: string, role?: 'business' | 'community') => {
    // console.log('[Auth] ========================================')
    // console.log('[Auth] signUpWithEmail called:', { 
    //   email, 
    //   hasPassword: !!password, 
    //   passwordLength: password?.length,
    //   name, 
    //   role 
    // })
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { 
        data: { name, role } 
      } 
    })
    
    // console.log('[Auth] Supabase signUp() raw response:')
    // console.log('[Auth]   Error:', error)
    // console.log('[Auth]   Error message:', error?.message)
    // console.log('[Auth]   Error code:', (error as any)?.code)
    // console.log('[Auth]   Error status:', (error as any)?.status)
    // console.log('[Auth]   Has session:', !!data?.session)
    // console.log('[Auth]   Has user:', !!data?.user)
    // console.log('[Auth]   User ID:', data?.user?.id)
    // console.log('[Auth]   User email:', data?.user?.email)
    // console.log('[Auth]   Email confirmed:', data?.user?.email_confirmed_at ? 'YES' : 'NO')
    // console.log('[Auth] ========================================')
    
    return { error: error?.message, session: data?.session ?? null }
  }

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error?.message }
  }

  /**
   * CRITICAL DEBUG: Auth context value creation
   * 
   * This is where the auth state gets exposed to the rest of the app.
   * Adding logging to see if profile state is being set but not reflected in UI.
   */
  // CRITICAL FIX: Use ref for immediate access to profile data
  // This prevents the race condition where profile state isn't immediately available
  const currentProfile = profileRef.current || profile

  const value: AuthContextValue = {
    isAuthed: Boolean(currentProfile?.email),
    loading,
    name: currentProfile?.name,
    email: currentProfile?.email,
    userId: currentProfile?.userId,
    role: currentProfile?.role,
    profileState: currentProfile,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
  }

  // Debug log the auth context value whenever it changes
  // console.log('[Auth] Context value updated:', {
  //   isAuthed: value.isAuthed,
  //   loading: value.loading,
  //   email: value.email,
  //   role: value.role,
  //   profileState: profile
  // })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================================
// AUTH HOOK
// ============================================================================

export function useAuth() {
  return useContext(AuthContext)
}

// ============================================================================
// EXPORTS
// ============================================================================

export { saveReturnUrl, clearLocalAuthData, fetchUserRole }
export type { AuthContextValue }
