import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { updateUserProfile, getNameFromMultipleSources } from '../utils/profileUtils'

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
  emailVerified: boolean // Whether user's email is verified
  profileState: { name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (email: string, password: string, name?: string, role?: 'business' | 'community') => Promise<{ error?: string; session: any; user?: any }>
  resetPassword: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resendVerificationEmail: () => Promise<{ error?: string }>
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
  emailVerified: false,
  profileState: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: undefined }),
  signUpWithEmail: async () => ({ error: undefined, session: null }),
  resetPassword: async () => ({ error: undefined }),
  signOut: async () => {},
  resendVerificationEmail: async () => ({ error: undefined }),
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
async function fetchUserProfile(userId: string): Promise<{ name?: string; role?: 'business' | 'community'; emailConfirmed?: boolean }> {
  try {
    // Try to select email_confirmed_at, but handle gracefully if column doesn't exist yet
    // This allows the app to work before SQL migrations are run
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('name, role, email_confirmed_at')
      .eq('id', userId)
      .maybeSingle()
    
    if (error) {
      // If error is about missing column (400 Bad Request with column name in message, or PGRST116)
      // Try again without email_confirmed_at column
      if (error.code === 'PGRST116' || error.message?.includes('email_confirmed_at') || error.message?.includes('column') || error.message?.includes('does not exist')) {
        if (import.meta.env.DEV) {
          console.warn('[Auth] email_confirmed_at column not found, using basic query. Run SQL migration: ops/sql/add-email-confirmed-at-to-profiles.sql')
        }
        
        const { data: profBasic, error: basicError } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', userId)
          .maybeSingle()
        
        if (basicError) {
          if (import.meta.env.DEV) {
            console.warn('[Auth] Error fetching profile:', basicError.message)
          }
          return {}
        }
        
        if (profBasic) {
          const dbRole = String((profBasic as any)?.role || '').toLowerCase()
          return {
            name: (profBasic as any)?.name || undefined,
            role: (dbRole === 'business' || dbRole === 'community') ? dbRole as 'business' | 'community' : undefined,
            emailConfirmed: false // Column doesn't exist yet, default to false
          }
        }
      } else {
        // For other errors, log and continue
        if (import.meta.env.DEV) {
          console.warn('[Auth] Error fetching profile:', error.message)
        }
      }
      return {}
    }
    
    if (prof) {
      const dbRole = String((prof as any)?.role || '').toLowerCase()
      return {
        name: (prof as any)?.name || undefined,
        role: (dbRole === 'business' || dbRole === 'community') ? dbRole as 'business' | 'community' : undefined,
        emailConfirmed: Boolean((prof as any)?.email_confirmed_at) // Will be undefined/false if column doesn't exist
      }
    }
  } catch (error: any) {
    // Handle any unexpected errors gracefully
    if (import.meta.env.DEV) {
      console.warn('[Auth] Error fetching user profile:', error?.message || error)
    }
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

/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - localStorage ('bf-pending-profile'): Stores signup data (name, role, resident verification)
 *   → CRITICAL: Must read from localStorage during signup before saving to database
 * - Supabase auth: Provides user sessions and auth events
 *   → CRITICAL: Session state changes trigger profile updates
 * - profiles table: Stores user profile data (name, role, resident verification)
 *   → CRITICAL: Must save name BEFORE reading it during signup (async order matters)
 * - profileUtils (updateUserProfile, getNameFromMultipleSources): Centralized profile update utility
 *   → CRITICAL: ensureProfile() now uses updateUserProfile() to ensure ALL fields are saved
 *   → CRITICAL: Must be called FIRST during signup, THEN fetch profile
 * 
 * WHAT DEPENDS ON THIS:
 * - Admin.tsx: Uses auth.name for display ("Hi, {name}")
 * - Account.tsx: Uses auth.name for account settings
 * - useAdminDataLoader: Uses auth.email to load admin data
 * - ResidentVerificationSection: Uses profiles from admin data (depends on auth flow)
 * - All pages: Use auth.isAuthed, auth.email, auth.userId
 * 
 * BREAKING CHANGES:
 * - If you change profileUtils.updateUserProfile() API → Profile updates fail
 * - If you change ensureProfile() order → name won't display after signup
 * - If you change localStorage key → signup data won't be found
 * - If you change auth state structure → ALL consumers break
 * - If you change async order → name/profile won't be available immediately
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Check all files that use auth.name, auth.email, auth.userId
 * 2. Verify async operation order (save → read)
 * 3. Test signup flow end-to-end
 * 4. Test admin page still loads profiles
 * 5. Test resident verification still works
 * 
 * RELATED FILES:
 * - src/pages/SignIn.tsx: Saves data to localStorage during signup
 * - src/utils/profileUtils.ts: Provides updateUserProfile() and getNameFromMultipleSources()
 * - src/hooks/useAdminDataLoader.ts: Depends on auth.email for loading admin data
 * - src/pages/Admin.tsx: Displays auth.name in greeting
 * - src/components/admin/sections/ResidentVerificationSection.tsx: Depends on profiles from admin data
 * 
 * RECENT BREAKS:
 * - Name display after signup (2025-01-XX): Fixed async order (save before read)
 * - Resident verification empty: Was affected by auth flow changes
 * - Missing fields in profile updates (2025-01-XX): Refactored to use updateUserProfile() from profileUtils
 *   → Fix: ensureProfile() now uses updateUserProfile() to ensure ALL fields are included
 *   → Lesson: Use centralized profile update utilities to prevent missing fields
 * 
 * See: docs/prevention/ASYNC_FLOW_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailVerified, setEmailVerified] = useState(false) // Track email verification status
  
  // CRITICAL FIX: Use a ref to track profile state for immediate access
  // This prevents the race condition where profile state isn't immediately available in context
  const profileRef = useRef<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)

  useEffect(() => {
    let mounted = true

    // Helper: ensure a profile row exists with role/name
    // CRITICAL FIX: Use separate INSERT/UPDATE instead of upsert to avoid RLS 403 errors
    /**
     * REFACTORED: Uses updateUserProfile() from profileUtils to ensure ALL fields are saved
     * 
     * This function now uses the centralized profile update utility which:
     * - Ensures ALL fields are included (name, email, role, resident verification)
     * - Validates data before saving
     * - Handles INSERT vs UPDATE automatically
     * - Prevents missing fields during profile updates
     * 
     * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
     */
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
              email_notifications_enabled?: boolean
              marketing_emails_enabled?: boolean
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
        
        // CRITICAL: Get name from multiple sources if not provided
        // This ensures we have a name during signup even if not in localStorage
        if (!name && email) {
          // Try to get name from localStorage or auth metadata
          // We don't have authUser here, so we'll use getNameFromMultipleSources with just email
          try {
            const nameFromStorage = await getNameFromMultipleSources(email)
            if (nameFromStorage) {
              name = nameFromStorage
            }
          } catch {
            // Name retrieval failed, continue with null name
          }
        }
        
        // CRITICAL: Preserve existing name from database if no name is provided
        // This prevents clearing the name during login/auth refresh when name isn't in localStorage
        // Only fetch existing profile if we don't have a name to save (not during signup)
        if (!name) {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', userId)
              .maybeSingle()
            
            if (existingProfile?.name) {
              // Use existing name from database to preserve it
              name = existingProfile.name
            }
          } catch {
            // If fetch fails, continue without name (won't clear it, just won't set it)
          }
        }
        
        // Use centralized updateUserProfile utility to ensure ALL fields are saved
        // This prevents missing fields like name or resident verification from being omitted
        // CRITICAL: updateUserProfile() automatically handles immutable fields like role
        // (it checks if role is already set and excludes it from update if immutable)
        // CRITICAL: Only include name in payload if we have one - if name is null/undefined,
        // updateUserProfile will preserve existing name (won't clear it) for UPDATE operations
        // Read email preferences from localStorage (bf-pending-profile) if available
        let emailPreferences: {
          email_notifications_enabled?: boolean
          marketing_emails_enabled?: boolean
        } = {}
        
        try {
          const raw = localStorage.getItem('bf-pending-profile')
          if (raw) {
            const pref = JSON.parse(raw) as {
              email_notifications_enabled?: boolean
              marketing_emails_enabled?: boolean
            }
            if (pref.email_notifications_enabled !== undefined) {
              emailPreferences.email_notifications_enabled = pref.email_notifications_enabled
            }
            if (pref.marketing_emails_enabled !== undefined) {
              emailPreferences.marketing_emails_enabled = pref.marketing_emails_enabled
            }
          }
        } catch {
          // localStorage access failed, continue without email preferences
        }
        
        const updatePayload: any = {
          email,
          role: role || metadataRole || null,
          ...residentVerification,
          ...emailPreferences
        }
        
        // CRITICAL: Always include name in payload during signup (when it comes from localStorage)
        // Only skip name if it's explicitly null/undefined AND we're NOT in signup flow
        // During signup, we MUST save the name even if it seems empty to ensure it's persisted
        const isSignupFlow = !!localStorage.getItem('bf-pending-profile')
        
        if (name) {
          // We have a name - include it
          updatePayload.name = name
          if (import.meta.env.DEV) {
            console.log('[Auth] ensureProfile: Including name in payload:', name)
          }
        } else if (isSignupFlow && import.meta.env.DEV) {
          // During signup but no name - this is a problem!
          console.warn('[Auth] ensureProfile: Signup flow detected but NO NAME found! localStorage:', localStorage.getItem('bf-pending-profile'))
        }
        
        if (import.meta.env.DEV) {
          console.log('[Auth] ensureProfile: Calling updateUserProfile with payload:', {
            email: updatePayload.email,
            name: updatePayload.name || 'NOT INCLUDED',
            role: updatePayload.role,
            hasEmailPrefs: !!updatePayload.email_notifications_enabled || !!updatePayload.marketing_emails_enabled
          })
        }
        
        const result = await updateUserProfile(
          userId,
          updatePayload,
          'auth-context'
        )
        
        if (import.meta.env.DEV) {
          console.log('[Auth] ensureProfile: updateUserProfile result:', result)
        }
        
        // If email preferences were set during signup, also set email_consent_date
        // This tracks when user consented to receive emails
        if ((emailPreferences.email_notifications_enabled === true || emailPreferences.marketing_emails_enabled === true) && result.success) {
          try {
            const { error: consentError } = await supabase
              .from('profiles')
              .update({ email_consent_date: new Date().toISOString() })
              .eq('id', userId)
            
            if (consentError) {
              console.warn('[Auth] Failed to set email_consent_date:', consentError)
              // Don't fail the flow, but log warning
            }
          } catch (err) {
            console.warn('[Auth] Exception setting email_consent_date:', err)
          }
        }
        
        if (!result.success) {
          console.error('[Auth] Error updating profile:', result.error)
          console.error('[Auth] Profile data was:', { email, name, role, residentVerification })
          return
        }
        
        // Log resident verification data for debugging
        if (Object.keys(residentVerification).length > 0) {
          console.log('[Auth] Saving resident verification data:', residentVerification)
        }
        
        // Log name being saved for debugging
        if (name) {
          console.log('[Auth] Saving name to profile:', name)
        }
        
        // CRITICAL FIX: Refresh profile state after update so name is immediately available
        const profileData = await fetchUserProfile(userId)
        if (profileData.name) {
          if (mounted) {
            setProfile(prev => ({ ...prev, name: profileData.name }))
            profileRef.current = { ...profileRef.current, name: profileData.name } as any
          }
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
            setEmailVerified(false)
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
            setEmailVerified(false)
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
          let emailConfirmed = false

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
           * CRITICAL FIX: Fetch name, role, and email verification status from database
           * 
           * Issue: session.user.user_metadata contains stale data from sign-up
           * and doesn't update when profiles table is updated.
           * 
           * Fix: Always fetch current name, role, and email_confirmed_at from profiles table.
           * Use custom email_confirmed_at from profiles table instead of Supabase's built-in system.
           */
          if (userId) {
            const profileData = await fetchUserProfile(userId)
            name = profileData.name
            role = profileData.role
            emailConfirmed = profileData.emailConfirmed ?? false
            // console.log('[Auth] Profile fetched from database:', { name, role, emailConfirmed })
          }
          
          // Check custom email verification status from profiles table
          if (mounted) {
            setEmailVerified(emailConfirmed)
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
          //   role,
          //   emailVerified: verified
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
        let emailConfirmed = false

        // CRITICAL FIX: Don't process SIGNED_IN if user is already signed in with same email
        // This prevents the auth state reset when switching tabs
        if (profileRef.current?.email === email) {
          // console.log('[Auth] User already signed in with same email, ignoring SIGNED_IN event')
          return
        }

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
          // Step 1: Read from localStorage (signup flow) FIRST
          // This contains the name entered during signup
          try {
            const raw = localStorage.getItem('bf-pending-profile')
            if (raw) {
              const pref = JSON.parse(raw) as {
                name?: string
                role?: 'business' | 'community'
              }
              // CRITICAL: Use name from localStorage if available (signup flow)
              // This MUST happen BEFORE ensureProfile so the name is saved
              if (pref?.name && pref.name.trim()) {
                name = pref.name.trim()
                if (import.meta.env.DEV) {
                  console.log('[Auth] Found name in localStorage during SIGNED_IN:', name)
                }
              }
              if (pref?.role === 'business' || pref?.role === 'community') {
                role = pref.role
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn('[Auth] Error reading localStorage during SIGNED_IN:', err)
            }
          }
          
          // Step 2: Save to database FIRST (with name from localStorage)
          // This ensures the name is in the database before we try to read it
          if (import.meta.env.DEV) {
            console.log('[Auth] Calling ensureProfile with name:', name || 'NO NAME')
          }
          await ensureProfile(userId, email, name, role)
          
          // Step 3: THEN read from database (now it has the name)
          // This reads the name we just saved
          const profileData = await fetchUserProfile(userId)
          // Use database name if it exists, otherwise keep localStorage name
          name = profileData.name || name || undefined
          role = profileData.role || role
          emailConfirmed = profileData.emailConfirmed ?? false
          
          if (import.meta.env.DEV) {
            console.log('[Auth] Profile fetched from database after ensureProfile:', { 
              name: name || 'NO NAME', 
              role, 
              emailConfirmed,
              fromDatabase: !!profileData.name,
              fromLocalStorage: !profileData.name && !!name
            })
          }
        } else if (userId) {
          // No email - still fetch verification status
          const profileData = await fetchUserProfile(userId)
          emailConfirmed = profileData.emailConfirmed ?? false
        }
        
        // Check custom email verification status from profiles table
        if (mounted) {
          setEmailVerified(emailConfirmed)
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
          // Fetch custom email verification status from profiles table
          if (currentSession.user.id) {
            const profileData = await fetchUserProfile(currentSession.user.id)
            const emailConfirmed = profileData.emailConfirmed ?? false
            if (mounted) {
              setEmailVerified(emailConfirmed)
            }
          }
          // console.log('[Auth] False SIGNED_OUT detected - session still exists, maintaining profile')
          // Don't clear profile if session actually exists
          return
        }
        
        // console.log('[Auth] Confirmed SIGNED_OUT - clearing profile')
        setProfile(null)
        profileRef.current = null
        if (mounted) {
          setEmailVerified(false)
        }
        // Clear any remaining auth data
        clearLocalAuthData()
        // console.log('[Auth] Cleared custom app data, Supabase will handle its own session cleanup')
      } else if (event === 'TOKEN_REFRESHED') {
        // console.log('[Auth] TOKEN_REFRESHED event, session exists:', !!session)
        // Only update if we have a valid session
        if (session?.user?.email) {
          const email = session.user.email
          const userId = session.user.id
          
          // CRITICAL FIX: Fetch fresh profile data from database and use it
          // This ensures the name appears immediately after profile updates
          let name: string | undefined
          let role: 'business' | 'community' | undefined
          let emailConfirmed = false
          
          if (userId) {
            const profileData = await fetchUserProfile(userId)
            name = profileData.name
            role = profileData.role
            emailConfirmed = profileData.emailConfirmed ?? false
          }
          
          if (mounted) {
            setEmailVerified(emailConfirmed)
          }
          
          // CRITICAL FIX: Use fresh profile data instead of copying old profile
          // This ensures the name appears immediately after signup/profile updates
          const newProfile = { name, email, userId, role }
          setProfile(newProfile)
          profileRef.current = newProfile
        } else {
          // console.log('[Auth] Token refresh but no session - this should not happen, clearing profile')
          setProfile(null)
          profileRef.current = null
          if (mounted) {
            setEmailVerified(false)
          }
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
      // CRITICAL FIX: Remove scope='global' to avoid 403 errors
      // The global scope requires special permissions that may not be available
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Silently handle logout errors - user is already signed out locally
        // Don't spam console or break the flow
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
    
    // Return both session and user (user is available even without session)
    return { 
      error: error?.message, 
      session: data?.session ?? null,
      user: data?.user ?? null // Include user object for verification email
    }
  }

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error?.message }
  }

  /**
   * Resend verification email to the current user
   * Uses our custom Resend email system instead of Supabase's built-in confirmation
   */
  const resendVerificationEmail = async () => {
    if (!profile?.email || !profile?.userId) {
      return { error: 'No email address or user ID found. Please sign in first.' }
    }
    
    try {
      const response = await fetch('/.netlify/functions/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.userId,
          email: profile.email,
          name: profile.name,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        return { error: result.error || 'Failed to send verification email' }
      }
      
      return { error: undefined }
    } catch (err: any) {
      return { error: err.message || 'Failed to send verification email' }
    }
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
    emailVerified,
    profileState: currentProfile,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    resendVerificationEmail,
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
