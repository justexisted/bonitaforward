import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Link } from 'react-router-dom'

export default function AccountPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ownedProviders, setOwnedProviders] = useState<{ id: string; name: string }[]>([])
  const [pendingApps, setPendingApps] = useState<{ id: string; business_name: string | null; created_at: string }[]>([])
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    setEmail(auth.email || '')
    setName(auth.name || '')
    async function loadOwned() {
      if (!auth.userId) { setOwnedProviders([]); return }
      try {
        // Load providers owned by user OR claimable by email
        const { data: prov } = await supabase
          .from('providers')
          .select('id,name,email,owner_user_id')
          .or(`owner_user_id.eq.${auth.userId},owner_user_id.is.null`)
          .order('name', { ascending: true })
        const normalize = (s?: string | null) => String(s || '').trim().toLowerCase()
        const userEmail = normalize(auth.email)
        const rows = ((prov as any[]) || []).filter((r) => r.owner_user_id === auth.userId || (!r.owner_user_id && normalize(r.email) && normalize(r.email) === userEmail))
        setOwnedProviders(rows.map((r) => ({ id: r.id, name: r.name })))
        // Load pending business applications for this email
        if (auth.email) {
          const { data: apps } = await supabase
            .from('business_applications')
            .select('id,business_name,created_at,email')
            .eq('email', auth.email)
            .order('created_at', { ascending: false })
            .limit(10)
          setPendingApps(((apps as any[]) || []).map((r) => ({ id: r.id, business_name: r.business_name, created_at: r.created_at })))
        } else {
          setPendingApps([])
        }
        // Load profile role for label
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.userId).maybeSingle()
        setRole(String((prof as any)?.role || ''))
      } catch {
        setOwnedProviders([])
        setPendingApps([])
      }
    }
    void loadOwned()
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
    if (!confirm('Delete your account? This will permanently remove your data.')) return
    setBusy(true)
    setMessage(null)
    try {
      const fnBase = (import.meta.env.VITE_FN_BASE_URL as string) || (window.location.hostname === 'localhost' ? 'http://localhost:8888' : '')
      const url = fnBase ? `${fnBase}/.netlify/functions/user-delete` : '/.netlify/functions/user-delete'
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) {
        const text = await res.text()
        setMessage(`Delete failed: ${text || res.status}`)
        return
      }
      // Account deleted successfully - clear local state instead of trying to logout
      // (logout would fail since the user no longer exists in Supabase)
      try { localStorage.clear() } catch {}
      setMessage('Your account has been deleted. You can now create a new account with the same email.')
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } finally {
      setBusy(false)
    }
  }

  async function updatePassword() {
    const pw = prompt('Enter a new password (min 8 characters):') || ''
    if (!pw || pw.length < 8) return
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) setMessage(error.message)
      else setMessage('Password updated.')
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
          {role && <div className="mt-1 text-xs text-neutral-500">Type: {String(role).toLowerCase() === 'business' ? 'Business account' : 'Community account'}</div>}
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
            <div className="text-sm font-medium">My Businesses</div>
            <div className="mt-2 text-sm">
              {ownedProviders.length === 0 && <div className="text-neutral-600">No businesses found.</div>}
              <ul className="space-y-1">
                {ownedProviders.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.name}</span>
                    <Link to={`/owner`} className="text-xs underline">Manage</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {pendingApps.length > 0 && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">Pending Applications</div>
              <div className="mt-2 text-sm">
                <ul className="space-y-1">
                  {pendingApps.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{a.business_name || 'Unnamed Business'}</span>
                      <span className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="text-sm text-neutral-700 font-medium">Security</div>
            <button disabled={busy} onClick={updatePassword} className="mt-2 rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Change Password</button>
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



