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
    
    // Only redirect if fully authenticated and not loading
    if (auth.isAuthed && !auth.loading) {
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
  }, [auth.isAuthed, auth.loading, location?.state?.from, navigate])

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
    setBusy(true)

    try {
      if (mode === 'signin') {
        console.log('[SignIn] Attempting sign in with email:', email)
        const { error } = await auth.signInWithEmail(email, password)
        
        if (error) {
          console.log('[SignIn] Sign in error:', error)
          setMessage(error)
        } else {
          console.log('[SignIn] Sign in successful, waiting for redirect...')
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

          const { error, session } = await auth.signUpWithEmail(email, password, name, accountType || undefined)

          if (!error) {
            try {
              localStorage.removeItem('bf-signup-prefill')
              localStorage.setItem('bf-pending-profile', JSON.stringify({ name, email, role: accountType }))
            } catch {}

            if (!session) {
              // Fallback: try sign-in if no session returned (some configs)
              const { error: signInErr } = await auth.signInWithEmail(email, password)
              if (signInErr) {
                setMessage('Account created. Please sign in to continue.')
                return
              }
            }

            // Redirect based on account type
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
            
            // Check for specific "user already exists" error from Supabase
            if (emsg.includes('user_already_exists') || emsg.includes('user already exists') || emsg.includes('already registered')) {
              console.log('[SignIn] User already exists, this is a password/sign-in issue')
              setMessage('An account with this email already exists. Please sign in instead or reset your password if you forgot it.')
              // Switch to sign-in mode so user can try signing in
              setMode('signin')
            } else {
              // For all other errors (weak password, invalid email, etc.), show the actual error
              console.log('[SignIn] Sign-up failed with error:', error)
              setMessage(error)
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
            {mode === 'signup' && 'Create your account'}
            {mode === 'reset' && 'Reset your password'}
          </h1>

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
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
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
                <button onClick={() => setMode('signup')} className="underline">Create account</button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <button onClick={() => setMode('signin')} className="underline">Back to sign in</button>
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




