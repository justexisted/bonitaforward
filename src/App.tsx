import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import ResetPasswordPage from './pages/ResetPassword'
import './index.css'
import { Home, ArrowRight, X, ArrowLeft, User, BookOpen } from 'lucide-react'
import CreateBusinessForm from './pages/CreateBusinessForm'
import SupabasePing from './components/SupabasePing'
import { supabase } from './lib/supabase'
import { fetchSheetRows, mapRowsToProviders, type SheetProvider } from './lib/sheets.ts'
import { fetchProvidersFromSupabase } from './lib/supabaseData.ts'
import SignInPage from './pages/SignIn'
import OnboardingPage from './pages/Onboarding'
import AccountPage from './pages/Account'
import { CommunityIndex, CommunityPost } from './pages/Community'
import AdminPage from './pages/Admin'
import OwnerPage from './pages/Owner'
import MyBusinessPage from './pages/MyBusiness'
import PricingPage from './pages/Pricing'
import JobsPage from './pages/Jobs'
import CalendarPage, { fetchCalendarEvents, type CalendarEvent } from './pages/Calendar'
import Calendar from './components/Calendar'
import NotFoundPage from './pages/NotFound'
import SplitText from './components/SplitText'
import GlareHover from './components/GlareHover'
import ScrollFloat from './components/ScrollFloat'
import GradientText from './components/GradientText'
import CountUp from './components/CountUp'
import ScrollStack, { ScrollStackItem } from './components/ScrollStack'
import CardNav, { type CardNavItem } from './components/CardNav'
import Prism from './components/Prism'
import Dock, { type DockItemData } from './components/Dock'

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services'

const categories: {
  key: CategoryKey
  name: string
  description: string
  icon: string
}[] = [
  {
    key: 'restaurants-cafes',
    name: 'Restaurants & Cafés',
    description: 'Local dining spots and trending food experiences around Bonita.',
    icon: '/images/categories/Utensils.png',
  },
  {
    key: 'home-services',
    name: 'Home Services',
    description: 'Landscaping, solar, cleaning, and remodeling by trusted local pros.',
    icon: '/images/categories/Home.png',
  },
  {
    key: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Chiropractors, gyms, salons, and med spas to keep Bonita thriving.',
    icon: '/images/categories/HeartPulse.png',
  },
  {
    key: 'real-estate',
    name: 'Real Estate',
    description: 'Agents, brokerages, and property managers helping Bonita residents move forward.',
    icon: '/images/categories/Building2.png',
  },
  {
    key: 'professional-services',
    name: 'Professional Services',
    description: 'Attorneys, accountants, and consultants serving the community.',
    icon: '/images/categories/Briefcase.png',
  },
]

// ============================================================================
// UTILITY FUNCTIONS - Extracted from duplicate code for maintainability
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
 * Safely get and parse JSON from localStorage with type safety
 */
function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item) as T
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e)
    return defaultValue
  }
}

/**
 * Get list of admin emails from environment variable
 */
function getAdminList(): string[] {
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
}

/**
 * Check if a user email is in the admin list
 */
function isUserAdmin(email: string | undefined): boolean {
  if (!email) return false
  const adminList = getAdminList()
  return adminList.includes(email.toLowerCase())
}

/**
 * Fetch user role from database
 */
async function fetchUserRole(userId: string): Promise<'business' | 'community' | undefined> {
  try {
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    const dbRole = String((prof as any)?.role || '').toLowerCase()
    if (dbRole === 'business' || dbRole === 'community') {
      return dbRole as 'business' | 'community'
    }
    return undefined
  } catch (error) {
    console.error('Error fetching user role:', error)
    return undefined
  }
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

/**
 * Get all providers across all categories
 */
function getAllProviders(providersByCategory: Record<CategoryKey, Provider[]>): Provider[] {
  const keys: CategoryKey[] = ['real-estate', 'home-services', 'health-wellness', 'restaurants-cafes', 'professional-services']
  return keys.flatMap((k) => providersByCategory[k] || [])
}

/**
 * Custom hook for listening to provider updates
 */
function useProviderUpdates(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    function onUpdate() { callback() }
    window.addEventListener('bf-providers-updated', onUpdate as EventListener)
    return () => window.removeEventListener('bf-providers-updated', onUpdate as EventListener)
  }, deps)
}

/**
 * Reusable loading spinner component
 */
function LoadingSpinner({ message = 'Loading...', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
      <p className="mt-4 text-neutral-600">{message}</p>
    </div>
  )
}

function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

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
  signUpWithEmail: (email: string, password: string, name?: string, role?: 'business' | 'community') => Promise<{ error?: string; session?: unknown | null }>
  resetPassword: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  isAuthed: false,
  loading: true,
  name: undefined,
  email: undefined,
  userId: undefined,
  role: undefined,
  profileState: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  resetPassword: async () => ({}),
  signOut: async () => {}
})

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)
  const [loading, setLoading] = useState(true)
  
  // CRITICAL FIX: Use a ref to track profile state for immediate access
  // This prevents the race condition where profile state isn't immediately available in context
  const profileRef = useRef<{ name?: string; email?: string; userId?: string; role?: 'business' | 'community' } | null>(null)

  useEffect(() => {
    let mounted = true

    // Helper: ensure a profile row exists with role/name
    async function ensureProfile(userId?: string | null, email?: string | null, name?: string | null, metadataRole?: any) {
      if (!userId || !email) return
      try {
        let role: 'business' | 'community' | undefined
        try {
          const raw = localStorage.getItem('bf-pending-profile')
          if (raw) {
            const pref = JSON.parse(raw) as { name?: string; email?: string; role?: 'business' | 'community' }
            if (pref?.role === 'business' || pref?.role === 'community') role = pref.role
            if (!name && pref?.name) name = pref.name
            if (pref && (pref.email === email || !pref.email)) {
              // keep until successfully saved
            }
          }
        } catch {}
        if (!role && (metadataRole === 'business' || metadataRole === 'community')) {
          role = metadataRole
        }
        const payload: any = { id: userId, email, name: name || null }
        if (role) payload.role = role
        await supabase.from('profiles').upsert([payload], { onConflict: 'id' })
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
          const meta = session.user.user_metadata || {}
      const name = meta?.name
          let role = meta?.role as 'business' | 'community' | undefined
          const userId = session.user.id

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
           * CRITICAL FIX: Proper role fetching and profile management
           * 
           * The issue is that role isn't being properly fetched and set,
           * causing auth state to be incomplete and triggering sign-outs.
           * 
           * Fix: Always fetch role from database and ensure profile is complete.
           */
          if (userId) {
            const fetchedRole = await fetchUserRole(userId)
            if (fetchedRole) {
              role = fetchedRole
              // console.log('[Auth] Role fetched from database:', role)
            } else {
              // console.log('[Auth] No valid role found in database')
            }
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
        const meta = session.user.user_metadata || {}
        const name = meta?.name
        let role = meta?.role as 'business' | 'community' | undefined
        const userId = session.user.id

        // CRITICAL FIX: Don't process SIGNED_IN if user is already signed in with same email
        // This prevents the auth state reset when switching tabs
        if (profileRef.current?.email === email) {
          // console.log('[Auth] User already signed in with same email, ignoring SIGNED_IN event')
          return
        }

        // console.log('User signed in:', { email, userId, metaRole: role })

        // CRITICAL FIX: Always fetch role from database for signed in users
        if (userId) {
          const fetchedRole = await fetchUserRole(userId)
          if (fetchedRole) {
            role = fetchedRole
            // console.log('Role fetched from database on sign in:', role)
          }
        }

        // console.log('[Auth] Setting profile state:', { name, email, userId, role })
        const newProfile = { name, email, userId, role }
        setProfile(newProfile)
        profileRef.current = newProfile
        
        // CRITICAL FIX: Set loading to false after setting profile
        // This ensures isAuthed becomes true and user gets redirected
        // console.log('[Auth] Setting loading to false after successful sign-in')
        setLoading(false)

        // Ensure profile exists in database
        if (userId && email) {
          await ensureProfile(userId, email, name, role)
        }
        
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

export function useAuth() {
  return useContext(AuthContext)
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: ('business' | 'community')[] }) {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Don't redirect while still loading
    if (auth.loading) return

    if (!auth.isAuthed) {
      navigate('/signin')
      return
    }

    if (!allowedRoles.includes(auth.role || 'community')) {
      navigate('/')
      return
    }
  }, [auth.isAuthed, auth.loading, auth.role, allowedRoles, navigate])

  // Show loading state while authentication is being determined
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    )
  }

  if (!auth.isAuthed || !allowedRoles.includes(auth.role || 'community')) {
    return null
  }

  return <>{children}</>
}

