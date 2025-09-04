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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  // If already authenticated, redirect away from Sign In
  useEffect(() => {
    if (auth.isAuthed) {
      const target = location?.state?.from || '/'
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
          const { error } = await auth.signUpWithEmail(email, password)
          if (!error) setMessage('Check your email to confirm your account')
          else setMessage(error)
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
    // @ts-expect-error: google injected by GIS script
    const google = (window as any).google
    if (!google || !google.accounts || !google.accounts.id) return

    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      callback: async (response: { credential: string }) => {
        try {
          const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.credential })
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
            <div className="mt-3">
              <div id="google-btn" className="flex justify-center"></div>
            </div>
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




