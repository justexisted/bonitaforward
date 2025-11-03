/**
 * DEPENDENCY TRACKING
 *
 * WHAT THIS DEPENDS ON:
 * - AuthContext (useAuth): Provides signUpWithEmail, signInWithEmail methods
 *   → CRITICAL: Must use auth.signUpWithEmail() to ensure proper signup flow
 *   → CRITICAL: AuthContext handles session management after signup
 * - localStorage ('bf-pending-profile'): Stores signup data temporarily
 *   → CRITICAL: Must save name, email, role, resident verification to this key
 *   → CRITICAL: Key must be 'bf-pending-profile' (read by AuthContext and Onboarding.tsx)
 *   → CRITICAL: Format must match: { name, email, role, is_bonita_resident, resident_verification_method, ... }
 * - localStorage ('bf-return-url'): Stores redirect URL after signup/login
 *   → CRITICAL: Used to redirect users after authentication
 *   → CRITICAL: Must be removed after use to prevent stale redirects
 * - residentVerification utils (verifyByZipCode, verifyBySelfDeclaration): Resident verification logic
 *   → CRITICAL: Must return valid verification data matching VerificationMethod type
 *   → CRITICAL: ZIP codes must match expected Bonita ZIP codes (91902, 91908, 91909)
 * - Supabase auth: Provides password reset functionality
 *   → CRITICAL: resetPasswordForEmail() must work for password reset flow
 * - React Router (useNavigate, useLocation): Navigation after signup/login
 *   → CRITICAL: Redirects to onboarding, account page, or saved return URL
 *
 * WHAT DEPENDS ON THIS:
 * - Onboarding.tsx: Reads 'bf-pending-profile' from localStorage to get signup data
 *   → CRITICAL: If localStorage format changes, Onboarding.tsx breaks
 *   → CRITICAL: If localStorage key changes, Onboarding.tsx can't find signup data
 * - AuthContext.tsx: Reads 'bf-pending-profile' during SIGNED_IN event
 *   → CRITICAL: If localStorage format changes, auth context can't retrieve name/role
 *   → CRITICAL: If localStorage key changes, signup data is lost
 * - profileUtils.ts: getNameFromMultipleSources() reads from 'bf-pending-profile'
 *   → CRITICAL: If localStorage key changes, name retrieval fails
 * - All signup flows: Depend on correct localStorage format and key
 *   → CRITICAL: Wrong format causes incomplete profiles in database
 *
 * BREAKING CHANGES:
 * - If you change localStorage key ('bf-pending-profile') → Onboarding.tsx, AuthContext, profileUtils break
 * - If you change localStorage format → Onboarding.tsx, AuthContext can't parse signup data
 * - If you change auth.signUpWithEmail() API → Signup flow breaks
 * - If you change resident verification format → Incomplete resident verification data saved
 * - If you change redirect logic → Users land on wrong page after signup
 *
 * HOW TO SAFELY UPDATE:
 * 1. Check ALL consumers of 'bf-pending-profile': grep -r "bf-pending-profile" src/
 * 2. Verify localStorage format matches what Onboarding.tsx and AuthContext expect
 * 3. Test complete signup flow: SignIn.tsx → Onboarding.tsx → Admin panel
 * 4. Test business account signup (name, role, resident verification must be saved)
 * 5. Test community account signup (name, role, resident verification must be saved)
 * 6. Test OAuth signup flow (redirects correctly)
 * 7. Test password reset flow (email sent correctly)
 * 8. Verify admin panel shows complete profile data after signup
 * 9. Check that 'bf-pending-profile' is removed after use (don't leave stale data)
 *
 * RELATED FILES:
 * - src/contexts/AuthContext.tsx: Reads 'bf-pending-profile' during SIGNED_IN event
 * - src/pages/Onboarding.tsx: Reads 'bf-pending-profile' to complete signup
 * - src/utils/profileUtils.ts: getNameFromMultipleSources() reads from 'bf-pending-profile'
 * - src/utils/residentVerification.ts: Provides verifyByZipCode() and verifyBySelfDeclaration()
 * - docs/prevention/DATA_INTEGRITY_PREVENTION.md: Prevention guide for missing fields
 *
 * RECENT BREAKS:
 * - Missing name during signup (2025-01-XX): localStorage format didn't include name
 *   → Fix: Ensured name is always saved to 'bf-pending-profile'
 *   → Lesson: Always include ALL fields (name, email, role, resident verification) in localStorage
 *
 * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { verifyByZipCode, verifyBySelfDeclaration, type VerificationMethod } from '../utils/residentVerification'

/**
 * SignIn page: modern, minimal auth screen with
 * - Email/password sign in
 * - Google OAuth option
 * - Create account and Forgot password flows
 */
