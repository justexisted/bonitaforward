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

  // If already authenticated, redirect away from Sign In
  useEffect(() => {
    if (auth.isAuthed) {
      const stored = (() => {
        try { return localStorage.getItem('bf-return-url') || null } catch { return null }
      })()
      const target = location?.state?.from || stored || '/'
      try { localStorage.removeItem('bf-return-url') } catch {}
      navigate(target, { replace: true })
    }
  }, [auth.isAuthed, location?.state?.from, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await auth.signInWithEmail(email, password)
        if (error) setMessage(error)
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
            const params = new URLSearchParams(location?.search || '')
            const next = params.get('next') || (() => { try { return localStorage.getItem('bf-return-url') } catch { return null } })() || '/thank-you'
            navigate(next, { replace: true })
          } else {
            const emsg = String(error || '').toLowerCase()
            if (emsg.includes('already') || emsg.includes('registered') || emsg.includes('exists')) {
              // Try signing in directly with the provided password
              const { error: signInErr } = await auth.signInWithEmail(email, password)
              if (!signInErr) {
                const params = new URLSearchParams(location?.search || '')
                const next = params.get('next') || (() => { try { return localStorage.getItem('bf-return-url') } catch { return null } })() || '/thank-you'
                navigate(next, { replace: true })
              } else {
                // Guide the user to reset password if sign-in failed
                setMode('reset')
                setMessage('This email already has an account. Reset your password to continue.')
              }
            } else {
              setMessage(error)
            }
          }
        }
      } else if (mode === 'reset') {
        const { error } = await auth.resetPassword(email)
        if (!error) setMessage('Check your email for a password reset link')
        else setMessage(error)
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!clientId) return
    const google = (window as any).google
    if (!google || !google.accounts || !google.accounts.id) return

    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      callback: async (response: { credential: string }) => {
        try {
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.credential })
          if (error) {
            setMessage(error.message || 'Google sign-in failed')
          }
        } catch (err: any) {
          setMessage(err?.message || 'Google sign-in failed')
        }
      },
    })
    const container = document.getElementById('google-btn')
    if (container) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
      })
    }
    // Do NOT auto-open One Tap; only show when user clicks the button above
  }, [clientId])

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

            <button disabled={busy} className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate">
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="mt-3">
                <div id="google-btn" className="flex justify-center"></div>
              </div>
              <div className="my-3 flex items-center gap-3 text-xs text-neutral-400">
                <div className="h-px flex-1 bg-neutral-200"></div>
                <span>or</span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => auth.signInWithGoogle()}
                className="hidden w-full rounded-full border border-neutral-200 bg-white text-neutral-900 py-2.5 hover:bg-neutral-50 elevate"
              >
                Continue with Google
              </button>
            </>
          )}

          <div className="mt-4 text-center text-sm text-neutral-600">
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('reset')} className="underline">Forgot password?</button>
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
    </section>
  )
}




