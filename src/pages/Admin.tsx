import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

type FunnelRow = {
  id: string
  user_email: string
  category: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  created_at: string
}

type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

/**
 * Admin page (per-user): Lists the authenticated user's saved funnel responses and bookings.
 * Requires RLS policies to allow users to select their own rows.
 */
export default function AdminPage() {
  const auth = useAuth()
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  // Admins (comma-separated) can view all users' data. Example .env: VITE_ADMIN_EMAILS=you@example.com,other@example.com
  // Default to the owner email if no env var is set.
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isAdmin = useMemo(() => !!auth.email && adminList.includes(auth.email.toLowerCase()), [auth.email, adminList])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!auth.email) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', auth.email!)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', auth.email!)
        const bizQuery = supabase.from('business_applications').select('*').order('created_at', { ascending: false })
        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
        ])
        if (cancelled) return
        if (fErr) setError(fErr.message)
        if (bErr) setError((prev) => prev ?? bErr.message)
        if (bizErr) setError((prev) => prev ?? bizErr.message)
        if (conErr) setError((prev) => prev ?? conErr.message)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [auth.email, isAdmin, selectedUser])

  const users = useMemo(() => {
    const set = new Set<string>()
    funnels.forEach((f) => set.add(f.user_email))
    bookings.forEach((b) => set.add(b.user_email))
    return Array.from(set).sort()
  }, [funnels, bookings])

  const businessAccounts = useMemo(() => {
    const set = new Set<string>()
    bizApps.forEach((b) => { if (b.email) set.add(b.email) })
    contactLeads.forEach((c) => { if (c.contact_email) set.add(c.contact_email) })
    return Array.from(set).sort()
  }, [bizApps, contactLeads])

  if (!auth.email) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Admin' : 'Your Data'}</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <select value={selectedUser || ''} onChange={(e) => setSelectedUser(e.target.value || null)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="">All users</option>
                  {users.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </>
            )}
            <button onClick={() => window.location.reload()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200 text-sm">Refresh</button>
          </div>
        </div>
        {loading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton">
                <div className="skeleton-inner space-y-3">
                  <div className="skeleton-line w-1/3"></div>
                  <div className="skeleton-chip"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Business Applications</div>
              <div className="mt-2 space-y-2 text-sm">
                {bizApps.length === 0 && <div className="text-neutral-500">No applications yet.</div>}
                {bizApps.map((row) => (
                  <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.business_name || '-'}</div>
                      <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Contact: {row.full_name || '-'} • {row.email || '-'} • {row.phone || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Category: {row.category || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Challenge: {row.challenge || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Contact / Get Featured</div>
              <div className="mt-2 space-y-2 text-sm">
                {contactLeads.length === 0 && <div className="text-neutral-500">No leads yet.</div>}
                {contactLeads.map((row) => (
                  <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.business_name || '-'}</div>
                      <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Email: {row.contact_email || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Details: {row.details || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
              <div className="font-medium">Customer Users</div>
              <ul className="mt-2 text-sm">
                {users.length === 0 && <li className="text-neutral-500">No users yet.</li>}
                {users.map((u) => (
                  <li key={u} className="py-1 border-b border-neutral-100 last:border-0">{u}</li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
              <div className="font-medium">Business Accounts</div>
              <ul className="mt-2 text-sm">
                {businessAccounts.length === 0 && <li className="text-neutral-500">No business accounts yet.</li>}
                {businessAccounts.map((u) => (
                  <li key={u} className="py-1 border-b border-neutral-100 last:border-0">{u}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Funnel Responses</div>
            <div className="mt-2 space-y-2 text-sm">
              {funnels.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {funnels.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <div className="mt-1 text-xs text-neutral-600">User: {row.user_email}</div>
                  <ul className="mt-2 list-disc list-inside">
                    {Object.entries(row.answers).map(([k, v]) => (
                      <li key={k}>
                        <span className="text-neutral-500">{k}: </span>
                        <span>{String(v)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Bookings</div>
            <div className="mt-2 space-y-2 text-sm">
              {bookings.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {bookings.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <div className="mt-1">Name: {row.name || '-'}</div>
                  <div className="mt-1">Notes: {row.notes || '-'}</div>
                  {row.answers && (
                    <ul className="mt-2 list-disc list-inside">
                      {Object.entries(row.answers).map(([k, v]) => (
                        <li key={k}>
                          <span className="text-neutral-500">{k}: </span>
                          <span>{String(v)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-1 text-xs text-neutral-600">Status: {row.status || 'new'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


