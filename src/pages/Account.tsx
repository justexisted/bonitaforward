import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function AccountPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setEmail(auth.email || '')
    setName(auth.name || '')
  }, [auth.email, auth.name])

  async function saveProfile() {
    setBusy(true)
    setMessage(null)
    try {
      if (!auth.userId) return
      // Update email (triggers confirmation email from Supabase)
      if (email && email !== auth.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) {
          setMessage(error.message)
          setBusy(false)
          return
        }
      }
      // Update display name in user metadata
      if (name && name !== auth.name) {
        const { error } = await supabase.auth.updateUser({ data: { name } })
        if (error) {
          setMessage(error.message)
          setBusy(false)
          return
        }
      }
      setMessage('Saved. You may need to verify email if it was changed.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? This action cannot be undone.')) return
    setBusy(true)
    setMessage(null)
    try {
      // On client plans, direct user deletion typically requires admin/service role via edge function.
      // Fall back to support email for deletion request, but try sign-out to ensure session cleared.
      await supabase.auth.signOut()
      setMessage('Account deletion request received. Please email bonitaforward@gmail.com to finalize deletion.')
    } finally {
      setBusy(false)
    }
  }

  if (!auth.isAuthed) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">Please sign in to manage your account.</div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-xl font-semibold tracking-tight">Account</h1>
          {message && <div className="mt-2 text-sm text-neutral-700">{message}</div>}

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-neutral-600">Display Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="you@example.com" />
            </div>
            <button disabled={busy} onClick={saveProfile} className="rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Save Changes'}</button>
          </div>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="text-sm text-neutral-700 font-medium">Delete Account</div>
            <p className="text-xs text-neutral-500 mt-1">This will permanently remove your account and access. For compliance, final deletion will be confirmed via email.</p>
            <button disabled={busy} onClick={deleteAccount} className="mt-2 rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete Account</button>
          </div>
        </div>
      </div>
    </section>
  )
}


