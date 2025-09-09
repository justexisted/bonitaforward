import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [validRecovery, setValidRecovery] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const type = params.get('type')
    const accessToken = params.get('access_token')

    if (type === 'recovery' && accessToken) {
      // Always allow the reset form, even if there’s an existing session
      setValidRecovery(true)
    }
    // If user arrived from email link, Supabase should have created a session
    // We don't auto-redirect; wait for user to set a new password
    // No-op here, but we could validate presence of a session if needed
  }, [location.search])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!password || password.length < 8) { setMessage('Use at least 8 characters.'); return }
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setMessage(error.message); return }
      // Force logout and send user to sign-in afterwards
      await supabase.auth.signOut()
      navigate('/signin', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="py-10">
      <div className="container-px mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
          <h1 className="text-xl font-semibold tracking-tight text-center">Set a new password</h1>
          {message && <div className="mt-2 text-sm text-red-600 text-center">{message}</div>}
          {validRecovery ? (
          <form onSubmit={handleUpdate} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm text-neutral-600">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <button disabled={busy} className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Update Password'}</button>
          </form>
          ) : (
            <div className="mt-4 text-sm text-neutral-600 text-center">
              This link is invalid or has expired. Please request a new password reset link.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