// Debug component for testing authentication state
function AuthDebugInfo() {
  const auth = useAuth()

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs font-mono max-w-xs">
        <div>Auth: {auth.isAuthed ? '✅' : '❌'}</div>
        <div>Loading: {auth.loading ? '⏳' : '✅'}</div>
        <div>Email: {auth.email || 'none'}</div>
        <div>Role: {auth.role || 'none'}</div>
        <div>UserId: {auth.userId ? 'set' : 'none'}</div>
      </div>
    )
  }
  return null
}

export default function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accountType, setAccountType] = useState<'business' | 'community' | ''>('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  // Bonita resident verification fields
  const [zipCode, setZipCode] = useState('')
  const [isBonitaResident, setIsBonitaResident] = useState(false)
  // Email preferences fields
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true) // Default to true - both preselected
  const [marketingEmailsEnabled, setMarketingEmailsEnabled] = useState(true) // Default to true - both preselected

  const handleResetPassword = async () => {
    if (!email) { setMessage('Enter your email'); return }

    setBusy(true)
    setMessage(null)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) setMessage(error.message)
      else setMessage('Check your email for the reset link')
    } catch (err) {
      console.error('Reset password error:', err)
      setMessage('Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  /**
   * CRITICAL FIX: Auto-redirect authenticated users
   * 
   * Issue: User was already signed in from previous session but stuck on sign-in page.
   * 
   * Fix: Check both auth.isAuthed AND !auth.loading to ensure we have complete
   * auth state before redirecting. This prevents redirect during auth initialization.
   */
  useEffect(() => {
    console.log('[SignIn] Auth state check:', { isAuthed: auth.isAuthed, loading: auth.loading, email: auth.email })
    
    // Only redirect if we have a specific return URL or if user was redirected here from another page
    // Don't redirect if user navigated directly to /signin (like from "Join Community" button)
    const hasReturnUrl = location?.state?.from || localStorage.getItem('bf-return-url')
    
    if (hasReturnUrl && auth.email && !auth.loading) {
      console.log('[SignIn] User has email, not loading, and return URL - redirecting...')
      
      setBusy(false)
      
      const stored = (() => {
        try { return localStorage.getItem('bf-return-url') || null } catch { return null }
      })()
      const target = location?.state?.from || stored || '/'
      try { localStorage.removeItem('bf-return-url') } catch {}
      navigate(target, { replace: true })
    }
    // Only redirect authenticated users if they have a return URL
    else if (hasReturnUrl && auth.isAuthed && !auth.loading) {
      console.log('[SignIn] User is authenticated with return URL - redirecting...')
      
      setBusy(false)
      
      const stored = (() => {
        try { return localStorage.getItem('bf-return-url') || null } catch { return null }
      })()
      const target = location?.state?.from || stored || '/'
      try { localStorage.removeItem('bf-return-url') } catch {}
      navigate(target, { replace: true })
    }
  }, [auth.isAuthed, auth.loading, auth.email, location?.state?.from, navigate])

  // CRITICAL FIX: Cleanup effect to reset busy state on unmount
  useEffect(() => {
    return () => {
      setBusy(false)
    }
  }, [])

  /**
   * CRITICAL FIX: Sign-in form submission
   * 
   * Issue: Button got stuck on "Please wait" even when sign-in succeeded.
   * 
   * Root cause: The auth state change event fired, but the local busy state
   * wasn't being reset because the component didn't know sign-in was complete.
   * 
   * Fix: Ensure setBusy(false) is always called, and add success handling.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    
    // Only prevent sign-in if user is already authenticated AND they have a return URL
    // This allows users to access the sign-in page even if authenticated (for account switching, etc.)
    const hasReturnUrl = location?.state?.from || localStorage.getItem('bf-return-url')
    if (auth.isAuthed && !auth.loading && hasReturnUrl) {
      console.log('[SignIn] User is already authenticated with return URL, redirecting instead of signing in again')
      const target = location?.state?.from || '/'
      navigate(target, { replace: true })
      return
    }
    
    // Also prevent sign-in if we have a profile, loading is false, AND there's a return URL
    if (auth.email && !auth.loading && hasReturnUrl) {
      console.log('[SignIn] User already has a profile with return URL, redirecting instead of signing in again')
      const target = location?.state?.from || '/'
      navigate(target, { replace: true })
      return
    }
    
    // If user has a profile but no return URL, allow them to stay on sign-in page
    if (auth.email && !auth.loading) {
      console.log('[SignIn] User profile exists but no return URL, allowing access to sign-in page')
    }
    
    setBusy(true)

    try {
      if (mode === 'signin') {
        console.log('[SignIn] Attempting sign in with email:', email)
        const { error } = await auth.signInWithEmail(email, password)
        
        if (error) {
          console.log('[SignIn] Sign in error:', error)
          setMessage(error)
          setBusy(false) // CRITICAL FIX: Reset busy state on error
        } else {
          console.log('[SignIn] Sign in successful, waiting for redirect...')

          // Prefer an explicit redirect even without a stored return URL
          const stored = (() => {
            try { return localStorage.getItem('bf-return-url') || null } catch { return null }
          })()
          const target = location?.state?.from || stored || '/account'
          try { localStorage.removeItem('bf-return-url') } catch {}

          // Navigate immediately; auth context will settle shortly after
          setBusy(false)
          navigate(target, { replace: true })
          return
        }
      } else if (mode === 'signup') {
        if (password !== confirm) {
          setMessage('Passwords do not match')
        } else {
          if (!accountType) {
            setMessage('Please select an account type')
            return
          }

          /**
           * CRITICAL DEBUG: Sign-up process investigation
           * 
           * Issue: Supabase claims user already exists before user is actually created.
           * This can happen due to email confirmation settings in Supabase.
           * 
           * Possible causes:
           * 1. Email confirmation is enabled - user gets created but unconfirmed
           * 2. Previous failed sign-up left unconfirmed user in database
           * 3. Supabase auth settings are misconfigured
           * 
           * Adding extensive logging to understand the exact flow.
           */
          console.log('[SignIn] Starting sign-up process for:', email)
          console.log('[SignIn] Account type selected:', accountType)
          console.log('[SignIn] Password length:', password.length)

          const signupResult = await auth.signUpWithEmail(email, password, name, accountType || undefined)
          const { error, session, user } = signupResult
          
          // Get user ID from signup result (Supabase returns user even without session when email confirmation is enabled)
          const userId = user?.id || session?.user?.id
          
          console.log('[SignIn] Sign-up result:', {
            error: error,
            hasSession: !!session,
            userId: userId || 'none',
            sessionUser: session ? 'present' : 'none'
          })

          if (!error && userId) {
            /**
             * SUCCESS CASE: Sign-up worked
             * 
             * User account was created successfully. Handle session and redirect.
             */
            console.log('[SignIn] Sign-up successful!')
            
            try {
              localStorage.removeItem('bf-signup-prefill')
              
              // Handle Bonita resident verification
              let verificationData: {
                is_bonita_resident?: boolean
                resident_verification_method?: VerificationMethod
                resident_zip_code?: string | null
                resident_verified_at?: string | null
              } = {}

              if (isBonitaResident) {
                if (zipCode.trim()) {
                  const zipResult = verifyByZipCode(zipCode)
                  if (zipResult.isBonitaResident) {
                    verificationData = {
                      is_bonita_resident: true,
                      resident_verification_method: 'zip-verified',
                      resident_zip_code: zipResult.zipCode,
                      resident_verified_at: zipResult.verifiedAt || new Date().toISOString()
                    }
                  } else {
                    const selfResult = verifyBySelfDeclaration(zipCode)
                    verificationData = {
                      is_bonita_resident: true,
                      resident_verification_method: 'self-declared',
                      resident_zip_code: selfResult.zipCode,
                      resident_verified_at: selfResult.verifiedAt || new Date().toISOString()
                    }
                  }
                } else {
                  const selfResult = verifyBySelfDeclaration()
                  verificationData = {
                    is_bonita_resident: true,
                    resident_verification_method: 'self-declared',
                    resident_zip_code: null,
                    resident_verified_at: selfResult.verifiedAt || new Date().toISOString()
                  }
                }
              }
              
              localStorage.setItem('bf-pending-profile', JSON.stringify({
                name,
                email,
                role: accountType,
                ...verificationData,
                // Email preferences from signup form
                email_notifications_enabled: emailNotificationsEnabled,
                marketing_emails_enabled: marketingEmailsEnabled
              }))
            } catch {}

            if (!session) {
              /**
               * NO SESSION CASE: Email confirmation might be enabled
               * 
               * If Supabase email confirmation is enabled, sign-up succeeds but
               * no session is returned until user confirms email.
               */
              console.log('[SignIn] No session returned - email confirmation might be required')
              
              // Send verification email via our custom system
              // User ID should be available from signup result
              if (userId) {
                try {
                  console.log('[SignIn] Sending custom verification email...')
                  const emailResponse = await fetch('/.netlify/functions/send-verification-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId,
                      email: email,
                      name,
                    }),
                  })
                  
                  if (emailResponse.ok) {
                    console.log('[SignIn] Verification email sent successfully')
                    setMessage('Account created successfully! Please check your email to verify your account. Once verified, you can sign in.')
                  } else {
                    const errorData = await emailResponse.json().catch(() => ({}))
                    console.warn('[SignIn] Failed to send verification email:', errorData)
                    setMessage('Account created successfully! You can resend the verification email from your account page.')
                  }
                } catch (emailError) {
                  console.warn('[SignIn] Error sending verification email:', emailError)
                  setMessage('Account created successfully! You can resend the verification email from your account page.')
                }
              } else {
                setMessage('Account created successfully! Please check your email to verify your account.')
              }
              return
            } else {
              console.log('[SignIn] Session returned with sign-up, user is immediately authenticated')
            }

            // Send verification email via our custom system
            // We do this after signup, even if Supabase returned a session
            // because we're using our custom verification system, not Supabase's
            // User ID should be available from signup result or session
            const finalUserId = userId || session?.user?.id
            if (finalUserId) {
              try {
                console.log('[SignIn] Sending custom verification email...')
                const emailResponse = await fetch('/.netlify/functions/send-verification-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: finalUserId,
                    email: email,
                    name,
                  }),
                })
                
                if (emailResponse.ok) {
                  const result = await emailResponse.json()
                  console.log('[SignIn] Verification email sent successfully:', result)
                } else {
                  const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
                  console.warn('[SignIn] Failed to send verification email:', errorData)
                  // Show user-friendly message if table doesn't exist
                  if (errorData.error?.includes('table not found') || errorData.error?.includes('migration')) {
                    console.warn('[SignIn] Email verification system not set up. Please run SQL migrations.')
                  }
                }
              } catch (emailError: any) {
                console.warn('[SignIn] Error sending verification email:', emailError)
                // Don't block signup if email fails - user can resend later
              }
            }

            // Redirect based on account type
            console.log('[SignIn] Redirecting to account page')
            const redirectPath = accountType === 'business' ? '/account' : '/account'
            navigate(redirectPath, { replace: true })
          } else {
            /**
             * CRITICAL FIX: Overly aggressive "email already exists" detection
             * 
             * Issue: The code assumes ANY sign-up error means email already exists,
             * then tries to sign in, and if that fails, shows "email may already exist."
             * This is wrong because sign-up can fail for many reasons:
             * - Invalid email format
             * - Password too weak  
             * - Network issues
             * - Server errors
             * 
             * Fix: Only treat it as "email exists" if the error message specifically
             * mentions email being taken. For other errors, show the actual error.
             */
            /**
             * PRECISE FIX: Handle actual Supabase error scenarios
             * 
             * Based on network logs, Supabase returns specific error patterns:
             * - Sign-up fails with "user_already_exists" (422 status)
             * - Sign-in attempt fails with "invalid_credentials" (400 status)
             * 
             * This means email exists but password is wrong.
             * 
             * Fix: Handle this specific case and provide clear guidance.
             */
            console.log('[SignIn] Sign-up error:', error)
            const emsg = String(error || '').toLowerCase()
            
            /**
             * COMPREHENSIVE ERROR HANDLING: Handle all Supabase sign-up scenarios
             * 
             * Supabase can return MANY variations of "email already in use":
             * - "user_already_exists"
             * - "user already exists"  
             * - "user already registered" ← ADDED
             * - "already registered" ← ADDED
             * - "email already in use" ← ADDED
             * - "email is already registered" ← ADDED
             * - And potentially more...
             * 
             * The previous code only checked for 2 variations, so "user already registered"
             * fell through to "unknown error" and showed the raw Supabase message.
             * 
             * FIX: Use comprehensive pattern matching to catch ALL variations.
             */
            
            console.log('[SignIn] ========================================')
            console.log('[SignIn] Sign-up error received from Supabase:')
            console.log('[SignIn] Error message:', error)
            console.log('[SignIn] Lowercase message:', emsg)
            console.log('[SignIn] ========================================')
            
            // Check for ANY variation of "user/email already exists/registered/in use"
            const isEmailTaken = 
              emsg.includes('already') && (
                emsg.includes('exist') || 
                emsg.includes('register') || 
                emsg.includes('in use') ||
                emsg.includes('taken')
              )
            
            if (isEmailTaken) {
              console.log('[SignIn] ✓ Detected: Email already in use (registered/exists/taken)')
              console.log('[SignIn] This could be:')
              console.log('[SignIn]   1. A fully registered confirmed account')
              console.log('[SignIn]   2. An unconfirmed account from a previous signup')
              console.log('[SignIn] Advising user to try signing in or check email for confirmation')
              
              setMessage('An account with this email already exists. Try signing in, or check your email for a confirmation link from a previous signup attempt.')
              setMode('signin')
            } 
            else if (emsg.includes('email_not_confirmed') || emsg.includes('not confirmed') || emsg.includes('confirm')) {
              console.log('[SignIn] ✓ Detected: Email not confirmed')
              setMessage('Please check your email and click the confirmation link, then try signing in.')
              setMode('signin')
            }
            else if (emsg.includes('signup_disabled') || emsg.includes('disabled')) {
              console.log('[SignIn] ✓ Detected: Signups disabled')
              setMessage('Account creation is currently disabled. Please contact support.')
            }
            else if (emsg.includes('password') && !emsg.includes('reset')) {
              console.log('[SignIn] ✓ Detected: Password validation error')
              setMessage(error) // Show specific password error (e.g., "password must be at least 6 characters")
            }
            else if (emsg.includes('email') && emsg.includes('invalid')) {
              console.log('[SignIn] ✓ Detected: Invalid email format')
              setMessage('Please enter a valid email address.')
            }
            else if (emsg.includes('rate limit')) {
              console.log('[SignIn] ✓ Detected: Rate limit')
              setMessage('Too many signup attempts. Please wait a few minutes and try again.')
            }
            else {
              // For truly unknown errors, show comprehensive info
              console.error('[SignIn] ❌ UNHANDLED SIGN-UP ERROR')
              console.error('[SignIn] Please report this error:')
              console.error('[SignIn] Raw error:', error)
              console.error('[SignIn] Error type:', typeof error)
              
              setMessage(`Sign-up error: ${error}. If this persists, please contact support.`)
            }
          }
        }
      }
    } catch (err) {
      console.error('Submit error:', err)
      setMessage('Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await auth.signInWithGoogle()
    } catch (err: any) {
      setMessage(err?.message || 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  // Prefill from query params or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(location?.search || '')
      const qMode = params.get('mode')
      const qEmail = params.get('email')
      const qName = params.get('name')
      const qType = params.get('type')
      if (qMode === 'signup') setMode('signup')
      if (qEmail) setEmail(qEmail)
      if (qName) setName(qName)
      if (qType === 'business' || qType === 'community') setAccountType(qType)
      if (!qEmail || !qName) {
        const raw = localStorage.getItem('bf-signup-prefill')
        if (raw) {
          const pref = JSON.parse(raw) as { name?: string; email?: string }
          if (!qName && pref?.name) setName(pref.name)
          if (!qEmail && pref?.email) setEmail(pref.email)
        }
      }
    } catch {}
  }, [location?.search])

  return (
    <section className="py-10">
      <div className="container-px mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
          <h1 className="text-xl font-semibold tracking-tight text-center">
            {mode === 'signin' && 'Sign in to Bonita Forward'}
            {mode === 'signup' && 'Sign up for Bonita Forward'}
            {mode === 'reset' && 'Reset your password'}
          </h1>
          {mode === 'signup' && (
            <p className="text-sm text-neutral-600 text-center mt-2">
              Create your free account to vote on events, save businesses, and connect with the Bonita community
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-neutral-600">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2"
                  placeholder="Your name"
                />
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-neutral-600">Account Type</label>
                <select
                  required
                  value={accountType}
                  onChange={(e) => setAccountType((e.target.value as any) || '')}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 bg-white"
                >
                  <option value="">Select…</option>
                  <option value="business">I have a business</option>
                  <option value="community">I am a community member</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm text-neutral-600">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-neutral-600">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Bonita Resident Verification */}
            {mode === 'signup' && (
              <div className="pt-2 border-t border-neutral-200">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="is-bonita-resident-signup"
                    checked={isBonitaResident}
                    onChange={(e) => setIsBonitaResident(e.target.checked)}
                    className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
                  />
                  <label htmlFor="is-bonita-resident-signup" className="text-sm text-neutral-700 cursor-pointer">
                    I am a Bonita resident
                  </label>
                </div>
                
                {isBonitaResident && (
                  <div className="ml-7 mb-3">
                    <label className="block text-sm text-neutral-600 mb-1">
                      ZIP Code (optional)
                    </label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="91902"
                      maxLength={10}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Valid Bonita ZIP codes: 91902, 91908, 91909
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Email Preferences */}
            {mode === 'signup' && (
              <div className="pt-2 border-t border-neutral-200 space-y-3">
                <p className="text-sm font-medium text-neutral-700 mb-2">Email Preferences</p>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="email-notifications-signup"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
                  />
                  <label htmlFor="email-notifications-signup" className="text-sm text-neutral-700 cursor-pointer flex-1">
                    I would like to receive email notifications about my account, bookings, and important updates
                  </label>
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing-emails-signup"
                    checked={marketingEmailsEnabled}
                    onChange={(e) => setMarketingEmailsEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
                  />
                  <label htmlFor="marketing-emails-signup" className="text-sm text-neutral-700 cursor-pointer flex-1">
                    I would like to receive marketing emails about events, promotions, and community news
                  </label>
                </div>
                
                <p className="text-xs text-neutral-500 ml-7">
                  You can change these preferences anytime in your account settings.
                </p>
              </div>
            )}

            {message && (
              <div className="text-sm text-red-600">{message}</div>
            )}

            {mode !== 'reset' && (
              <button
                disabled={busy}
                type="submit"
                className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
              </button>
            )}
          </form>

          {mode !== 'reset' && clientId && (
            <>
              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                <div className="h-px flex-1 bg-neutral-200"></div>
                <span>or</span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full rounded-full bg-white border border-neutral-200 text-neutral-900 py-2.5 hover:bg-neutral-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="mt-4 text-center text-sm text-neutral-600">
            {mode === 'signin' && (
              <>
                <button onClick={handleResetPassword} className="underline">Forgot password?</button>
                <span className="mx-2">·</span>
                <button onClick={() => setMode('signup')} className="underline">Sign up</button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <button onClick={() => setMode('signin')} className="underline">Already have an account? Sign in</button>
              </>
            )}
            {mode === 'reset' && (
              <>
                <button onClick={() => setMode('signin')} className="underline">Back to sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
      <AuthDebugInfo />
    </section>
  )
}




