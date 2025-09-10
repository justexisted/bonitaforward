import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'business' | 'community' | ''>('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Handle OAuth callback if present
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        
        if (accessToken) {
          console.log('OAuth callback detected, processing...')
          // Let Supabase handle the OAuth session
          await new Promise(resolve => setTimeout(resolve, 1000)) // Give time for session to be established
        }

        // Check for session
        const { data } = await supabase.auth.getSession()
        
        if (!data.session?.user?.email) {
          console.log('No session found, redirecting to signin')
          navigate('/signin', { replace: true })
        } else {
          console.log('Session found for:', data.session.user.email)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing onboarding:', error)
        navigate('/signin', { replace: true })
      }
    }

    initializeOnboarding()
  }, [navigate])

  if (loading) {
    return (
      <section className="py-10">
        <div className="container-px mx-auto max-w-md">
          <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
              <p className="mt-4 text-neutral-600">Setting up your account...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!role) { setMessage('Choose account type'); return }
    if (!password || password.length < 8) { setMessage('Use at least 8 characters'); return }
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    setBusy(true)
    try {
      // Set password
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) { setMessage(pwErr.message); return }
      // Set role in profile
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id
      const email = sess.session?.user?.email
      if (userId && email) {
        await supabase.from('profiles').upsert([{ id: userId, email, role }], { onConflict: 'id' })
      }
      // Redirect to saved location or appropriate default
      const savedUrl = (() => {
        try { return localStorage.getItem('bf-return-url') } catch { return null }
      })()
      try { localStorage.removeItem('bf-return-url') } catch {}

      const target = savedUrl || (role === 'business' ? '/business' : '/')
      navigate(target, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="py-10">
      <div className="container-px mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
          <h1 className="text-xl font-semibold tracking-tight text-center">Complete your account</h1>
          {message && <div className="mt-2 text-sm text-red-600 text-center">{message}</div>}
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-neutral-600">Account Type</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                <option value="">Select…</option>
                <option value="business">I have a business</option>
                <option value="community">I am a community member</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Set Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <button disabled={busy} className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Finish'}</button>
          </form>
        </div>
      </div>
    </section>
  )
}


