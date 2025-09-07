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

  useEffect(() => {
    // If no session, send to signin
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user?.email) navigate('/signin', { replace: true })
    })
  }, [navigate])

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
      navigate(role === 'business' ? '/business' : '/', { replace: true })
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


