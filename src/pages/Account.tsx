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
  const [bookings, setBookings] = useState<Array<{ id: string; provider_id?: string | null; provider_name?: string | null; time?: string | null; status?: string | null; created_at?: string | null }>>([])
  const [savedBusinesses, setSavedBusinesses] = useState<Array<{ id?: string; provider_id: string; created_at?: string | null; provider_name?: string | null }>>([])
  const [discounts, setDiscounts] = useState<Array<{ id: string; provider_id?: string | null; code?: string | null; created_at?: string | null; provider_name?: string | null }>>([])
  const [communityLoading, setCommunityLoading] = useState(false)

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

  useEffect(() => {
    async function loadCommunityData() {
      if (!auth.userId) { setBookings([]); setSavedBusinesses([]); setDiscounts([]); return }
      setCommunityLoading(true)
      console.log('[Account] Loading community data for user', auth.userId)
      try {
        // My Bookings
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(50)
          if (error) {
            console.warn('[Account] bookings select error', error)
            setBookings([])
          } else {
            const rows = (data as any[]) || []
            setBookings(rows.map((r) => ({
              id: r.id,
              provider_id: r.provider_id ?? null,
              provider_name: (r as any).provider_name ?? null,
              time: r.time ?? r.start_time ?? r.created_at ?? null,
              status: r.status ?? null,
              created_at: r.created_at ?? null,
            })))
          }
        } catch (e) {
          console.warn('[Account] bookings load failed', e)
          setBookings([])
        }

        // Saved Businesses
        try {
          const { data, error } = await supabase
            .from('saved_providers')
            .select('*')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) {
            console.warn('[Account] saved_providers select error', error)
            setSavedBusinesses([])
          } else {
            const rows = (data as any[]) || []
            setSavedBusinesses(rows.map((r) => ({
              id: r.id,
              provider_id: r.provider_id,
              provider_name: (r as any).provider_name ?? null,
              created_at: r.created_at ?? null,
            })))
          }
        } catch (e) {
          console.warn('[Account] saved_providers load failed', e)
          setSavedBusinesses([])
        }

        // Discounts Redeemed
        try {
          const { data, error } = await supabase
            .from('coupon_redemptions')
            .select('*')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) {
            console.warn('[Account] coupon_redemptions select error', error)
            setDiscounts([])
          } else {
            const rows = (data as any[]) || []
            setDiscounts(rows.map((r) => ({
              id: r.id,
              provider_id: r.provider_id ?? null,
              provider_name: (r as any).provider_name ?? null,
              code: (r as any).code ?? null,
              created_at: r.created_at ?? null,
            })))
          }
        } catch (e) {
          console.warn('[Account] coupon_redemptions load failed', e)
          setDiscounts([])
        }
      } finally {
        setCommunityLoading(false)
      }
    }
    const isCommunity = String(auth.role || role || '').toLowerCase() === 'community'
    if (isCommunity) void loadCommunityData()
  }, [auth.userId, auth.role, role])

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

  async function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation !== 'DELETE') return

    const doubleConfirmation = confirm(
      'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.'
    )
    if (!doubleConfirmation) return

    setBusy(true)
    setMessage('Deleting account...')

    try {
      // Call Netlify function to delete user account
      const fnBase = (import.meta.env.VITE_FN_BASE_URL as string) || (window.location.hostname === 'localhost' ? 'http://localhost:8888' : '')
      const response = await fetch(`${fnBase}/.netlify/functions/user-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.userId })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to delete account')
      }

      setMessage('Account deleted successfully. You will be signed out.')
      
      // Sign out and redirect after a delay
      setTimeout(() => {
        auth.signOut()
      }, 2000)

    } catch (error: any) {
      console.error('Account deletion error:', error)
      setMessage(`Error deleting account: ${error.message}`)
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
            <div className="flex gap-3">
              <button disabled={busy} onClick={saveProfile} className="flex-1 rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Save Changes'}</button>
              <button disabled={busy} onClick={updatePassword} className="rounded-full bg-neutral-100 text-neutral-900 px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50">Change Password</button>
            </div>
          </div>

          {auth.role === 'business' && (
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
          )}
          {String(auth.role || role || '').toLowerCase() === 'community' && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">My Bookings</div>
              <div className="mt-2 text-sm">
                {communityLoading && <div className="text-neutral-500">Loading…</div>}
                {!communityLoading && bookings.length === 0 && <div className="text-neutral-600">No bookings found.</div>}
                <ul className="space-y-1">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between">
                      <span>{b.provider_name || b.provider_id || 'Business'}{b.time ? ` • ${new Date(b.time).toLocaleString()}` : ''}</span>
                      <span className="text-xs text-neutral-500">{b.status || '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {String(auth.role || role || '').toLowerCase() === 'community' && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">Saved Businesses</div>
              <div className="mt-2 text-sm">
                {communityLoading && <div className="text-neutral-500">Loading…</div>}
                {!communityLoading && savedBusinesses.length === 0 && <div className="text-neutral-600">No saved businesses yet.</div>}
                <ul className="space-y-1">
                  {savedBusinesses.map((s, idx) => (
                    <li key={`${s.id || s.provider_id}-${idx}`} className="flex items-center justify-between">
                      <span>{s.provider_name || s.provider_id}</span>
                      <span className="text-xs text-neutral-500">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {String(auth.role || role || '').toLowerCase() === 'community' && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">Discounts Redeemed</div>
              <div className="mt-2 text-sm">
                {communityLoading && <div className="text-neutral-500">Loading…</div>}
                {!communityLoading && discounts.length === 0 && <div className="text-neutral-600">No discounts redeemed yet.</div>}
                <ul className="space-y-1">
                  {discounts.map((d) => (
                    <li key={d.id} className="flex items-center justify-between">
                      <span>{d.provider_name || d.provider_id || 'Business'}{d.code ? ` • ${d.code}` : ''}</span>
                      <span className="text-xs text-neutral-500">{d.created_at ? new Date(d.created_at).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {auth.role === 'business' && pendingApps.length > 0 && (
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



