import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

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
    
    // CRITICAL FIX: Redirect if we have an email and not loading (even if isAuthed is false)
    // This handles the case where profile is being set but isAuthed hasn't updated yet
    if (auth.email && !auth.loading) {
      console.log('[SignIn] User has email and not loading, redirecting...')
      
      // CRITICAL FIX: Reset busy state before redirect to prevent stuck button
      setBusy(false)
      
      const stored = (() => {
        try { return localStorage.getItem('bf-return-url') || null } catch { return null }
      })()
      const target = location?.state?.from || stored || '/'
      try { localStorage.removeItem('bf-return-url') } catch {}
      navigate(target, { replace: true })
    }
    // Fallback: Only redirect if fully authenticated and not loading
    else if (auth.isAuthed && !auth.loading) {
      console.log('[SignIn] User is authenticated, redirecting...')
      
      // CRITICAL FIX: Reset busy state before redirect to prevent stuck button
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
    
    // CRITICAL FIX: Prevent duplicate sign-in attempts if user is already authenticated
    // This prevents the stuck "Please wait" button when user is already signed in
    if (auth.isAuthed && !auth.loading) {
      console.log('[SignIn] User is already authenticated, redirecting instead of signing in again')
      const target = location?.state?.from || '/'
      navigate(target, { replace: true })
      return
    }
    
    // CRITICAL FIX: Also prevent sign-in if we have a profile but loading is false
    // This handles the case where profile is being set but not yet reflected in isAuthed
    if (auth.email && !auth.loading) {
      console.log('[SignIn] User profile exists but not fully authenticated yet, waiting for auth state to update')
      return
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
          
          // CRITICAL FIX: Add timeout to prevent infinite "Please wait" state
          // If redirect doesn't happen within 5 seconds, reset busy state
          setTimeout(() => {
            if (busy) {
              console.log('[SignIn] Timeout reached, resetting busy state')
              setBusy(false)
              setMessage('Sign-in completed but redirect is taking longer than expected. Please refresh the page.')
            }
          }, 5000)
          
          // Don't set busy to false here - let the redirect useEffect handle it
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

          const { error, session } = await auth.signUpWithEmail(email, password, name, accountType || undefined)
          
          console.log('[SignIn] Sign-up result:', {
            error: error,
            hasSession: !!session,
            sessionUser: session ? 'present' : 'none'
          })

          if (!error) {
            /**
             * SUCCESS CASE: Sign-up worked
             * 
             * User account was created successfully. Handle session and redirect.
             */
            console.log('[SignIn] Sign-up successful!')
            
            try {
              localStorage.removeItem('bf-signup-prefill')
              localStorage.setItem('bf-pending-profile', JSON.stringify({ name, email, role: accountType }))
            } catch {}

            if (!session) {
              /**
               * NO SESSION CASE: Email confirmation might be enabled
               * 
               * If Supabase email confirmation is enabled, sign-up succeeds but
               * no session is returned until user confirms email.
               */
              console.log('[SignIn] No session returned - email confirmation might be required')
              
              // Try sign-in to see if account is usable
              const { error: signInErr } = await auth.signInWithEmail(email, password)
              if (signInErr) {
                console.log('[SignIn] Sign-in failed after successful sign-up:', signInErr)
                setMessage('Account created. Please check your email to confirm your account, then sign in.')
                return
              } else {
                console.log('[SignIn] Sign-in successful after sign-up')
              }
            } else {
              console.log('[SignIn] Session returned with sign-up, user is immediately authenticated')
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