function Navbar() {
  const auth = useAuth()
  const isAdmin = isUserAdmin(auth.email)

  // Create navigation items based on user authentication and role
  const createNavItems = (): CardNavItem[] => {
    const baseItems: CardNavItem[] = [
      {
        label: "Discover",
        bgColor: "#0D0716",
        textColor: "#fff",
        links: [
          { label: "Home", href: "/", ariaLabel: "Home Page" },
          { label: "About", href: "/about", ariaLabel: "About Bonita Forward" },
          { label: "Community", href: "/community", ariaLabel: "Community Posts" },
          { label: "Calendar", href: "/calendar", ariaLabel: "Bonita Events Calendar" },
          { label: "Jobs", href: "/jobs", ariaLabel: "Job Listings" }
        ]
      },
      {
        label: "Business",
        bgColor: "#170D27",
        textColor: "#fff",
        links: [
          { label: "Have a Business?", href: "/business", ariaLabel: "Add Your Business" },
          ...(auth.isAuthed && auth.role === 'business' ? 
            [
              { label: "My Business", href: "/my-business", ariaLabel: "Manage My Business" },
              { label: "Pricing", href: "/pricing", ariaLabel: "View Pricing Plans" }
            ] : 
            []
          )
        ]
      }
    ]

    // Add authentication section based on user status
    if (auth.isAuthed) {
      // Authenticated users see Account section with sign out
      baseItems.push({
        label: "Account",
        bgColor: "#271E37",
        textColor: "#fff",
        links: [
          { label: "Account Settings", href: "/account", ariaLabel: "Account Settings" },
          ...(isAdmin ? 
            [{ label: "Admin Panel", href: "/admin", ariaLabel: "Admin Dashboard" }] : 
            []
          ),
          { label: "Sign Out", href: "#", ariaLabel: "Sign Out" }
        ]
      })
    } else {
      // Unauthenticated users see Auth section with sign in/sign up
      baseItems.push({
        label: "Auth",
        bgColor: "#271E37",
        textColor: "#fff",
        links: [
          { label: "Sign In", href: "/signin", ariaLabel: "Sign In" },
          { label: "Sign Up", href: "/signin?mode=signup", ariaLabel: "Sign Up" }
        ]
      })
    }

    return baseItems
  }

  // Handle CTA button click with useEffect
  useEffect(() => {
    const handleCtaClick = () => {
      if (!auth.isAuthed) {
        saveReturnUrl()
        // Redirect to sign up page instead of sign in
        window.location.href = '/signin?mode=signup'
      } else {
        window.location.href = '/account'
      }
    }

    // Add event listener to CTA button when component mounts
    const ctaButton = document.querySelector('.card-nav-cta-button')
    if (ctaButton) {
      ctaButton.addEventListener('click', handleCtaClick)
    }

    // Cleanup event listener on unmount
    return () => {
      if (ctaButton) {
        ctaButton.removeEventListener('click', handleCtaClick)
      }
    }
  }, [auth.isAuthed])

  // Handle sign out link click
  useEffect(() => {
    const handleSignOutClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && target.textContent === 'Sign Out') {
        e.preventDefault()
        auth.signOut()
      }
    }

    // Add event listener for sign out links
    document.addEventListener('click', handleSignOutClick)

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('click', handleSignOutClick)
    }
  }, [auth])

  return (
    <header className="relative z-40 bg-white/80 backdrop-blur border-b border-neutral-100 pt-2.5">
      <div className="relative">
        <CardNav
          logo="/images/top-left-logo.png"
          logoAlt="Bonita Forward Logo"
          items={createNavItems()}
          baseColor="#fff"
          menuColor="#000"
          buttonBgColor="#89D185"
          buttonTextColor="#000"
          ease="power3.out"
        />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-100 bg-white">
      <Container className="py-8 text-xs text-neutral-500">
        <div className="flex flex-col items-center justify-between gap-4 p-4 text-center md:flex-row md:text-left">
          <div>© {new Date().getFullYear()} Bonita Forward — Community powered, locally focused.</div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/business" className="text-neutral-700 hover:text-neutral-900">📈 Have a Business?</Link>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-neutral-900">Terms</a>
            <a href="/contact" className="text-neutral-700 hover:text-neutral-900">Contact</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="tel:+16197075351" className="text-neutral-700 hover:text-neutral-900">(619) 707-5351</a>
            <span className="hidden sm:inline text-neutral-400">·</span>
            <a href="mailto:bonitaforward@gmail.com" className="text-neutral-700 hover:text-neutral-900">bonitaforward@gmail.com</a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

function Layout() {
  const navigate = useNavigate()
  const auth = useAuth()

  const dockItems: DockItemData[] = [
    {
      icon: <ArrowLeft className="w-6 h-6 text-white" />,
      label: "Back",
      onClick: () => window.history.back()
    },
    {
      icon: <ArrowRight className="w-6 h-6 text-white" />,
      label: "Forward", 
      onClick: () => window.history.forward()
    },
    {
      icon: <Home className="w-6 h-6 text-white" />,
      label: "Home",
      onClick: () => navigate('/')
    },
    {
      icon: <User className="w-6 h-6 text-white" />,
      label: "Profile",
      onClick: () => navigate(auth.isAuthed ? '/account' : '/signin')
    },
    {
      icon: <BookOpen className="w-6 h-6 text-white" />,
      label: "Blog",
      onClick: () => navigate('/community')
    }
  ]

  return (
    <div className="min-h-full flex flex-col">
      <SupabasePing />
      <Navbar />
      <main className="flex-1 overflow-x-hidden pt-4">
        <Outlet />
      </main>
      <Footer />
      
      {/* Dock Navigation */}
      <Dock 
        items={dockItems}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40"
      />
    </div>
  )
}

function Hero() {
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<Provider[]>([])
  const [open, setOpen] = useState<boolean>(false)


  function recompute(q: string) {
    const text = q.trim().toLowerCase()
    // console.log('[Search] Searching for:', text)
    if (!text) { setResults([]); return }
    const all = getAllProviders(providersByCategory)
    // console.log('[Search] Total providers loaded:', all.length)
    
    // Debug: Show all restaurant providers and their tags
    // const restaurants = all.filter(p => p.category_key === 'restaurants-cafes')
    // console.log('[Search] Restaurant providers:', restaurants.map(p => ({ name: p.name, tags: p.tags })))
    
    const scored = all
      .map((p) => {
        const name = p.name.toLowerCase()
        const matchName = name.includes(text) ? 1 : 0
        const matchTag = (p.tags || []).some((t) => String(t).toLowerCase().includes(text)) ? 2 : 0
        const baseMatch = matchName + matchTag
        // Only give featured bonus if there's an actual match
        const featuredBonus = (baseMatch > 0 && p.isMember) ? 1.5 : 0
        const match = baseMatch + featuredBonus
        
        // Debug: Log any restaurant matches
        // if (p.category_key === 'restaurants-cafes' && (matchName > 0 || matchTag > 0)) {
        //   console.log('[Search] Restaurant match found:', { 
        //     name: p.name, 
        //     tags: p.tags, 
        //     matchName, 
        //     matchTag, 
        //     totalMatch: match 
        //   })
        // }
        
        return { p, match }
      })
      .filter((s) => s.match > 0)
      .sort((a, b) => b.match - a.match || (b.p.rating ?? 0) - (a.p.rating ?? 0) || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((s) => s.p)
    
    // console.log('[Search] Final results:', scored.map(p => ({ name: p.name, category: p.category_key })))
    setResults(scored)
  }

  useProviderUpdates(() => { if (query) recompute(query) }, [query])

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '33vh', overflow: 'visible' }}>
      <img
        src="/images/bonita-cartoon-hero.jpeg"
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement
          img.onerror = null
          img.src = `https://picsum.photos/seed/landing-hero-fallback/1600/900`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/60 to-transparent" aria-hidden></div>
      <div className="relative" style={{ minHeight: '33vh', alignContent: 'center' }}>
        <Container>
          <div className="py-10 sm:py-12 text-center">
            <SplitText 
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white relative z-1 font-display" 
            text="Discover, Support, and Grow Local Bonita." 
            duration={0.1}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            />
            <p className="mt-3 text-neutral-100" style={{ position: 'relative', zIndex: 2 }}>
              Minimal, modern, and made for our community. Explore top categories and get connected.
            </p>
            <div className="mt-4 mx-auto max-w-md text-left" style={{ position: 'relative', zIndex: 2 }}>
              <div className="relative">
                <div className="flex items-center rounded-full bg-white border-2 border-blue-400 px-4 py-3 shadow-lg focus-within:border-blue-500 focus-within:shadow-xl transition-all duration-300 hover:border-blue-300 search-bar-shine">
                  <span className="mr-3 select-none text-lg">🔎</span>
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); recompute(e.target.value) }}
                    onFocus={() => { if (results.length) setOpen(true) }}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    placeholder="Discover Bonita"
                    className="flex-1 outline-none text-base bg-transparent placeholder:text-neutral-400"
                  />
                </div>
                {open && results.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                    <ul className="max-h-64 overflow-auto">
                      {results.map((r) => (
                        <li key={r.id}>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setOpen(false); setQuery(''); navigate(`/provider/${encodeURIComponent(r.slug)}`) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between"
                          >
                            <span className="truncate mr-2">{r.name}</span>
                            <span className="text-[11px] text-neutral-500">{r.category_key.replace('-', ' ')}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {/* CTAs removed per request */}
          </div>
        </Container>
      </div>
    </section>
  )
}

/**
 * PROVIDER PAGE
 * 
 * This page displays comprehensive business information for community users.
 * It shows all the enhanced business details that business owners can manage
 * through their "My Business" dashboard.
 * 
 * Features:
 * - Business description and images
 * - Contact information (phone, email, website, address)
 * - Specialties and service areas
 * - Business hours and social media links
 * - Featured business badge and rating display
 * - Job postings (if any)
 * - Save business and coupon functionality for community users
 */
function ProviderPage() {
  const params = useParams()
  const providerIdentifier = params.id as string // Can be either ID or slug
  const all: Provider[] = getAllProviders(providersByCategory)
  
  // CRITICAL FIX: Support both ID and slug lookups for backward compatibility
  // This allows URLs like /provider/flora-cafe (slug) or /provider/uuid (ID)
  // Priority: Try slug first (for new URLs), then fall back to ID (for existing bookmarks)
  const provider = all.find((p) => p.slug === providerIdentifier) || all.find((p) => p.id === providerIdentifier)
  const auth = useAuth()
  const navigate = useNavigate()
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [jobs, setJobs] = useState<{ id: string; title: string; description?: string | null; apply_url?: string | null; salary_range?: string | null }[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // Booking modal state
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingDate, setBookingDate] = useState('') // yyyy-mm-dd
  const [bookingTime, setBookingTime] = useState('') // HH:MM
  const [bookingDuration, setBookingDuration] = useState(60)
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingPartySize, setBookingPartySize] = useState<number | ''>('')
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingMsg, setBookingMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadJobs() {
      try {
        if (!provider) return
        const { listJobPostsByProvider } = await import('./lib/supabaseData')
        const rows = await listJobPostsByProvider(provider.id)
        if (!cancelled) setJobs(rows)
      } catch {}
    }
    void loadJobs()
    return () => { cancelled = true }
  }, [provider?.id])

  useEffect(() => {
    async function checkSaved() {
      try {
        if (!auth.userId || !provider?.id) return
        // console.log('[Provider] check saved', { userId: auth.userId, providerId: provider.id })
        const { data, error } = await supabase
          .from('saved_providers')
          .select('id')
          .eq('user_id', auth.userId)
          .eq('provider_id', provider.id)
          .maybeSingle()
        if (error) {
          console.warn('[Provider] saved_providers lookup error', error)
          setIsSaved(false)
        } else {
          setIsSaved(!!data)
        }
      } catch (e) {
        console.warn('[Provider] checkSaved failed', e)
        setIsSaved(false)
      }
    }
    void checkSaved()
  }, [auth.userId, provider?.id])

  async function toggleSaveProvider() {
    if (!auth.userId || !provider?.id) { setSaveMsg('Please sign in'); return }
    setSaving(true)
    setSaveMsg(null)
    try {
      if (isSaved) {
        // console.log('[Provider] unsave', { userId: auth.userId, providerId: provider.id })
        const { error } = await supabase
          .from('saved_providers')
          .delete()
          .eq('user_id', auth.userId)
          .eq('provider_id', provider.id)
        if (error) setSaveMsg(error.message)
        else setIsSaved(false)
      } else {
        // console.log('[Provider] save', { userId: auth.userId, providerId: provider.id })
        const { error } = await supabase
          .from('saved_providers')
          .insert([{ user_id: auth.userId, provider_id: provider.id }])
        if (error) setSaveMsg(error.message)
        else setIsSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  async function createBooking() {
    try {
      setBookingMsg(null)
      if (!provider?.id) { setBookingMsg('Provider not found.'); return }
      const name = bookingName || auth.name || 'Customer'
      const email = bookingEmail || auth.email || ''
      if (!bookingDate || !bookingTime) { setBookingMsg('Please choose a date and time.'); return }
      if (!email) { setBookingMsg('Please enter your email.'); return }
      const startIso = new Date(`${bookingDate}T${bookingTime}:00`).toISOString()
      // Append party size for restaurant/cafe category
      const finalNotes = provider.category_key === 'restaurants-cafes' && bookingPartySize
        ? `${bookingNotes ? bookingNotes + '\n' : ''}Party size: ${bookingPartySize}`
        : bookingNotes
      setBookingBusy(true)
      const isLocal = window.location.hostname === 'localhost'
      const url = isLocal ? 'http://localhost:8888/.netlify/functions/google-calendar-create-event' : '/.netlify/functions/google-calendar-create-event'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          customer_email: email,
          customer_name: name,
          booking_date: startIso,
          duration_minutes: bookingDuration,
          notes: finalNotes
        })
      })
      if (!res.ok) {
        const text = await res.text()
        setBookingMsg(`Failed to create booking: ${text}`)
        return
      }
      await res.json()
      setBookingMsg('✅ Booking requested! You will receive a confirmation email if provided.')
      // Close modal and redirect to account page after short delay
      setTimeout(() => {
        setBookingOpen(false)
        setBookingBusy(false)
        setBookingMsg(null)
        // Redirect to account page to show the new booking
        navigate('/account')
      }, 1500)
    } catch (e: any) {
      setBookingMsg(e?.message || 'Failed to create booking')
    } finally {
      setBookingBusy(false)
    }
  }

  async function saveCoupon() {
    if (!auth.userId || !provider?.id) { setCouponMsg('Please sign in'); return }
    
    // Use the provider's coupon code instead of prompting
    const code = provider.coupon_code || 'COMMUNITY'
    
    setCouponBusy(true)
    setCouponMsg(null)
    try {
      // Check if user already saved this coupon
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('user_id', auth.userId)
        .eq('provider_id', provider.id)
        .maybeSingle()
      
      if (existing) {
        setCouponMsg('You already saved this coupon!')
        setCouponBusy(false)
        return
      }

      const { error } = await supabase
        .from('coupon_redemptions')
        .insert([{ user_id: auth.userId, provider_id: provider.id, code }])
      if (error) setCouponMsg(error.message)
      else setCouponMsg('Coupon saved to your account! View it anytime in your Account page.')
    } finally {
      setCouponBusy(false)
    }
  }
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          {!provider ? (
            <div className="text-sm text-neutral-600">Provider not found.</div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
                {provider.isMember && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                {provider.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span>{provider.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {/* Save Business button - available to all authenticated users */}
              {auth.isAuthed && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleSaveProvider}
                    disabled={saving}
                    className="rounded-full bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-800 transition-colors"
                  >
                    {saving ? 'Please wait…' : isSaved ? 'Saved ✓' : 'Save Business'}
                  </button>
                  {saveMsg && (
                    <span className="text-xs text-neutral-600">{saveMsg}</span>
                  )}
                </div>
              )}
              
              {/* Exclusive Coupon Display */}
              {provider.coupon_code && provider.coupon_discount && (
                <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-2 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-3xl">🎟️</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-green-900">Exclusive Coupon</h3>
                        {provider.coupon_expires_at && new Date(provider.coupon_expires_at) > new Date() && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            Expires {new Date(provider.coupon_expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-green-700 mb-2">{provider.coupon_discount}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-green-800 font-medium">Code:</span>
                        <code className="bg-white border border-green-300 px-3 py-1 rounded text-green-900 font-mono font-semibold text-sm">
                          {provider.coupon_code}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(provider.coupon_code || '')
                            alert('Coupon code copied to clipboard!')
                          }}
                          className="text-xs text-green-700 hover:text-green-900 underline"
                        >
                          Copy
                        </button>
                      </div>
                      {provider.coupon_description && (
                        <p className="text-sm text-green-800 mt-2">{provider.coupon_description}</p>
                      )}
                      {auth.isAuthed && (
                        <div>
                          <button
                            onClick={saveCoupon}
                            disabled={couponBusy}
                            className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            {couponBusy ? 'Saving…' : '💾 Save to My Account'}
                          </button>
                          {couponMsg && (
                            <p className="text-xs text-green-700 mt-2">{couponMsg}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Business Details Section */}
              <div className="mt-6 space-y-6">
                {/* Business Description */}
                {provider.description && (
                  <div>
                    <p className="text-neutral-700 leading-relaxed">{provider.description}</p>
                  </div>
                )}

                {/* Business Images */}
                {provider.images && provider.images.length > 0 && (
                  <div>

                    {/* Featured accounts get image grid, non-featured get single image */}
                    {isFeaturedProvider(provider) ? (
                      // Featured accounts: Dynamic responsive image grid based on image count
                      <div className={`grid gap-3 ${
                        provider.images.length === 1 ? 'grid-cols-1' :
                        provider.images.length === 2 ? 'grid-cols-2' :
                        provider.images.length === 3 ? 'grid-cols-3' :
                        'grid-cols-2' // 4 or more images
                      }`}>
                        {provider.images.map((image, index) => (
                          <div key={index} className="relative group aspect-square overflow-hidden rounded-lg cursor-pointer">
                            <img
                              src={image}
                              alt={`${provider.name} photo ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onClick={() => setSelectedImage(image)}
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement
                                img.style.display = 'none'
                                img.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                                    <div class="text-center text-neutral-500">
                                      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <p class="text-xs">Image unavailable</p>
                                    </div>
                                  </div>
                                `
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Non-featured accounts: Single image display
                      <div className="flex justify-center">
                        <div className="relative group max-w-md cursor-pointer">
                          <img
                            src={provider.images?.[0] || ''}
                            alt={`${provider.name} - Main Image`}
                            className="w-full h-64 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-shadow"
                            onClick={() => setSelectedImage(provider.images?.[0] || '')}
                          />
                          {/* Optional: Add a subtle indicator that this is a single image */}
                          <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-neutral-600">
                            1 of {provider.images.length}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Optional: Show upgrade message for non-featured accounts with multiple images */}
                    {!isFeaturedProvider(provider) && provider.images.length > 1 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Upgrade to Featured</strong> to showcase all {provider.images.length} images in an interactive gallery!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provider.phone && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.964 5.964l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${provider.phone}`} className="text-neutral-700 hover:text-neutral-900">
                          {provider.phone}
                        </a>
                      </div>
                    )}
                    
                    {provider.email && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${provider.email}`} className="text-neutral-700 hover:text-neutral-900">
                          {provider.email}
                        </a>
                      </div>
                    )}
                    
                    {provider.website && (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <a 
                          href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-neutral-700 hover:text-neutral-900"
                        >
                          {provider.website}
                        </a>
                      </div>
                    )}
                    
                    {provider.address && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-neutral-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-neutral-700">{provider.address}</p>
                          {provider.google_maps_url && (
                            <a 
                              href={provider.google_maps_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              View on Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialties */}
                {provider.specialties && provider.specialties.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.specialties.map((specialty, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Areas */}
                {provider.service_areas && provider.service_areas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Service Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.service_areas.map((area, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Hours */}
                {provider.business_hours && Object.keys(provider.business_hours).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Business Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(provider.business_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center py-1">
                          <span className="font-medium text-neutral-700 capitalize">{day}</span>
                          <span className="text-neutral-600">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media Links */}
                {provider.social_links && Object.keys(provider.social_links).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Follow Us</h3>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(provider.social_links).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url.startsWith('http') ? url : `https://${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                        >
                          <span className="capitalize">{platform}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {provider.tags && provider.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-sm bg-neutral-100 text-neutral-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Booking System - Featured Providers Only */}
              {provider.isMember && (provider.booking_enabled || provider.enable_calendar_booking || provider.enable_call_contact || provider.enable_email_contact) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Book with {provider.name}</h3>
                  <div className="rounded-xl border border-neutral-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                          {provider.booking_type === 'appointment' && 'Book an Appointment'}
                          {provider.booking_type === 'reservation' && 'Make a Reservation'}
                          {provider.booking_type === 'consultation' && 'Schedule a Consultation'}
                          {provider.booking_type === 'walk-in' && 'Walk-in Information'}
                          {!provider.booking_type && 'Book Online'}
                        </h4>
                        
                        {/* Debug info - showing all provider data */}
                        <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded">
                          <div><strong>Provider ID:</strong> {provider.id}</div>
                          <div><strong>Provider Name:</strong> {provider.name}</div>
                          <div><strong>booking_url:</strong> "{provider.booking_url}"</div>
                          <div><strong>enable_calendar_booking:</strong> {String(provider.enable_calendar_booking)} ({typeof provider.enable_calendar_booking})</div>
                          <div><strong>booking_enabled:</strong> {String(provider.booking_enabled)}</div>
                          <div><strong>isMember:</strong> {String(provider.isMember)}</div>
                          <div><strong>All provider keys:</strong> {Object.keys(provider).join(', ')}</div>
                          <div><strong>Raw provider object:</strong> {JSON.stringify(provider, null, 2)}</div>
                        </div>
                        
                        {/* Force refresh button for debugging */}
                        <button 
                          onClick={() => {
                            // Clear any cached data and reload
                            window.location.reload()
                          }}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mb-2 mr-2"
                        >
                          🔄 Force Refresh Page
                        </button>
                        
                        {/* Test database columns button */}
                        <button 
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase
                                .from('providers')
                                .select('id, name, enable_calendar_booking, enable_call_contact, enable_email_contact')
                                .eq('id', provider.id)
                                .single()
                              
                              if (error) {
                                alert(`Database Error: ${error.message}`)
                              } else {
                                alert(`Database Data: ${JSON.stringify(data, null, 2)}`)
                              }
                            } catch (err: any) {
                              alert(`Error: ${err.message}`)
                            }
                          }}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mb-2"
                        >
                          🗄️ Test Database Columns
                        </button>
                        
                        {provider.booking_url && provider.booking_url.trim() ? (
                          <div className="space-y-3">
                            <p className="text-neutral-700">
                              Click the button below to book online through our booking platform.
                            </p>
                            <a
                              href={provider.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Book Now
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {provider.booking_instructions && (
                              <div className="p-2 bg-white rounded-lg border border-neutral-200">
                                <h5 className="font-medium text-neutral-900 mb-2">Booking Instructions</h5>
                                <p className="text-neutral-700 whitespace-pre-wrap">{provider.booking_instructions}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-3">
                              {/* Debug: Show button condition */}
                              <div className="text-xs text-red-600 mb-2 p-2 bg-red-100 rounded">
                                Button Condition: enable_calendar_booking = {String(provider.enable_calendar_booking)} 
                                ({typeof provider.enable_calendar_booking}) - Should show button: {String(!!provider.enable_calendar_booking)}
                              </div>
                              
                              {/* Primary booking action - show if calendar booking is enabled OR if no booking URL */}
                              {provider.enable_calendar_booking && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingOpen(true)
                                    // Prefill from auth if available
                                    setBookingName(auth.name || '')
                                    setBookingEmail(auth.email || '')
                                  }}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                  Book Appointment
                                </button>
                              )}
                              
                              {provider.phone && provider.enable_call_contact && (
                                <a
                                  href={`tel:${provider.phone}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.964 5.964l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  Call {provider.phone}
                                </a>
                              )}
                              
                              {provider.email && provider.enable_email_contact && (
                                <a
                                  href={`mailto:${provider.email}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Email {provider.email}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {jobs.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium">Open Roles</div>
                  <div className="mt-2 space-y-2">
                    {jobs.map((j) => (
                      <div key={j.id} className="rounded-xl border border-neutral-200 p-3">
                        <div className="font-medium text-sm">{j.title}</div>
                        {j.salary_range && <div className="text-xs text-neutral-600">{j.salary_range}</div>}
                        {j.description && <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{j.description}</div>}
                        {j.apply_url && <div className="mt-1"><a className="text-xs underline" href={j.apply_url} target="_blank" rel="noreferrer">Apply</a></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>

      {/* Full-screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt={`${provider?.name} full-size image`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
              aria-label="Close image"
            >
              <X className="w-6 h-6 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBookingOpen(false)}></div>
          <div className="relative bg-white rounded-2xl border border-neutral-200 p-5 w-[90%] max-w-md shadow-xl">
            <div className="text-lg font-semibold text-neutral-900">Book with {provider?.name}</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Date</label>
                  <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Time</label>
                  <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Your Name</label>
                  <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Your Email</label>
                  <input type="email" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Duration (minutes)</label>
                  <input type="number" min={15} step={15} value={bookingDuration} onChange={(e) => setBookingDuration(parseInt(e.target.value || '60'))} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
                </div>
              </div>
              {provider?.category_key === 'restaurants-cafes' && (
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Party Size</label>
                  <input type="number" min={1} value={bookingPartySize} onChange={(e) => setBookingPartySize(e.target.value ? parseInt(e.target.value) : '')} className="w-full rounded-lg border border-neutral-300 px-3 py-2" placeholder="e.g., 4" />
                </div>
              )}
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Notes (optional)</label>
                <textarea rows={3} value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2" placeholder="Anything the business should know before your appointment" />
              </div>
              {bookingMsg && <div className="text-xs text-neutral-700">{bookingMsg}</div>}
              <div className="mt-2 flex items-center justify-end gap-2">
                <button onClick={() => setBookingOpen(false)} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm">Cancel</button>
                <button onClick={createBooking} disabled={bookingBusy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                  {bookingBusy ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function CategoryCard({ cat }: { cat: typeof categories[number] }) {
  return (
    <GlareHover
      width="auto"
      height="auto"
      background="#ffffff"
      glareColor="#999999"
      glareOpacity={0.3}
      glareAngle={-33}
      glareSize={300}
      transitionDuration={800}
      playOnce={false}
    >
    <Link to={`/category/${cat.key}`} className="block rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-20 w-25 items-center justify-center rounded-2xl bg-neutral-50">
          <img 
            src={cat.icon} 
            alt={`${cat.name} icon`}
            className="h-20 w-25 object-contain"
          />
        </span>
      <div>
          <div className="font-medium text-neutral-900">{cat.name}</div>
          <div className="text-sm text-neutral-600">{cat.description}</div>
      </div>
        <ArrowRight className="ml-auto h-4 w-4 text-neutral-400" />
      </div>
    </Link>
    </GlareHover>
  )
}

function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const calendarEvents = await fetchCalendarEvents()
        setEvents(calendarEvents)
      } catch (error) {
        console.error('Error loading calendar events:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="container-px mx-auto max-w-6xl">
          <LoadingSpinner message="Loading calendar events..." />
        </div>
      </section>
    )
  }

  return <Calendar events={events} />
}

function CommunitySection() {
  const cards = [
    { category_key: 'restaurants-cafes', title: 'Top 5 Restaurants This Month', excerpt: 'Discover trending dining spots loved by Bonita locals.' },
    { category_key: 'home-services', title: 'Bonita Home Service Deals', excerpt: 'Seasonal offers from trusted local pros.' },
    { category_key: 'health-wellness', title: 'Wellness Spotlight', excerpt: 'Chiropractors, gyms, and med spas to try now.' },
    { category_key: 'real-estate', title: 'Property Opportunities in Bonita', excerpt: 'Latest properties and market highlights.' },
    { category_key: 'professional-services', title: 'Top Professional Services of Bonita', excerpt: 'Standout legal, accounting, and consulting pros.' },
  ]
  return (
    <section className="py-8">
      <Container>
        <ScrollFloat
          animationDuration={1}
          ease='back.inOut(2)'
          scrollStart='center bottom+=50%'
          scrollEnd='bottom bottom-=40%'
          stagger={0.03}
          textClassName="text-2xl md:text-4xl font-semibold tracking-tight text-neutral-900 font-display"
        >
          Community Blogs
        </ScrollFloat>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => {
            const bgMap: Record<string, string> = {
              'restaurants-cafes': "/images/community/restaurants-cafes.png",
     'home-services': "/images/community/home-services.png",
     'health-wellness': "/images/community/health-wellness.png",
     'real-estate': "/images/community/real-estate.png",
     'professional-services': "/images/community/professional-services.png",
            }
            const bg = bgMap[c.category_key as CategoryKey]
            return (
              <Link key={c.title} to={`/community/${c.category_key}`} className="relative rounded-2xl overflow-hidden block hover:shadow-sm border border-white/40">
                <img
                  src={bg}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.onerror = null
                    img.src = `/images/community/{c.category_key}-fallback.png`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/60 via-transparent to-neutral-900/60" aria-hidden></div>
                <div className="relative z-10 p-4 min-h-[160px] flex flex-col justify-between">
                  <div>
                    <GradientText
                      colors={["#313672", "#8cd884", "#ffe3c6", "#fcddff", "#914471"]}
                      animationSpeed={6}
                      showBorder={false}
                      className="animated-gradient-text font-medium"
                    >{c.title}
                    </GradientText>
                    <div className="text-sm text-neutral-100 mt-1">{c.excerpt}</div>
                  </div>
                  <span className="mt-3 inline-block text-sm px-2 py-2 text-center full-w-bg self-center" style={{ color: 'white' }}>Read more</span>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

function Confetti() {
  // simple CSS confetti using pseudo-random gradients
  const pieces = Array.from({ length: 40 })
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-3 rounded-sm opacity-80"
            style={{
              left: Math.random() * 100 + '%',
              top: '-10px',
              background: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `confetti-fall ${2000 + Math.random() * 1200}ms ease-in forwards`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ThankYouPage() {
  return (
    <section className="py-12">
      <Container>
        <div className="relative rounded-2xl border border-neutral-100 p-8 bg-white text-center elevate form-fade">
          <Confetti />
          <h1 className="text-2xl font-semibold tracking-tight">Thanks! 🎉</h1>
          <p className="mt-2 text-neutral-600">Your request to be featured was successfully submitted.</p>
          <div className="mt-5">
            <Link to="/" className="btn btn-primary">Back to Home</Link>
          </div>
        </div>
      </Container>
    </section>
  )
}

function HomePage() {
  return (
    <>
      <Hero />
      <section id="categories" className="py-2">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.slice(0, 4).map((c) => (
              <CategoryCard cat={c} key={c.key} />
            ))}
            <details className="rounded-2xl p-4 bg-white">
              <summary className="cursor-pointer select-none text-sm" style={{ color: '#7070e3' }}>See more</summary>
              <div className="mt-3">
                {categories.slice(4).map((c) => (
                  <div key={c.key} className="mt-2">
                    <CategoryCard cat={c} />
                  </div>
                ))}
              </div>
            </details>
          </div>
        </Container>
      </section>
      <CalendarSection />
      <CommunitySection />
    </>
  )
}

// Removed old LeadForm in favor of the new 4-step Funnel

type FunnelOption = {
  id: string
  label: string
}

type FunnelQuestion = {
  id: string
  prompt: string
  options: FunnelOption[]
}

const funnelConfig: Record<CategoryKey, FunnelQuestion[]> = {
  'real-estate': [
    // real-estate is built dynamically via getFunnelQuestions; this serves as a fallback
    { id: 'need', prompt: 'What do you need help with?', options: [ { id: 'buy', label: 'Buying' }, { id: 'sell', label: 'Selling' }, { id: 'rent', label: 'Renting' } ] },
    { id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] },
    { id: 'budget', prompt: 'Approximate budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] },
    { id: 'beds', prompt: 'Bedrooms', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4', label: '4+' } ] },
  ],
  'home-services': [
    {
      id: 'type',
      prompt: 'Which service do you need?',
      options: [
        { id: 'landscaping', label: 'Landscaping' },
        { id: 'cleaning', label: 'Cleaning' },
        { id: 'solar', label: 'Solar' },
        { id: 'remodeling', label: 'Remodeling' },
        { id: 'plumbing', label: 'Plumbing' },
        { id: 'electrical', label: 'Electrical' },
        { id: 'hvac', label: 'HVAC' },
        { id: 'roofing', label: 'Roofing' },
        { id: 'flooring', label: 'Flooring' },
        { id: 'painting', label: 'Painting' },
        { id: 'handyman', label: 'Handyman' },
        { id: 'pool', label: 'Pool Service' },
        { id: 'pest control', label: 'Pest Control' },
        { id: 'security', label: 'Security' },
        { id: 'windows', label: 'Windows' },
        { id: 'doors', label: 'Doors' },
        { id: 'insulation', label: 'Insulation' },
        { id: 'concrete', label: 'Concrete' },
        { id: 'masonry', label: 'Masonry' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How soon do you need it?',
      options: [
        { id: 'asap', label: 'ASAP' },
        { id: 'this-month', label: 'This month' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'property',
      prompt: 'Property type?',
      options: [
        { id: 'house', label: 'House' },
        { id: 'condo', label: 'Condo' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget range?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
  ],
  'health-wellness': [
    {
      id: 'type',
      prompt: 'What are you looking for?',
      options: [
        { id: 'chiro', label: 'Chiropractor' },
        { id: 'gym', label: 'Gym' },
        { id: 'salon', label: 'Salon' },
        { id: 'medspa', label: 'Med Spa' },
        { id: 'dental', label: 'Dental' },
        { id: 'medical', label: 'Medical' },
        { id: 'therapy', label: 'Therapy' },
        { id: 'naturopathic', label: 'Naturopathic' },
      ],
    },
    {
      id: 'goal',
      prompt: 'Your primary goal?',
      options: [
        { id: 'relief', label: 'Pain relief' },
        { id: 'fitness', label: 'Fitness' },
        { id: 'beauty', label: 'Beauty' },
      ],
    },
    {
      id: 'when',
      prompt: 'When would you start?',
      options: [
        { id: 'this-week', label: 'This week' },
        { id: 'this-month', label: 'This month' },
        { id: 'later', label: 'Later' },
      ],
    },
    {
      id: 'membership',
      prompt: 'Membership or one-off?',
      options: [
        { id: 'membership', label: 'Membership' },
        { id: 'one-off', label: 'One‑off' },
      ],
    },
  ],
  'restaurants-cafes': [
    {
      id: 'cuisine',
      prompt: 'What sounds good?',
      options: [
        { id: 'mexican', label: 'Mexican' },
        { id: 'asian', label: 'Asian' },
        { id: 'american', label: 'American' },
        { id: 'cafes', label: 'Cafés' },
      ],
    },
    {
      id: 'occasion',
      prompt: 'Occasion?',
      options: [
        { id: 'casual', label: 'Casual' },
        { id: 'date', label: 'Date' },
        { id: 'family', label: 'Family' },
      ],
    },
    {
      id: 'price',
      prompt: 'Price range?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
    {
      id: 'mode',
      prompt: 'Dine‑in or takeout?',
      options: [
        { id: 'dine', label: 'Dine‑in' },
        { id: 'takeout', label: 'Takeout' },
      ],
    },
  ],
  'professional-services': [
    {
      id: 'type',
      prompt: 'Which service?',
      options: [
        { id: 'attorney', label: 'Attorney' },
        { id: 'accountant', label: 'Accountant' },
        { id: 'consultant', label: 'Consultant' },
      ],
    },
    {
      id: 'need',
      prompt: 'What do you need?',
      options: [
        { id: 'advice', label: 'Advice' },
        { id: 'ongoing', label: 'Ongoing help' },
        { id: 'project', label: 'Project‑based' },
      ],
    },
    {
      id: 'timeline',
      prompt: 'Timeline?',
      options: [
        { id: 'now', label: 'Now' },
        { id: 'soon', label: 'Soon' },
        { id: 'flex', label: 'Flexible' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget?',
      options: [
        { id: 'low', label: '$' },
        { id: 'med', label: '$$' },
        { id: 'high', label: '$$$' },
      ],
    },
  ],
}

type Provider = {
  id: string
  name: string
  slug: string // URL-friendly version of the business name (e.g., "flora-cafe")
  category_key: CategoryKey // FIXED: Use category_key to match database schema
  tags: string[]
  rating?: number
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
  // Enhanced business fields from database
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  images?: string[] | null
  badges?: string[] | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  // Missing fields:
  featured_since?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  // Contact method toggles
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  // Coupon fields
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
  bonita_resident_discount?: string | null
}
function ensureDemoMembers(input: Record<CategoryKey, Provider[]>): Record<CategoryKey, Provider[]> {
  const out: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  };
  (Object.keys(input) as CategoryKey[]).forEach((k: CategoryKey) => {
    const key = k
    const arr = input[key] || []
    out[key] = arr.map((p: Provider, idx: number) => ({ ...p, isMember: Boolean(p.isMember) || idx < 3 }))
  })
  return out
}


type ProviderDetails = {
  phone?: string
  email?: string
  website?: string
  address?: string
  images?: string[]
  reviews?: { author: string; rating: number; text: string }[]
  posts?: { id: string; title: string; url?: string }[]
}

// Removed unused providerDescriptions/getProviderDescription to satisfy TypeScript build

/**
 * SLUG GENERATION FUNCTION
 * 
 * Creates URL-friendly slugs from business names for cleaner URLs.
 * Example: "Flora Cafe" -> "flora-cafe"
 * 
 * This enables professional URLs like /provider/flora-cafe instead of /provider/uuid
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

function isFeaturedProvider(p: Provider): boolean {
  // Only check the isMember field to ensure consistency with admin page
  // This prevents discrepancies where providers show as featured on provider page
  // but not on admin page due to different logic
  return Boolean(p.isMember)
}

function getProviderDetails(p: Provider): ProviderDetails {
  // Use actual business data from database instead of placeholder data
  return {
    phone: p.phone || undefined,
    email: p.email || undefined,
    website: p.website || undefined,
    address: p.address || undefined,
    // Use actual business images from database if available, otherwise show no images
    // Filter out empty or invalid image URLs
    images: p.images && p.images.length > 0 
      ? p.images.filter(img => img && typeof img === 'string' && img.trim().length > 0)
      : undefined,
    // Only show reviews if they exist in the database (currently no reviews table exists)
    // TODO: Add reviews table to database and fetch actual reviews
    reviews: undefined, // Remove placeholder reviews until reviews system is implemented
    // Only show related posts if they exist in the database (currently no posts table exists)
    // TODO: Add posts table to database and fetch actual related posts
    posts: undefined, // Remove placeholder posts until posts system is implemented
  }
}

let providersByCategory: Record<CategoryKey, Provider[]> = {
  'real-estate': [],
  'home-services': [],
  'health-wellness': [],
  'restaurants-cafes': [],
  'professional-services': [],
}

async function loadProvidersFromSheet(): Promise<void> {
  try {
    const rows = await fetchSheetRows()
    const mapped = mapRowsToProviders(rows)
    const grouped: Record<CategoryKey, Provider[]> = {
      'real-estate': [],
      'home-services': [],
      'health-wellness': [],
      'restaurants-cafes': [],
      'professional-services': [],
    }
    mapped.forEach((sp: SheetProvider) => {
      const cat = (sp.category_key as CategoryKey)
      if (grouped[cat]) {
        grouped[cat].push({ id: sp.id, name: sp.name, slug: generateSlug(sp.name), category_key: cat, tags: sp.tags.length ? sp.tags : (sp.details.badges || []), rating: sp.rating })
      }
    })
    providersByCategory = ensureDemoMembers(grouped)
    // console.log('[Sheets] Providers loaded from Google Sheets', grouped)
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
}

async function loadProvidersFromSupabase(): Promise<boolean> {
  const rows = await fetchProvidersFromSupabase()
  if (!rows || rows.length === 0) {
    console.warn('[Supabase] No providers found or failed to load')
    return false
  }
  console.log(`[Supabase] Loaded ${rows.length} providers from database`)
  
  const grouped: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  }
  function coerceIsMember(r: any): boolean {
    // CRITICAL FIX: Match Admin page logic EXACTLY - only check for boolean true values
    // Admin page uses: provider.is_featured === true || provider.is_member === true
    // This ensures perfect consistency between admin page and provider page featured status
    // We only check for boolean true, not string 'true' or numeric 1, to match admin page exactly
    const isFeatured = r.is_featured === true
    const isMember = r.is_member === true
    
    // Return true if EITHER field indicates featured status (matching Admin page logic exactly)
    return isFeatured || isMember
  }

  rows.forEach((r) => {
    const key = (r.category_key as CategoryKey)
    if (!grouped[key]) return
    // Combine tags and badges to preserve featured/member flags
    const combinedTags = Array.from(new Set([...
      (((r.tags as string[] | null) || []) as string[]),
      (((r.badges as string[] | null) || []) as string[]),
    ].flat().map((s) => String(s).trim()).filter(Boolean)))

    // Debug: Only log health-wellness providers to avoid spam
    // if (key === 'health-wellness') {
    //   console.log(`[Supabase] Loading health-wellness provider: ${r.name} (published: ${r.published})`)
    // }

    grouped[key].push({
      id: r.id,
      name: r.name,
      slug: generateSlug(r.name), // Generate URL-friendly slug from business name
      category_key: key,
      tags: combinedTags,
      rating: r.rating ?? undefined,
      phone: r.phone ?? null,
      email: r.email ?? null,
      website: r.website ?? null,
      address: r.address ?? null,
      isMember: coerceIsMember(r),
      // Enhanced business fields
      description: r.description ?? null,
      specialties: r.specialties ?? null,
      social_links: r.social_links ?? null,
      business_hours: r.business_hours ?? null,
      service_areas: r.service_areas ?? null,
      google_maps_url: r.google_maps_url ?? null,
      images: r.images ?? null,
      badges: r.badges ?? null,
      published: r.published ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      // Booking system fields
      booking_enabled: r.booking_enabled ?? null,
      booking_type: r.booking_type ?? null,
      booking_instructions: r.booking_instructions ?? null,
      booking_url: r.booking_url ?? null,
      // Contact method toggles
      enable_calendar_booking: r.enable_calendar_booking ?? null,
      enable_call_contact: r.enable_call_contact ?? null,
      enable_email_contact: r.enable_email_contact ?? null,
    })
  })
  providersByCategory = grouped
  
  // Log summary of loaded providers by category
  // Object.keys(grouped).forEach((category) => {
  //   const count = grouped[category as CategoryKey].length
  //   console.log(`[Supabase] ${category}: ${count} providers loaded`)
  // })
  
  // console.log('[Supabase] Providers loaded successfully', grouped)
  try { window.dispatchEvent(new CustomEvent('bf-providers-updated')) } catch {}
  return true
}

function scoreProviders(category: CategoryKey, answers: Record<string, string>): Provider[] {
  // CRITICAL FIX: Only get providers from the specified category
  const providers = providersByCategory[category] || []
  
  // Remove console spam - no logging here
  
  if (category === 'health-wellness') {
    const type = answers['type']
    const goal = answers['goal'] || answers['salon_kind']
    const when = answers['when']
    const payment = answers['payment']
    
    // Comprehensive synonym mapping for health-wellness provider types
    const getProviderSynonyms = (providerType: string): string[] => {
      const synonymMap: Record<string, string[]> = {
        // Dental
        'dental': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
        'dentist': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
        
        // Gym/Fitness
        'gym': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
        'fitness': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
        
        // Salon/Beauty
        'salon': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
        'beauty': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
        
        // Spa/Med Spa
        'spa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
        'medspa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
        
        // Chiropractor
        'chiro': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
        'chiropractor': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
        
        // Medical
        'medical': ['medical', 'doctor', 'physician', 'clinic', 'healthcare', 'primary care', 'family medicine', 'internal medicine', 'pediatrics', 'urgent care'],
        
        // Therapy
        'therapy': ['therapy', 'therapist', 'physical therapy', 'pt', 'occupational therapy', 'ot', 'speech therapy', 'rehabilitation', 'rehab', 'counseling', 'mental health', 'psychology', 'psychiatry'],
        
        // Naturopathic
        'naturopathic': ['naturopath', 'naturopathic', 'nd', 'natural medicine', 'holistic', 'alternative medicine', 'functional medicine', 'integrative medicine'],
        
        // Vision/Eye Care
        'vision': ['optometry', 'optometrist', 'vision', 'eye care', 'eyewear', 'glasses', 'contacts', 'ophthalmology', 'ophthalmologist'],
        
        // Mental Health
        'mental': ['mental health', 'psychology', 'psychiatrist', 'psychologist', 'counseling', 'therapist', 'therapy', 'depression', 'anxiety', 'counselor'],
        
        // Physical Therapy
        'physical': ['physical therapy', 'pt', 'physiotherapy', 'rehabilitation', 'rehab', 'sports medicine', 'injury recovery'],
        
        // Podiatry
        'podiatry': ['podiatrist', 'foot care', 'foot doctor', 'ankle', 'foot surgery'],
        
        // Dermatology
        'dermatology': ['dermatologist', 'skin care', 'dermatology', 'skin doctor', 'acne', 'moles', 'skin cancer'],
        
        // Acupuncture
        'acupuncture': ['acupuncture', 'acupuncturist', 'traditional chinese medicine', 'tcm'],
      }
      
      return synonymMap[providerType.toLowerCase()] || [providerType]
    }
    
    // Enhanced matching function that checks synonyms
    const tagsMatchSynonyms = (tags: string[], targetType: string): boolean => {
      if (!tags || !targetType) return false
      const synonyms = getProviderSynonyms(targetType)
      const lowerTags = tags.map(tag => tag.toLowerCase())
      
      return synonyms.some(synonym => 
        lowerTags.some(tag => 
          tag.includes(synonym.toLowerCase()) || 
          synonym.toLowerCase().includes(tag)
        )
      )
    }
    
    // Helper function for simple keyword matching (for secondary criteria)
    const tagsContainKeyword = (tags: string[], keyword: string): boolean => {
      if (!keyword || !tags) return false
      const lowerKeyword = keyword.toLowerCase()
      return tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    }
    
    // Enhanced scoring with synonym matching
    const scoredProviders = providers
      .map((p) => {
        let score = 0
        
        // Primary type matching with synonyms
        if (type && tagsMatchSynonyms(p.tags, type)) {
          score += 5 // High priority for exact type match
        }
        
        // Goal matching with synonyms
        if (goal && tagsMatchSynonyms(p.tags, goal)) {
          score += 3 // Medium-high priority for goal match
        }
        
        // Secondary criteria
        if (when && tagsContainKeyword(p.tags, when)) score += 1
        if (payment && tagsContainKeyword(p.tags, payment)) score += 1
        
        // If no specific criteria selected, give all providers a base score
        if (!type && !goal && !when && !payment) {
          score = 1 // Base score so all providers show up when no filters applied
        }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected type with synonyms
        const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(a.p.tags, type)) || (goal && tagsMatchSynonyms(a.p.tags, goal))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(b.p.tags, type)) || (goal && tagsMatchSynonyms(b.p.tags, goal))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!type && !goal) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        // Sort by score (highest first)
        if (b.score !== a.score) return b.score - a.score
        
        // Then by rating
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        
        // Finally by name
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
    
    return scoredProviders
  }
  if (category === 'real-estate') {
    const values = new Set<string>(Object.values(answers))
    const need = answers['need']
    const propertyType = answers['property_type']
    const wantsStaging = answers['staging'] === 'yes'
    const stagerTags = new Set(['stager','staging'])
    return providers
      .filter((p) => {
        const isStager = (p.tags || []).some((t) => stagerTags.has(t))
        return wantsStaging ? true : !isStager
      })
      .map((p) => {
        let score = 0
        // Strong signals
        if (need && p.tags.includes(need)) score += 2
        if (propertyType && p.tags.includes(propertyType)) score += 2
        // Moderate signals
        if (answers['timeline'] && p.tags.includes(answers['timeline'])) score += 1
        if (answers['move_when'] && p.tags.includes(answers['move_when'])) score += 1
        if (answers['budget'] && p.tags.includes(answers['budget'])) score += 1
        if (answers['beds'] && p.tags.includes(answers['beds'])) score += 1
        if (wantsStaging && (p.tags.includes('staging') || p.tags.includes('stager'))) score += 1
        // Generic tag match fallback
        p.tags.forEach((t) => { if (values.has(t)) score += 0 })
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // For real-estate, check if featured providers match the selected need/property type
        const aFeaturedMatchesCriteria = aIsFeatured && (need || propertyType) ? 
          ((need && a.p.tags.includes(need)) || (propertyType && a.p.tags.includes(propertyType))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (need || propertyType) ? 
          ((need && b.p.tags.includes(need)) || (propertyType && b.p.tags.includes(propertyType))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!need && !propertyType) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
  }
  
  // FIXED: Add specific logic for restaurants-cafes category
  if (category === 'restaurants-cafes') {
    const values = new Set<string>(Object.values(answers).map(v => v.toLowerCase()))
    const cuisine = answers['cuisine']?.toLowerCase()
    const occasion = answers['occasion']?.toLowerCase()
    const price = answers['price']?.toLowerCase()
    const service = answers['service']?.toLowerCase()
    
    // CUISINE SYNONYMS: Map cuisine selections to related terms
    const getCuisineSynonyms = (cuisineType: string) => {
      const synonyms: Record<string, string[]> = {
        'mexican': ['mexican', 'mexican restaurant', 'tacos', 'taco', 'burrito', 'burritos', 'mexican food', 'tex-mex', 'texmex'],
        'asian': ['asian', 'asian restaurant', 'chinese', 'japanese', 'thai', 'vietnamese', 'korean', 'indian', 'asian food', 'sushi', 'ramen', 'pho'],
        'american': ['american', 'american restaurant', 'burger', 'burgers', 'bbq', 'barbecue', 'steak', 'steakhouse', 'american food'],
        'cafes': ['cafes', 'cafe', 'coffee', 'coffee shop', 'coffeeshop', 'coffeehouse', 'espresso', 'latte', 'cappuccino', 'breakfast', 'brunch'],
        'italian': ['italian', 'italian restaurant', 'pizza', 'pasta', 'italian food', 'trattoria', 'ristorante'],
        'mediterranean': ['mediterranean', 'greek', 'middle eastern', 'mediterranean food', 'falafel', 'hummus', 'gyro'],
        'seafood': ['seafood', 'fish', 'lobster', 'crab', 'shrimp', 'oyster', 'seafood restaurant'],
        'vegetarian': ['vegetarian', 'vegan', 'plant-based', 'vegetarian restaurant', 'vegan restaurant'],
        'fast food': ['fast food', 'quick service', 'drive-thru', 'fast casual'],
        'fine dining': ['fine dining', 'upscale', 'gourmet', 'fine restaurant', 'elegant dining']
      }
      return synonyms[cuisineType] || [cuisineType]
    }
    
    // Get all related terms for the selected cuisine
    const cuisineSynonyms = cuisine ? getCuisineSynonyms(cuisine) : []
    const allCuisineTerms = new Set([...cuisineSynonyms, ...values])
    
    // console.log('[Restaurant Filter] Answers:', { cuisine, occasion, price, service })
    // console.log('[Restaurant Filter] Cuisine synonyms:', cuisineSynonyms)
    // console.log('[Restaurant Filter] All answer values:', Array.from(values))
    
    return providers
      .map((p) => {
        let score = 0
        
        // CUISINE MATCHING: Check for exact cuisine match first, then synonyms
        if (cuisine) {
          // Exact match gets highest score
          if (p.tags.some(t => t.toLowerCase() === cuisine)) {
            score += 4
          } else {
            // Check for cuisine synonyms
            const cuisineMatch = p.tags.some(t => {
              const tagLower = t.toLowerCase()
              return cuisineSynonyms.some(synonym => 
                tagLower === synonym || 
                tagLower.includes(synonym) || 
                synonym.includes(tagLower)
              )
            })
            if (cuisineMatch) score += 3
          }
        }
        
        // OTHER MATCHES: Occasion, price, service
        if (occasion && p.tags.some(t => t.toLowerCase() === occasion)) score += 2
        if (price && p.tags.some(t => t.toLowerCase() === price)) score += 2
        if (service && p.tags.some(t => t.toLowerCase() === service)) score += 2
        
        // GENERAL TAG MATCHES: Check all answer values and cuisine terms
        p.tags.forEach((t) => { 
          const tagLower = t.toLowerCase()
          if (allCuisineTerms.has(tagLower)) score += 1
        })
        
        // Debug: Log scoring for restaurants
        // if (score > 0) {
        //   console.log('[Restaurant Filter] Scored:', { 
        //     name: p.name, 
        //     tags: p.tags, 
        //     score: score 
        //   })
        // }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected cuisine
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected cuisine
        const aFeaturedMatchesCuisine = aIsFeatured && cuisine ? 
          (a.p.tags.some(t => t.toLowerCase() === cuisine) || 
           a.p.tags.some(t => {
             const tagLower = t.toLowerCase()
             return cuisineSynonyms.some(synonym => 
               tagLower === synonym || 
               tagLower.includes(synonym) || 
               synonym.includes(tagLower)
             )
           })) : false
           
        const bFeaturedMatchesCuisine = bIsFeatured && cuisine ? 
          (b.p.tags.some(t => t.toLowerCase() === cuisine) || 
           b.p.tags.some(t => {
             const tagLower = t.toLowerCase()
             return cuisineSynonyms.some(synonym => 
               tagLower === synonym || 
               tagLower.includes(synonym) || 
               synonym.includes(tagLower)
             )
           })) : false
        
        // Only prioritize featured providers that match the cuisine
        const am = aFeaturedMatchesCuisine ? 1 : 0
        const bm = bFeaturedMatchesCuisine ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no cuisine selected, fall back to original featured logic
        if (!cuisine) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        if (b.score !== a.score) return b.score - a.score
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
  }
  
  // FIXED: Add comprehensive logic for home-services category
  if (category === 'home-services') {
    const type = answers['type']
    const goal = answers['goal'] || answers['urgency']
    const when = answers['urgency']
    const budget = answers['budget']
    
    // Comprehensive synonym mapping for home-services provider types
    const getProviderSynonyms = (serviceType: string): string[] => {
      const synonymMap: Record<string, string[]> = {
        // Landscaping
        'landscaping': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
        'landscape': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
        
        // Cleaning Services
        'cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
        'house cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
        
        // Solar/Energy
        'solar': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
        'solar installation': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
        
        // Remodeling/Construction
        'remodeling': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
        'renovation': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
        
        // Plumbing
        'plumbing': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
        'plumber': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
        
        // Electrical
        'electrical': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
        'electrician': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
        
        // HVAC
        'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        'heating': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        'cooling': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
        
        // Roofing
        'roofing': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
        'roofer': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
        
        // Flooring
        'flooring': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
        'floor': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
        
        // Painting
        'painting': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
        'painter': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
        
        // Handyman
        'handyman': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
        'handy man': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
        
        // Pool Services
        'pool': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
        'pool service': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
        
        // Pest Control
        'pest control': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
        'exterminator': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
        
        // Security
        'security': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
        'alarm': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
        
        // Windows & Doors
        'windows': ['windows', 'window', 'window replacement', 'window installation', 'window repair', 'window contractor', 'glass', 'glass repair', 'window company'],
        'doors': ['doors', 'door', 'door replacement', 'door installation', 'door repair', 'door contractor', 'garage door', 'garage door repair', 'door company'],
        
        // Insulation
        'insulation': ['insulation', 'insulate', 'insulation installation', 'insulation contractor', 'attic insulation', 'wall insulation', 'energy efficiency'],
        
        // Concrete/Masonry
        'concrete': ['concrete', 'concrete work', 'concrete contractor', 'concrete repair', 'concrete installation', 'driveway', 'patio', 'sidewalk', 'foundation'],
        'masonry': ['masonry', 'mason', 'stone work', 'brick', 'brick work', 'stone', 'fireplace', 'chimney', 'masonry contractor'],
      }
      
      return synonymMap[serviceType.toLowerCase()] || [serviceType]
    }
    
    // Enhanced matching function that checks synonyms
    const tagsMatchSynonyms = (tags: string[], targetType: string): boolean => {
      if (!tags || !targetType) return false
      const synonyms = getProviderSynonyms(targetType)
      const lowerTags = tags.map(tag => tag.toLowerCase())
      
      return synonyms.some(synonym => 
        lowerTags.some(tag => 
          tag.includes(synonym.toLowerCase()) || 
          synonym.toLowerCase().includes(tag)
        )
      )
    }
    
    // Helper function for simple keyword matching (for secondary criteria)
    const tagsContainKeyword = (tags: string[], keyword: string): boolean => {
      if (!keyword || !tags) return false
      const lowerKeyword = keyword.toLowerCase()
      return tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    }
    
    // Enhanced scoring with synonym matching
    const scoredProviders = providers
      .map((p) => {
        let score = 0
        
        // Primary type matching with synonyms
        if (type && tagsMatchSynonyms(p.tags, type)) {
          score += 5 // High priority for exact type match
        }
        
        // Goal matching with synonyms
        if (goal && tagsMatchSynonyms(p.tags, goal)) {
          score += 3 // Medium-high priority for goal match
        }
        
        // Secondary criteria
        if (when && tagsContainKeyword(p.tags, when)) score += 1
        if (budget && tagsContainKeyword(p.tags, budget)) score += 1
        
        // If no specific criteria selected, give all providers a base score
        if (!type && !goal && !when && !budget) {
          score = 1 // Base score so all providers show up when no filters applied
        }
        
        return { p, score }
      })
      .sort((a, b) => {
        // Featured providers first, but ONLY if they match the selected criteria
        const aIsFeatured = isFeaturedProvider(a.p)
        const bIsFeatured = isFeaturedProvider(b.p)
        
        // Check if featured providers match the selected type with synonyms
        const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(a.p.tags, type)) || (goal && tagsMatchSynonyms(a.p.tags, goal))) : false
        const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
          ((type && tagsMatchSynonyms(b.p.tags, type)) || (goal && tagsMatchSynonyms(b.p.tags, goal))) : false
        
        // Only prioritize featured providers that match the criteria
        const am = aFeaturedMatchesCriteria ? 1 : 0
        const bm = bFeaturedMatchesCriteria ? 1 : 0
        if (bm !== am) return bm - am
        
        // If no specific criteria selected, fall back to original featured logic
        if (!type && !goal) {
          const amFallback = aIsFeatured ? 1 : 0
          const bmFallback = bIsFeatured ? 1 : 0
          if (bmFallback !== amFallback) return bmFallback - amFallback
        }
        
        // Sort by score (highest first)
        if (b.score !== a.score) return b.score - a.score
        
        // Then by rating
        const ar = a.p.rating ?? 0
        const br = b.p.rating ?? 0
        if (br !== ar) return br - ar
        
        // Finally by name
        return a.p.name.localeCompare(b.p.name)
      })
      .map((s) => s.p)
    
    return scoredProviders
  }
  
  const values = new Set<string>(Object.values(answers))
  const withScores = providers.map((p) => {
    const matches = p.tags.reduce((acc, t) => acc + (values.has(t) ? 1 : 0), 0)
    return { p, score: matches }
  })
  withScores.sort((a, b) => {
    // Featured providers first, but ONLY if they match the selected criteria
    const aIsFeatured = isFeaturedProvider(a.p)
    const bIsFeatured = isFeaturedProvider(b.p)
    
    // For generic categories, check if featured providers match any selected criteria
    const aFeaturedMatchesCriteria = aIsFeatured && values.size > 0 ? 
      a.p.tags.some(t => values.has(t)) : false
    const bFeaturedMatchesCriteria = bIsFeatured && values.size > 0 ? 
      b.p.tags.some(t => values.has(t)) : false
    
    // Only prioritize featured providers that match the criteria
    const am = aFeaturedMatchesCriteria ? 1 : 0
    const bm = bFeaturedMatchesCriteria ? 1 : 0
    if (bm !== am) return bm - am
    
    // If no specific criteria selected, fall back to original featured logic
    if (values.size === 0) {
      const amFallback = aIsFeatured ? 1 : 0
      const bmFallback = bIsFeatured ? 1 : 0
      if (bmFallback !== amFallback) return bmFallback - amFallback
    }
    
    if (b.score !== a.score) return b.score - a.score
    const ar = a.p.rating ?? 0
    const br = b.p.rating ?? 0
    if (br !== ar) return br - ar
    return a.p.name.localeCompare(b.p.name)
  })
  return withScores.map((s) => s.p)
}

// Persist funnel answers per user to Supabase (if tables exist)
async function persistFunnelForUser(params: { email?: string | null; category: CategoryKey; answers: Record<string, string> }) {
  const { email, category, answers } = params
  if (!email || !answers || !Object.keys(answers).length) return
  try {
    await supabase
      .from('funnel_responses')
      .upsert(
        [
          {
            user_email: email,
            category,
            answers,
          },
        ],
        { onConflict: 'user_email,category' }
      )
  } catch (err) {
    // Silently ignore if table isn't created yet
    console.warn('[Supabase] upsert funnel_responses failed (safe to ignore if table missing)', err)
  }
}

// Removed createBookingRow function - no longer needed since form submission is removed

/**
 * BUSINESS APPLICATION SUBMISSION
 * 
 * This function handles business application submissions from the /business page.
 * It stores applications in the 'business_applications' table for admin review.
 * 
 * NOTE: The tier parameter is captured but not stored in database yet.
 * You need to add 'tier_requested' and 'status' columns to business_applications table.
 * 
 * Current flow:
 * 1. User fills form on /business page (selects free or featured tier)
 * 2. Application is submitted to business_applications table
 * 3. User is redirected to create business account
 * 4. User can then go to My Business page to request free listings
 */
async function createBusinessApplication(params: { full_name?: string; business_name?: string; email?: string; phone?: string; category?: string; challenge?: string; tier?: string }) {
  console.log('[BusinessApp] submitting application', params)
  try {
    const { error } = await supabase
      .from('business_applications')
      .insert([
        {
          full_name: params.full_name || null,
          business_name: params.business_name || null,
          email: params.email || null,
          phone: params.phone || null,
          category: params.category || null,
          challenge: params.challenge || null,
          // TODO: Add these columns to business_applications table:
          // tier_requested: params.tier || 'free',
          // status: 'pending'
        },
      ])
    if (error) {
      console.error('[BusinessApp] insert error', error)
    } else {
      console.log('[BusinessApp] insert success')
    }
    return { data: null, error }
  } catch (err) {
    console.error('[BusinessApp] unexpected failure', err)
    return { data: null, error: err as any }
  }
}

// (Kept for backward compatibility with older forms)
// Removed unused createContactLead implementation after migrating contact to general user form

function getFunnelQuestions(categoryKey: CategoryKey, answers: Record<string, string>): FunnelQuestion[] {
  if (categoryKey === 'health-wellness') {
    const type = answers['type']
    const list: FunnelQuestion[] = []
    // Q1: Service type
    list.push({
      id: 'type',
      prompt: 'What are you looking for?',
      options: [
        { id: 'chiro', label: 'Chiropractor' },
        { id: 'physical-therapy', label: 'Physical Therapy' },
        { id: 'gym', label: 'Gym' },
        { id: 'pilates-yoga', label: 'Pilates/Yoga' },
        { id: 'salon', label: 'Salon' },
        { id: 'medspa', label: 'Med Spa' },
        { id: 'general-healthcare', label: 'General Healthcare' },
        { id: 'naturopathic', label: 'Naturopathic' },
        { id: 'dental', label: 'Dental' },
        { id: 'mental-health', label: 'Mental Health' },
      ],
    })

    if (!type) return list.slice(0, 1)

    // Q2: Specialized goal/need by type
    if (type === 'salon') {
      list.push({ id: 'salon_kind', prompt: 'Salon service?', options: [ { id: 'salon-hair', label: 'Hair' }, { id: 'salon-nail', label: 'Nail' }, { id: 'salon-other', label: 'Other' } ] })
    } else if (type === 'chiro') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'relief', label: 'Pain relief' }, { id: 'mobility', label: 'Mobility' }, { id: 'injury', label: 'Injury recovery' } ] })
    } else if (type === 'physical-therapy') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'rehab', label: 'Rehab' }, { id: 'performance', label: 'Performance' }, { id: 'post-surgery', label: 'Post‑surgery' } ] })
    } else if (type === 'gym' || type === 'pilates-yoga') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'fitness', label: 'Fitness' }, { id: 'strength', label: 'Strength' }, { id: 'classes', label: 'Classes' } ] })
    } else if (type === 'medspa') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'beauty', label: 'Beauty' }, { id: 'wellness', label: 'Wellness' } ] })
    } else if (type === 'general-healthcare' || type === 'naturopathic') {
      list.push({ id: 'goal', prompt: 'Your primary goal?', options: [ { id: 'wellness', label: 'Wellness' }, { id: 'general', label: 'General health' } ] })
    } else if (type === 'dental') {
      list.push({ id: 'goal', prompt: 'Dental need?', options: [ { id: 'cleaning', label: 'Cleaning' }, { id: 'emergency', label: 'Emergency' }, { id: 'ortho', label: 'Ortho' } ] })
    } else if (type === 'mental-health') {
      list.push({ id: 'goal', prompt: 'Support needed?', options: [ { id: 'therapy', label: 'Therapy' }, { id: 'counseling', label: 'Counseling' } ] })
    }

    // Q3: Urgency (generic, phrased naturally)
    list.push({ id: 'when', prompt: 'When would you like to start?', options: [ { id: 'this-week', label: 'This week' }, { id: 'this-month', label: 'This month' }, { id: 'later', label: 'Later' } ] })

    // Q4: Payment model only for gym/pilates (others default one‑off)
    if (type === 'gym' || type === 'pilates-yoga') {
      list.push({ id: 'payment', prompt: 'Payment preference?', options: [ { id: 'membership', label: 'Membership' }, { id: 'one-off', label: 'One‑off' } ] })
    }

    return list.slice(0, 4)
  }
  if (categoryKey === 'real-estate') {
    const need = answers['need']
    const propertyType = answers['property_type']
    const isResidential = (pt?: string) => ['single-family','condo-townhome','apartment-multifamily'].includes(pt || '')
    const isLandOrCommercial = (pt?: string) => ['land','office','retail','industrial-warehouse'].includes(pt || '')

    const list: FunnelQuestion[] = []

    // Q1: Need
    list.push({
      id: 'need',
      prompt: 'What do you need help with?',
      options: [
        { id: 'buy', label: 'Buying' },
        { id: 'sell', label: 'Selling' },
        { id: 'rent', label: 'Renting' },
      ],
    })

    // Q2: Property type (works for buy/sell/rent and drives conditionals)
    list.push({
      id: 'property_type',
      prompt: 'Property type?',
      options: [
        { id: 'single-family', label: 'Single‑Family' },
        { id: 'condo-townhome', label: 'Condo/Townhome' },
        { id: 'apartment-multifamily', label: 'Apartment/Multifamily' },
        { id: 'land', label: 'Land' },
        { id: 'office', label: 'Office' },
        { id: 'retail', label: 'Retail' },
        { id: 'industrial-warehouse', label: 'Industrial/Warehouse' },
      ],
    })

    if (need === 'sell') {
      // Q3: Staging toggle for sellers (relevant to presentation)
      list.push({
        id: 'staging',
        prompt: 'Interested in home staging?',
        options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ],
      })
      // Q4: Residential → Bedrooms; Land/Commercial → Listing timeline
      if (isResidential(propertyType)) {
        list.push({ id: 'beds', prompt: 'Bedrooms in your property?', options: [ { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4+', label: '4+' } ] })
      } else {
        list.push({ id: 'timeline', prompt: 'When are you planning to list?', options: [ { id: 'now', label: 'Now' }, { id: '30-60', label: '30–60 days' }, { id: '60+', label: '60+ days' } ] })
      }
      return list.slice(0, 4)
    }

    if (need === 'rent') {
      // Q3: Monthly budget for rentals
      list.push({ id: 'budget', prompt: 'Monthly budget?', options: [ { id: 'low', label: '$' }, { id: 'med', label: '$$' }, { id: 'high', label: '$$$' } ] })
      // Q4: Residential → Bedrooms; Land/Commercial → Move timeline
      if (isResidential(propertyType)) {
        list.push({ id: 'beds', prompt: 'Bedrooms needed?', options: [ { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3+', label: '3+' } ] })
      } else {
        list.push({ id: 'move_when', prompt: 'When do you plan to start?', options: [ { id: 'this-week', label: 'This week' }, { id: 'this-month', label: 'This month' }, { id: 'later', label: 'Later' } ] })
      }
      return list.slice(0, 4)
    }

    // Default BUY flow
    // Q3: Purchase budget
    list.push({ id: 'budget', prompt: 'Purchase budget?', options: [ { id: 'entry', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' } ] })
    // Q4: Residential → Bedrooms; Land/Commercial → Timeline
    if (isResidential(propertyType)) {
      list.push({ id: 'beds', prompt: 'Bedrooms needed?', options: [ { id: '2', label: '2+' }, { id: '3', label: '3+' }, { id: '4+', label: '4+' } ] })
    } else if (isLandOrCommercial(propertyType)) {
      list.push({ id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
    } else {
      list.push({ id: 'timeline', prompt: "What's your timeline?", options: [ { id: '0-3', label: '0–3 months' }, { id: '3-6', label: '3–6 months' }, { id: '6+', label: '6+ months' } ] })
    }
    return list.slice(0, 4)
  }
  // other categories use static config above
  return funnelConfig[categoryKey].slice(0, 4)
}

function trackChoice(category: CategoryKey, questionId: string, optionId: string) {
  try {
    const key = `bf-tracking-${category}`
    const existing = getLocalStorageJSON<Record<string, string>>(key, {})
    existing[questionId] = optionId
    localStorage.setItem(key, JSON.stringify(existing))
    // Optionally POST to backend when available
    // void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, questionId, optionId, ts: Date.now() }) })
  } catch {}
}

function Funnel({ category }: { category: typeof categories[number] }) {
  const [step, setStep] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [anim, setAnim] = useState<'in' | 'out'>('in')
  const questions = useMemo(() => getFunnelQuestions(category.key, answers), [category.key, answers])
  const current = questions[step]
  const auth = useAuth()
  const initializedRef = useRef(false)

  // On mount, hydrate answers from localStorage so users never re-enter
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    try {
      const key = `bf-tracking-${category.key}`
      const existing = getLocalStorageJSON<Record<string, string>>(key, {})
      if (existing && typeof existing === 'object') {
        setAnswers(existing)
        // fast-forward step to first unanswered question
        const qs = getFunnelQuestions(category.key, existing)
        const firstUnanswered = qs.findIndex((q) => !existing[q.id])
        if (firstUnanswered >= 0) setStep(firstUnanswered)
        else setStep(qs.length)
      }
    } catch {}
  }, [category.key])

  function choose(option: FunnelOption) {
    trackChoice(category.key, current.id, option.id)
    setAnswers((a: Record<string, string>) => ({ ...a, [current.id]: option.id }))
    setAnim('out')
    setTimeout(() => {
      setStep((s: number) => Math.min(s + 1, questions.length))
      setAnim('in')
    }, 120)
  }

  // Whenever answers change and user is authenticated, persist to Supabase
  useEffect(() => {
    if (!auth.email) return
    persistFunnelForUser({ email: auth.email, category: category.key, answers })
  }, [auth.email, category.key, answers])

  const done = step >= questions.length

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-md text-center">
        {!done ? (
          <div key={current.id} className={`rounded-2xl border border-neutral-100 p-5 bg-white elevate transition-all duration-200 ${anim === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <div className="text-sm text-neutral-500">Step {step + 1} of {questions.length}</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">{current.prompt}</h3>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {current.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => choose(opt)}
                  className="btn btn-secondary sparkle border border-neutral-200"
                >
                  {opt.label}
        </button>
              ))}
      </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Great! Here's your summary</h3>
            <ul className="mt-3 text-sm text-neutral-700 text-left">
              {questions.map((q) => (
                <li key={q.id} className="flex justify-between border-b border-neutral-100 py-2">
                  <span className="text-neutral-500">{q.prompt}</span>
                  <span>{q.options.find((o) => o.id === answers[q.id])?.label || '-'}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <div className="flex flex-col gap-2">
                <Link
                  to={`/book?category=${category.key}`}
                  onClick={(e) => {
                    const card = (e.currentTarget.closest('section') as HTMLElement) || document.body
                    card.classList.add('slide-out-right')
                    setTimeout(() => {
                      // allow navigation after animation; Link will handle it
                    }, 160)
                  }}
                  className="btn btn-primary"
                >
                  Find Best Match
                </Link>
                <button
                  onClick={() => {
                    const container = (document.querySelector('section') as HTMLElement)
                    if (container) container.classList.add('slide-out-left')
                    setTimeout(() => {
                      try { localStorage.removeItem(`bf-tracking-${category.key}`) } catch {}
                      setAnswers({})
                      setStep(0)
                      setAnim('in')
                      if (container) container.classList.remove('slide-out-left')
                    }, 160)
                  }}
                  className="btn btn-secondary"
                >
                  Edit Answers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryFilters({ 
  category, 
  answers
}: { 
  category: typeof categories[number]
  answers: Record<string, string>
}) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>(answers)
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const auth = useAuth()

  // Get available filter options based on category
  const getFilterOptions = (questionId: string) => {
    const questions = getFunnelQuestions(category.key, {})
    const question = questions.find(q => q.id === questionId)
    return question?.options || []
  }

  const updateFilter = (questionId: string, value: string) => {
    const newFilters = { ...selectedFilters, [questionId]: value }
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  const clearFilter = (questionId: string) => {
    const newFilters = { ...selectedFilters }
    delete newFilters[questionId]
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  // Apply initial filters on mount
  useEffect(() => {
    const scored = scoreProviders(category.key, selectedFilters)
    setFilteredProviders(scored)
  }, [category.key, selectedFilters])

  const questions = getFunnelQuestions(category.key, {})

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-50">
          <img 
            src={category.icon} 
            alt={`${category.name} icon`}
            className="h-20 w-20 object-contain"
          />
        </span>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          Refine Your {category.name} Search
        </h3>
        <p className="text-sm text-neutral-600">
          Adjust your preferences to find the perfect match
        </p>
      </div>

      {/* Compact Filter Controls - Horizontal Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {questions.map((question) => {
          const options = getFilterOptions(question.id)
          const currentValue = selectedFilters[question.id]
          
          return (
            <div key={question.id} className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 block">
                {question.prompt}
              </label>
              <select
                value={currentValue || ''}
                onChange={(e) => {
                  if (e.target.value === '') {
                    clearFilter(question.id)
                  } else {
                    updateFilter(question.id, e.target.value)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Results - Always Visible */}
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-neutral-900">
            Your Matches ({filteredProviders.length})
          </h4>
        </div>
        
        {filteredProviders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProviders.slice(0, 8).map((provider) => {
                const details = getProviderDetails(provider)
                return (
                  <Link key={provider.id} to={`/provider/${provider.slug}`} className="block">
                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      {/* Provider Image with Overlays */}
                      <div className="relative">
                        {details.images && details.images.length > 0 ? (
                          <div className="aspect-video bg-neutral-100">
                            <img
                              src={fixImageUrl(details.images[0])}
                              alt={`${provider.name} business photo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement
                                img.style.display = 'none'
                                img.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                                    <div class="text-center text-neutral-500">
                                      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <p class="text-xs">No image available</p>
                                    </div>
                                  </div>
                                `
                              }}
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                            <div className="text-center text-neutral-500">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs">No image available</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Featured Badge - Top Right Over Image */}
                        {isFeaturedProvider(provider) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Tag - Positioned between image and title, half on image */}
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start ml-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm">
                            {provider.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Provider Info */}
                      <div className="p-2 text-center mt-[-1rem]">
                        <div className="flex flex-col items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-neutral-900 text-lg">{provider.name}</h3>
                        </div>
                        
                        {/* Rating Display */}
                        {provider.rating && (
                          <div className="flex items-center justify-center gap-1 mb-3">
                            <span className="text-sm font-medium text-neutral-900">{provider.rating.toFixed(1)}</span>
                            <span className="text-amber-500">★</span>
                          </div>
                        )}
                        
                        {/* Tags - Only visible to admin */}
                        {auth.isAuthed && provider.tags && provider.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mb-3">
                            {provider.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {filteredProviders.length > 8 && (
              <div className="text-center mt-6">
                <Link
                  to={`/book?category=${category.key}&filters=${encodeURIComponent(JSON.stringify(selectedFilters))}`}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All {filteredProviders.length} Results
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p>No matches found with your current filters.</p>
            <p className="text-sm mt-1">Try adjusting your preferences or clearing some filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryPage() {
  const path = window.location.pathname.split('/').pop() as CategoryKey
  const category = categories.find((c) => c.key === path)
  if (!category) return <Container className="py-10">Category not found.</Container>
  const [, setVersion] = useState(0)
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false)
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({})
  
  useProviderUpdates(() => { setVersion((v: number) => v + 1) }, [])

  // Check if user has completed questionnaire for this category
  useEffect(() => {
    try {
      const key = `bf-tracking-${category.key}`
      const existing = getLocalStorageJSON<Record<string, string>>(key, {})
      if (existing && typeof existing === 'object') {
        const questions = getFunnelQuestions(category.key, existing)
        const isComplete = questions.every((q) => existing[q.id])
        setHasCompletedQuestionnaire(isComplete)
        setQuestionnaireAnswers(existing)
      }
    } catch {}
  }, [category.key])
  
  return (
    <section className="py-4 px-4">

      {/* Content */}
      {hasCompletedQuestionnaire ? (
        <CategoryFilters 
          category={category} 
          answers={questionnaireAnswers}
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-2">
              Let's find the best match for you in {category.name}
            </h2>
          </div>
          <Funnel category={category} />
        </div>
      )}
    </section>
  )
}

function AboutPage() {
  return (
    <section className="relative min-h-screen py-12">
      {/* Prism Background - Top Section */}
      <div className="absolute top-0 left-0 right-0 h-96 z-0" style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}>
        <Prism
          height={6}
          baseWidth={18}
          animationType="rotate"
          glow={0.6}
          noise={0}
          transparent={true}
          scale={1.8}
          hueShift={0.3}
          colorFrequency={0.6}
          timeScale={0.08}
          bloom={0.4}
          suspendWhenOffscreen={true}
        />
      </div>

      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/20 via-white/10 to-white/5 z-0"></div>

      {/* Content */}
      <div className="relative z-10" style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}>
        <Container>
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
              For Bonita, By Bonita
            </h1>
            <p className="text-xl md:text-2xl text-black/90 mb-8 max-w-4xl mx-auto">
              Connecting Our Community. Supporting Our Businesses.
            </p>
            <p className="text-lg text-black/80 max-w-3xl mx-auto">
              Your Digital Main Street
            </p>
          </div>

          {/* Story Section */}
          <div className="mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/20">
              <h2 className="text-3xl font-bold text-black mb-6 text-center">Our Story</h2>
              <p className="text-lg text-black/90 leading-relaxed text-center max-w-4xl mx-auto">
                We were talking about how much we love our community, but worried that some of our favorite local gems were struggling to be seen online. We knew there had to be a better way to connect residents with the amazing businesses right in our backyard.
              </p>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-black mb-4">Our Mission</h3>
              <p className="text-black/90 leading-relaxed">
                Our mission is to empower Bonita's local businesses by providing a digital platform that fosters community connection, drives economic growth, and celebrates the unique character of our town.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-black mb-4">Our Vision</h3>
              <p className="text-black/90 leading-relaxed">
                We envision a thriving, interconnected Bonita where every local business has the tools to succeed, and every resident feels a strong sense of pride and connection to their community.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Community First */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-black mb-3">Community First</h3>
                <p className="text-black/80 text-sm">
                  Every decision we make prioritizes the well-being and growth of our local community.
                </p>
              </div>

              {/* Integrity */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold text-black mb-3">Integrity</h3>
                <p className="text-black/80 text-sm">
                  We operate with honesty, transparency, and ethical practices in everything we do.
                </p>
              </div>

              {/* Collaboration */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-black mb-3">Collaboration</h3>
                <p className="text-black/80 text-sm">
                  We believe in the power of working together to achieve common goals.
                </p>
              </div>

              {/* Innovation */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-black mb-3">Innovation</h3>
                <p className="text-black/80 text-sm">
                  We continuously seek creative solutions to support our local businesses.
                </p>
              </div>

              {/* Local Pride */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-black mb-3">Local Pride</h3>
                <p className="text-black/80 text-sm">
                  We celebrate and promote the unique character and businesses of Bonita.
                </p>
              </div>

              {/* Growth */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-xl font-bold text-black mb-3">Growth</h3>
                <p className="text-black/80 text-sm">
                  We're committed to fostering sustainable economic growth for our community.
                </p>
              </div>
            </div>
          </div>

          {/* Meet the Team Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black mb-8 text-center">Meet the Team</h2>
            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-8">

              {/* Team Member 1 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">AC</span>
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Agustin Chavez</h3>
                <p className="text-black/80 text-sm mb-3">Founder</p>
                <p className="text-black/70 text-sm">
                  "I've seen too many amazing shops struggle with visibility while big chains thrive."
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/20">
              <h2 className="text-3xl font-bold text-black mb-4">Join Our Mission</h2>
              <p className="text-lg text-black/90 mb-6 max-w-2xl mx-auto">
                Be part of building a stronger, more connected Bonita community. Whether you're a business owner or a resident, together we can make our town thrive.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/business"
                  className="bg-white text-purple-900 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
                >
                  Add Your Business
                </a>
                <a
                  href="/signin"
                  className="border-2 border-black text-black px-8 py-3 rounded-full font-semibold hover:bg-black/10 transition-colors"
                >
                  Join Community
                </a>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}

function ContactPage() {
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate max-w-xl mx-auto">
          <h2 className="text-xl font-semibold tracking-tight">Contact Bonita Forward</h2>
          <p className="mt-1 text-neutral-600">Have a question or feedback? Reach us at <a href="mailto:bonitaforward@gmail.com" className="underline">bonitaforward@gmail.com</a> or call <a href="tel:+16197075351" className="underline">(619) 707-5351</a>.</p>
          <form
            className="mt-4 grid grid-cols-1 gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const name = (form.elements.namedItem('name') as HTMLInputElement)?.value
              const email = (form.elements.namedItem('email') as HTMLInputElement)?.value
              const subject = (form.elements.namedItem('subject') as HTMLInputElement)?.value
              const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value
              try { localStorage.setItem('bf-user-contact', JSON.stringify({ name, email, subject, message, ts: Date.now() })) } catch {}
              form.reset()
              window.location.assign('/thank-you')
            }}
          >
            <div>
              <label className="block text-sm text-neutral-600">Full Name</label>
              <input name="name" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Subject</label>
              <input name="subject" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="How can we help?" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Message</label>
              <textarea name="message" rows={5} required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Write your message here" />
            </div>
            <div className="text-xs text-neutral-500">By submitting, you agree to our <a className="underline" href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a> and <a className="underline" href="/terms.html" target="_blank" rel="noreferrer">Terms</a>.</div>
            <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Send Message</button>
          </form>
        </div>
      </Container>
    </section>
  )
}

function BusinessPage() {
  const auth = useAuth()
  const [msg, setMsg] = useState<string | null>(null)
  // Parse URL params once for prefill values
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [])
  // simple ROI calculator state is kept local via uncontrolled inputs and live compute
  useEffect(() => {
    // If user arrived with #apply or prefill params, scroll to and focus form
    const hasPrefill = urlParams.toString().length > 0
    if (window.location.hash === '#apply' || hasPrefill) {
      setTimeout(() => {
        const el = document.getElementById('apply')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const inputs = el?.querySelectorAll('input')
        ;(inputs && inputs[1] as HTMLInputElement | undefined)?.focus() // Business Name field
      }, 50)
    }
  }, [])
  return (
    <ScrollStack className="min-w-[100vw]">
    <section className="py-8">
      <Container>
          <div className="text-center">
            <SplitText 
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-black relative z-1" 
              text="Grow Your Bonita Business!" 
              duration={0.1}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
            />
            <p className="mt-3 text-neutral-600">Bonita Forward helps you reach thousands of Bonita, San Diego residents and turns them into paying customers.</p>
            <a href="#apply" className="inline-block mt-5 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Featured</a>
            <div>
              <a href="#how" className="mt-2 inline-block text-sm text-neutral-700 hover:text-neutral-900">See How It Works ↓</a>
            </div>
          </div>
            <ScrollStackItem>
              <h3>Step 1: Exposure</h3>
              <p>Your business gets featured on Bonita Forward. The local hub residents already trust.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
              </div>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 2: Customers Find You</h3>
              <p>We ask Bonita residents what they want.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"></path>
                  <path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"></path>
                  <path d="M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"></path>
                  <path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"></path>
                </svg>
              </div>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 3: Growth</h3>
              <p>You receive local repeat-customers weekly.</p>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 0 1 8.66 5" />
                  <path d="M20 2v5h-5" />
                  <path d="M22 12a10 10 0 0 1-5 8.66" />
                  <path d="M22 20h-5v-5" />
                  <path d="M12 22a10 10 0 0 1-8.66-5" />
                  <path d="M4 22v-5h5" />
                  <path d="M2 12a10 10 0 0 1 5-8.66" />
                  <path d="M2 4h5v5" />
                </svg>
              </div>

            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Step 4: Your Business Grows</h3>
              <p>Locals enjoy discovering your business and you get to enjoy the benefits.</p>
            </ScrollStackItem>
            <ScrollStackItem>
              <h3>Bonita's Economy Grows</h3>
              <div className="stack-img-container">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2 L6 10 H9 L4 16 H10 L2 22 H22 L14 16 H20 L15 10 H18 Z" />
                  <path d="M12 22 V16" />
                </svg>
              </div>
            </ScrollStackItem>
          
          <div className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade scroll-stack-end">
            <h2 className="text-xl font-semibold tracking-tight">What's a New Customer Worth to You?</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm text-neutral-600">Avg. Sale Value ($)</label>
                <input id="avg" type="number" defaultValue={250} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-neutral-600">Monthly New Customers Goal</label>
                <input id="goal" type="number" defaultValue={5} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" />
              </div>
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50">
                <div className="text-sm text-neutral-600">Estimated Monthly Value</div>
                <div id="roi" className="text-lg font-semibold">
                <CountUp
                  from={0}
                  to={1250}
                  separator=","
                  direction="up"
                  duration={2}
                  className="count-up-text"
                />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const avg = Number((document.getElementById('avg') as HTMLInputElement)?.value || 0)
                const goal = Number((document.getElementById('goal') as HTMLInputElement)?.value || 0)
                const out = avg * goal
                const el = document.getElementById('roi')
                if (el) el.textContent = `$${out.toLocaleString()}`
              }}
              className="mt-3 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate"
            >
              Get My Free Growth Plan
            </button>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight z-10">Bonita Businesses Already Growing</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                '"Our real estate leads doubled in 30 days."',
                '"We had 47 new diners book in the first month."',
                '"Finally, a marketing solution built for Bonita."',
              ].map((t) => (
                <div key={t} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate text-sm text-neutral-700">{t}</div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">Plans That Fit Your Business</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Starter', price: 'Free', blurb: 'Free Listing' },
                { name: 'Growth', price: '$97/year', blurb: 'Featured Listing' },
              ].map((p) => (
                <div key={p.name} className="rounded-2xl border border-neutral-100 p-5 bg-white elevate">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-2xl font-semibold mt-1">{p.price}</div>
                  <div className="text-sm text-neutral-600 mt-1">{p.blurb}</div>
                </div>
              ))}
            </div>
            
            {/* Details Below Toggle */}
            <details className="mt-6 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <summary className="cursor-pointer select-none p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">See plan details below</span>
                <svg className="w-5 h-5 text-neutral-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              {/* Plan Comparison Details */}
              <div className="p-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 mb-6 text-center">Compare Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Free Account Section */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                        Free Account
                      </h4>
                      <p className="text-2xl font-bold text-green-600 mt-2">$0/month</p>
                    </div>
                    <ul className="text-sm text-neutral-700 space-y-2">
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Business name, category, phone, email
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Website and address
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Basic business description (up to 200 characters)
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Basic tags and specialties
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        1 business image
                      </li>
                    </ul>
                  </div>
                  
                  {/* Featured Account Section */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                        Featured Account
                      </h4>
                      <p className="text-2xl font-bold text-yellow-600 mt-2">$97/year</p>
                    </div>
                    <ul className="text-sm text-neutral-700 space-y-2">
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Everything in Free, plus:</strong>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Priority placement</strong> - appears at top of search results
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Enhanced description</strong> - up to 500 characters
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Social media links</strong> - Facebook, Instagram, etc.
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Google Maps integration</strong> - interactive location
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Multiple images</strong> - showcase your business
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Booking system</strong> - direct appointment scheduling
                      </li>
                      <li className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Analytics</strong> - view customer interactions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div id="apply" className="mt-10 rounded-2xl border border-neutral-100 p-5 bg-white elevate form-fade">
            {!auth.isAuthed || String((auth as any)?.role || '').toLowerCase() !== 'business' ? (
              <>
                <h2 className="text-xl font-semibold tracking-tight">Ready to Grow? Apply Below.</h2>
                <form
                  className="mt-4 grid grid-cols-1 gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const form = e.currentTarget as HTMLFormElement
                    const full_name = (form.elements.item(0) as HTMLInputElement)?.value
                    const business_name = (form.elements.item(1) as HTMLInputElement)?.value
                    const email = (form.elements.item(2) as HTMLInputElement)?.value
                    const phone = (form.elements.item(3) as HTMLInputElement)?.value
                    // EXTRACT FORM DATA including tier selection
                    const category = (form.elements.item(4) as HTMLSelectElement)?.value
                    const tier = (form.querySelector('input[name="tier"]:checked') as HTMLInputElement)?.value || 'free'
                    const challenge = (form.elements.item(6) as HTMLTextAreaElement)?.value
                    
                    // Save form data to localStorage for recovery if needed
                    try { localStorage.setItem('bf-business-app', JSON.stringify({ full_name, business_name, email, phone, category, tier, challenge, ts: Date.now() })) } catch {}
                    
                    // SUBMIT APPLICATION to business_applications table
                    const { error } = await createBusinessApplication({ full_name, business_name, email, phone, category, challenge, tier })
                    
                    if (!error) {
                      // SUCCESS - Show confirmation and redirect to account creation
                      setMsg(`Thanks! We received your ${tier} listing application. Create an account to track your application status and manage your business listing.`)
                      form.reset()
                      
                      // Pre-fill signup form with business info
                      try { localStorage.setItem('bf-signup-prefill', JSON.stringify({ name: full_name, email })) } catch {}
                      
                      // AUTO-REDIRECT to signup page with business account type pre-selected
                      setTimeout(() => {
                        window.location.href = `/signin?mode=signup&email=${encodeURIComponent(email)}&name=${encodeURIComponent(full_name)}&type=business`
                      }, 3000)
                    } else {
                      // ERROR - Show failure message (likely database column missing)
                      setMsg('We could not submit your application. Please try again.')
                    }
                  }}
                >
                  <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Full Name" defaultValue={urlParams.get('full_name') || ''} />
                  <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business Name" defaultValue={urlParams.get('business_name') || ''} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="email" className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" defaultValue={urlParams.get('email') || ''} />
                    <input className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" defaultValue={urlParams.get('phone') || ''} />
                  </div>
                  <select className="rounded-xl border border-neutral-200 px-3 py-2 bg-white" defaultValue={urlParams.get('category') || ''}>
                    <option value="">Select category…</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Home Services">Home Services</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Restaurants">Restaurants</option>
                    <option value="Professional Services">Professional Services</option>
                  </select>
                  {/* TIER SELECTION - Free vs Featured Listing */}
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Listing Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* FREE TIER - Basic listing with essential business information */}
                      <label className="flex items-start p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50">
                        <input type="radio" name="tier" value="free" className="mt-1 mr-3" defaultChecked />
                        <div>
                          <div className="font-medium text-sm">Free Listing</div>
                          <div className="text-xs text-neutral-600">Basic business info, contact details, single image</div>
                        </div>
                      </label>
                      {/* FEATURED TIER - Premium listing with enhanced features */}
                      <label className="flex items-start p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50">
                        <input type="radio" name="tier" value="featured" className="mt-1 mr-3" />
                        <div>
                          <div className="font-medium text-sm">Featured Listing $97/year</div>
                          <div className="text-xs text-neutral-600">Multiple images, social links, booking system, priority placement</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <textarea className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="What's your biggest growth challenge?" rows={4} defaultValue={urlParams.get('challenge') || ''} />
                  <button className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">Submit Application</button>
                </form>
                {msg && <p className="mt-2 text-sm text-neutral-700">{msg}</p>}
                <p className="mt-2 text-xs text-neutral-500"></p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold tracking-tight">Get My Business Listed</h2>
                <p className="mt-2 text-sm text-neutral-700">You're signed in as a business. Share your business details below to get listed on Bonita Forward.</p>
                <CreateBusinessForm />
              </>
            )}
          </div>

          <div className="mt-10 rounded-2xl bg-neutral-50 border border-neutral-100 p-15 text-center">
            <h3 className="text-lg font-semibold">Bonita Residents Are Searching. Will They Find You?</h3>
            <a href="#apply" className="inline-block mt-3 rounded-full bg-neutral-900 text-white px-5 py-2.5 elevate">Get Started Today</a>
          </div>
        
      </Container>
    </section>
    </ScrollStack>
  )
}

// Utility function to fix malformed image URLs
function fixImageUrl(url: string): string {
  if (!url) return ''
  
  // If URL is already complete with extension, return as-is
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return url
  }
  
  // If URL ends with a filename but no extension, try common extensions
  if (url.includes('/business-images/')) {
    const baseUrl = url
    // For now, default to .jpg as it's most common
    return baseUrl + '.jpg'
  }
  
  return url
}

function BookPage() {
  const params = new URLSearchParams(window.location.search)
  const categoryKey = (params.get('category') as CategoryKey) || 'real-estate'
  const category = categories.find((c) => c.key === categoryKey)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Provider[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [claimAsk, setClaimAsk] = useState<Record<string, boolean>>({})
  // Removed contact toggle for top matches (always expanded)
  const answers = useMemo(() => {
    // First try to get filter answers from URL parameters (from CategoryFilters)
    const urlFilters = params.get('filters')
    if (urlFilters) {
      try {
        const parsedFilters = JSON.parse(decodeURIComponent(urlFilters))
        if (parsedFilters && typeof parsedFilters === 'object') {
          return parsedFilters
        }
      } catch (e) {
        console.warn('Failed to parse URL filters:', e)
      }
    }
    // Fallback to localStorage answers (from questionnaire)
    return getLocalStorageJSON<Record<string, string>>(`bf-tracking-${categoryKey}`, {})
  }, [categoryKey, params.get('filters')])
  const auth = useAuth()
  const isAdmin = isUserAdmin(auth.email)

  function recompute() {
    const ranked = scoreProviders(categoryKey, answers)
    const fallback = providersByCategory[categoryKey] || []
    setResults(ranked.length ? ranked : fallback)
  }

  useEffect(() => {
    recompute()
    // Always show results immediately - no authentication or form submission required
    setSubmitted(true)
  }, [categoryKey, answers])

  useProviderUpdates(() => { recompute() }, [categoryKey, answers])
  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl bg-white max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold tracking-tight">Bonita's top {category?.name.toLowerCase() || 'providers'}</h2>
          {auth.isAuthed || submitted || results.length > 0 ? (
            <div className="mt-5 text-left">
              <div className="mt-4 text-sm text-neutral-500">Top matches</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {results.slice(0, 3).map((r) => {
                  const d = getProviderDetails(r)
                  const canShowRich = Boolean(r.isMember)
                  return (
                    <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                      {/* Business Image with Overlays */}
                      <div className="relative mb-3">
                        {d.images && d.images.length > 0 ? (
                          <img 
                            src={fixImageUrl(d.images?.[0] || '')} 
                            alt={`${r.name} business photo`} 
                            className="w-full h-32 object-cover rounded-lg border border-neutral-100"
                            onError={(e) => {
                              console.warn(`[BookPage] Failed to load image for ${r.name}:`, fixImageUrl(d.images?.[0] || ''))
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = 'none'
                              img.parentElement!.innerHTML = `
                                <div class="w-full h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                                  <div class="text-center text-neutral-500">
                                    <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <p class="text-xs">No image available</p>
                                  </div>
                                </div>
                              `
                            }}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                            <div className="text-center text-neutral-500">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs">No image available</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Featured Badge - Top Right Over Image */}
                        {isFeaturedProvider(r) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Tag - Positioned between image and title, half on image */}
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm">
                            {r.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Business Name and Rating */}
                      <div className="flex items-center justify-between">
                        <Link to={`/provider/${r.slug}`} className="font-medium cursor-pointer hover:underline">
                          {r.name}
                        </Link>
                        <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                      </div>
                      
                      {/* Admin Tags */}
                      {isAdmin && r.tags && r.tags.length > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full">
                            {r.tags.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      )}
                      {isAdmin && (r.tags && r.tags.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-[11px]">{t}</span>
                          ))}
                        </div>
                      )}
                      {canShowRich && d.reviews && d.reviews.length > 0 && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Reviews</div>
                          <ul className="mt-1 space-y-1 text-sm">
                            {d.reviews.map((rv, idx) => (
                              <li key={idx} className="text-neutral-700">
                                <span className="text-neutral-500">{rv.author}</span> — {rv.rating.toFixed(1)}★ — {rv.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {canShowRich && d.posts && d.posts.length > 0 && (
                        <div className="mt-3">
                          <div className="font-medium text-sm">Related Posts</div>
                          <ul className="mt-1 list-disc list-inside text-sm">
                            {d.posts.map((ps) => (
                              <li key={ps.id}><a className="text-neutral-700 hover:underline" href={ps.url || '#'}>{ps.title}</a></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3 text-sm">
                        {d.phone && <div>📞 {d.phone}</div>}
                        {canShowRich && d.email && <div>✉️ {d.email}</div>}
                        {canShowRich && d.website && (
                          <div>🔗 <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                        )}
                        {d.address && <div>📍 {d.address}</div>}
                        <div className="mt-2 flex justify-end">
                          <button
                            title="Claim this business"
                            className="text-[11px] text-neutral-600 hover:text-neutral-900"
                            onClick={() => {
                              if (claimAsk[r.id]) {
                                const catLabel = ((): string => {
                                  switch (categoryKey) {
                                    case 'restaurants-cafes': return 'Restaurants'
                                    case 'home-services': return 'Home Services'
                                    case 'health-wellness': return 'Health & Wellness'
                                    case 'real-estate': return 'Real Estate'
                                    case 'professional-services': return 'Professional Services'
                                    default: return ''
                                  }
                                })()
                                const q = new URLSearchParams({
                                  business_name: r.name,
                                  email: d.email || '',
                                  phone: d.phone || '',
                                  challenge: `I would like to claim ${r.name}.`,
                                  category: catLabel,
                                })
                                window.location.assign(`/business?${q.toString()}#apply`)
                              } else {
                                setClaimAsk((m) => ({ ...m, [r.id]: true }))
                              }
                            }}
                          >
                            {claimAsk[r.id] ? 'Claim this business' : '🏢'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {results.length > 3 && (
                <>
                  <div className="mt-5 text-sm text-neutral-500">Other providers</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {results.slice(3).map((r) => {
                      const open = !!expanded[r.id]
                      const d = getProviderDetails(r)
                      return (
                        <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                          {/* Business Image */}
                          {d.images && d.images.length > 0 ? (
                            <div className="mb-3">
                              <img 
                                src={fixImageUrl(d.images?.[0] || '')} 
                                alt={`${r.name} business photo`} 
                                className="w-full h-24 object-cover rounded-lg border border-neutral-100"
                                onError={(e) => {
                                  console.warn(`[BookPage] Failed to load image for ${r.name}:`, fixImageUrl(d.images?.[0] || ''))
                                  const img = e.currentTarget as HTMLImageElement
                                  img.style.display = 'none'
                                  img.parentElement!.innerHTML = `
                                    <div class="w-full h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                                      <div class="text-center text-neutral-500">
                                        <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p class="text-xs">No image</p>
                                      </div>
                                    </div>
                                  `
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3 h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg border border-neutral-200 flex items-center justify-center">
                              <div className="text-center text-neutral-500">
                                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-xs">No image</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <Link to={`/provider/${r.slug}`} className="font-medium flex items-center gap-2 cursor-pointer hover:underline">
                              <div className="font-medium flex items-center gap-2">
                                {r.name}
                                {isFeaturedProvider(r) && (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">Featured</span>
                                )}
                              </div>
                            </Link>
                            <div className="text-xs text-neutral-500">{r.rating?.toFixed(1)}★</div>
                          </div>
                          {/* Show category and tags */}
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              {r.category_key.replace('-', ' ')}
                            </span>
                            {isAdmin && r.tags && r.tags.length > 0 && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full">
                                {r.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                          {isAdmin && (r.tags && r.tags.length > 0) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.tags.slice(0, 3).map((t) => (
                                <span key={t} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-[11px]">{t}</span>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setExpanded((e: Record<string, boolean>) => ({ ...e, [r.id]: !open }))} className="mt-2 text-sm rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5">{open ? 'Hide' : 'View'}</button>
                          <div className="collapsible mt-3 text-sm" data-open={open ? 'true' : 'false'}>
                              {r.isMember && d.reviews && d.reviews.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Reviews</div>
                                  <ul className="mt-1 space-y-1">
                                    {d.reviews.map((rv, idx) => (
                                      <li key={idx} className="text-neutral-700">
                                        <span className="text-neutral-500">{rv.author}</span> — {rv.rating.toFixed(1)}★ — {rv.text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.isMember && d.posts && d.posts.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Related Posts</div>
                                  <ul className="mt-1 list-disc list-inside">
                                    {d.posts.map((ps) => (
                                      <li key={ps.id}><a className="text-neutral-700 hover:underline" href={ps.url || '#'}>{ps.title}</a></li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="mt-2">
                                {d.phone && <div>📞 {d.phone}</div>}
                                {r.isMember && d.email && <div>✉️ {d.email}</div>}
                                {r.isMember && d.website && (
                                  <div>🔗 <a className="text-neutral-700 hover:underline" href={d.website} target="_blank" rel="noreferrer">{d.website}</a></div>
                                )}
                                {d.address && <div>📍 {d.address}</div>}
                                <div className="mt-2 flex justify-end">
                                  <button
                                    title="Claim this business"
                                    className="text-[11px] text-neutral-600 hover:text-neutral-900"
                                    onClick={() => {
                                      if (claimAsk[r.id]) {
                                        const catLabel = ((): string => {
                                          switch (categoryKey) {
                                            case 'restaurants-cafes': return 'Restaurants'
                                            case 'home-services': return 'Home Services'
                                            case 'health-wellness': return 'Health & Wellness'
                                            case 'real-estate': return 'Real Estate'
                                            case 'professional-services': return 'Professional Services'
                                            default: return ''
                                          }
                                        })()
                                        const q = new URLSearchParams({
                                          business_name: r.name,
                                          email: d.email || '',
                                          phone: d.phone || '',
                                          challenge: `I would like to claim ${r.name}.`,
                                          category: catLabel,
                                        })
                                        window.location.assign(`/business?${q.toString()}#apply`)
                                      } else {
                                        setClaimAsk((m) => ({ ...m, [r.id]: true }))
                                      }
                                    }}
                                  >
                                    {claimAsk[r.id] ? 'Claim this business' : '🏢'}
                                  </button>
                                </div>
                              </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 text-center">
              <p className="text-neutral-600">Loading the best {category?.name.toLowerCase() || 'providers'} for you...</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

function AppInit() {
  useEffect(() => {
    ;(async () => {
      const ok = await loadProvidersFromSupabase()
      if (!ok) await loadProvidersFromSheet()
    })()
    function onRefresh() {
      ;(async () => {
        const ok = await loadProvidersFromSupabase()
        if (!ok) await loadProvidersFromSheet()
      })()
    }
    window.addEventListener('bf-refresh-providers', onRefresh as EventListener)
    return () => {
      window.removeEventListener('bf-refresh-providers', onRefresh as EventListener)
    }
  }, [])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInit />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="signin" element={<SignInPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="community" element={<CommunityIndex />} />
            <Route path="community/:category" element={<CommunityPost />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="owner" element={
              <ProtectedRoute allowedRoles={['business']}>
                <OwnerPage />
              </ProtectedRoute>
            } />
            <Route path="my-business" element={
              <ProtectedRoute allowedRoles={['business']}>
                <MyBusinessPage />
              </ProtectedRoute>
            } />
            <Route path="pricing" element={
              <ProtectedRoute allowedRoles={['business']}>
                <PricingPage />
              </ProtectedRoute>
            } />
            <Route path="account" element={<AccountPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage />} />
            <Route path="provider/:id" element={<ProviderPage />} />
            <Route path="thank-you" element={<ThankYouPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
