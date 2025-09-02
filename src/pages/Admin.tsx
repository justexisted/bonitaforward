import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { deleteBlogPost, fetchAllBlogPosts, upsertBlogPost, type BlogPost } from '../lib/supabaseData'

type ProviderRow = {
  id: string
  name: string
  category_key: string
  tags: string[] | null
  badges: string[] | null
  rating: number | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  images: string[] | null
  owner_user_id: string | null
  is_member?: boolean | null
}

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
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogDraft, setBlogDraft] = useState<{ id?: string; category_key: string; title: string; content: string }>({ category_key: 'restaurants-cafes', title: '', content: '' })
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
        console.log('[Admin] loading data. isAdmin?', isAdmin, 'selectedUser', selectedUser)
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', auth.email!)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', auth.email!)
        const bizQuery = supabase.from('business_applications').select('*').order('created_at', { ascending: false })
        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })
        const provQuery = isAdmin ? supabase.from('providers').select('*').order('name', { ascending: true }) : null
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }, provRes] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
          provQuery as any,
        ])
        if (cancelled) return
        if (fErr) { console.error('[Admin] funnels error', fErr); setError(fErr.message) }
        if (bErr) { console.error('[Admin] bookings error', bErr); setError((prev) => prev ?? bErr.message) }
        if (bizErr) { console.error('[Admin] business_applications error', bizErr); setError((prev) => prev ?? bizErr.message) }
        if (conErr) { console.error('[Admin] contact_leads error', conErr); setError((prev) => prev ?? conErr.message) }
        console.log('[Admin] funnels', fData)
        console.log('[Admin] bookings', bData)
        console.log('[Admin] business_applications', bizData)
        console.log('[Admin] contact_leads', conData)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])
        if (provRes && 'data' in (provRes as any)) {
          const { data: pData, error: pErr } = (provRes as any)
          if (pErr) { console.error('[Admin] providers error', pErr); setError((prev) => prev ?? pErr.message) }
          setProviders((pData as ProviderRow[]) || [])
        }
        try {
          const posts = await fetchAllBlogPosts()
          setBlogPosts(posts)
        } catch {}
      } catch (err: any) {
        console.error('[Admin] unexpected failure', err)
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

  // Inline helpers for admin edits
  const [appEdits, setAppEdits] = useState<Record<string, { category_key: string; tagsInput: string }>>({})

  const catOptions: { key: string; name: string }[] = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' },
  ]

  async function approveApplication(appId: string) {
    setMessage(null)
    const app = bizApps.find((b) => b.id === appId)
    if (!app) return
    const draft = appEdits[appId] || { category_key: 'professional-services', tagsInput: '' }
    const tags = draft.tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const payload: Partial<ProviderRow> = {
      name: (app.business_name || 'Unnamed Business') as any,
      category_key: draft.category_key as any,
      tags: tags as any,
      phone: (app.phone || null) as any,
      email: (app.email || null) as any,
      website: null as any,
      address: null as any,
      images: [] as any,
      owner_user_id: (auth.userId || null) as any,
    }
    const { error } = await supabase.from('providers').insert([payload as any])
    if (error) {
      setError(error.message)
    } else {
      setMessage('Application approved and provider created')
      // Delete the application now that it has been approved
      try {
        await supabase.from('business_applications').delete().eq('id', appId)
        setBizApps((rows) => rows.filter((r) => r.id !== appId))
      } catch {}
      // Refresh providers
      try {
        const { data: pData } = await supabase.from('providers').select('*').order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
      } catch {}
    }
  }

  async function deleteApplication(appId: string) {
    setMessage(null)
    const { error } = await supabase.from('business_applications').delete().eq('id', appId)
    if (error) setError(error.message)
    else {
      setMessage('Application deleted')
      setBizApps((rows) => rows.filter((r) => r.id !== appId))
    }
  }

  async function saveProvider(p: ProviderRow) {
    setMessage(null)
    const { error } = await supabase
      .from('providers')
      .update({
        name: p.name,
        category_key: p.category_key,
        tags: p.tags || [],
        rating: p.rating ?? undefined,
        phone: p.phone,
        email: p.email,
        website: p.website,
        address: p.address,
        images: p.images || [],
        is_member: p.is_member === true,
      })
      .eq('id', p.id)
    if (error) setError(error.message)
    else {
      setMessage('Provider saved')
      try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
    }
  }

  async function deleteProvider(providerId: string) {
    setMessage(null)
    setConfirmDeleteProviderId(null)
    const res = await supabase.from('providers').delete().eq('id', providerId).select('id')
    if (res.error) {
      setError(res.error.message)
      return
    }
    const deletedCount = Array.isArray(res.data) ? res.data.length : 0
    if (deletedCount === 0) {
      // Fallback: soft-delete by tagging as 'deleted' if hard delete is not permitted
      try {
        const { data: row, error: selErr } = await supabase.from('providers').select('badges').eq('id', providerId).single()
        if (selErr) {
          setError('Delete failed and could not load row for archive. Check permissions.')
          return
        }
        const badges = Array.isArray(row?.badges) ? row?.badges as string[] : []
        const next = Array.from(new Set([...(badges || []), 'deleted']))
        const { error: updErr } = await supabase.from('providers').update({ badges: next as any }).eq('id', providerId)
        if (updErr) {
          setError('Delete failed and archive failed. Check permissions.')
          return
        }
        setMessage('Provider archived (soft-deleted)')
      } catch {
        setError('Delete failed and archive failed. Check permissions.')
        return
      }
    }
    else {
      setMessage(`Provider deleted (${deletedCount})`)
    }

    // In both cases (hard/soft), refresh the providers list from DB
    try {
      const { data: pData, error: pErr } = await supabase.from('providers').select('*').order('name', { ascending: true })
      if (pErr) {
        setProviders((arr) => arr.filter((p) => p.id !== providerId))
      } else {
        setProviders((pData as ProviderRow[]) || [])
      }
    } catch {
      setProviders((arr) => arr.filter((p) => p.id !== providerId))
    }
    try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
  }

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
        {message && <div className="mt-3 text-sm text-green-700">{message}</div>}

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
                    <div className="text-xs text-neutral-600 mt-1">Category (requested): {row.category || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Challenge: {row.challenge || '-'}</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={(appEdits[row.id]?.category_key) || 'professional-services'}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category_key: e.target.value, tagsInput: m[row.id]?.tagsInput || '' } }))}
                        className="rounded-xl border border-neutral-200 px-3 py-2 bg-white text-xs"
                      >
                        {catOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.name}</option>
                        ))}
                      </select>
                      <input
                        placeholder="tags (comma separated)"
                        value={appEdits[row.id]?.tagsInput || ''}
                        onChange={(e) => setAppEdits((m) => ({ ...m, [row.id]: { category_key: m[row.id]?.category_key || 'professional-services', tagsInput: e.target.value } }))}
                        className="rounded-xl border border-neutral-200 px-3 py-2 text-xs sm:col-span-2"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => approveApplication(row.id)} className="btn btn-primary text-xs">Approve & Create Provider</button>
                      <button onClick={() => deleteApplication(row.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                    </div>
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
        {isAdmin && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Providers (Edit existing)</div>
            <div className="mt-2 text-sm">
              {providers.length === 0 && <div className="text-neutral-500">No providers found.</div>}
              {providers.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      list="providers-list"
                      placeholder="Type to search provider"
                      onChange={(e) => {
                        const name = e.target.value
                        const match = providers.find((p) => p.name.toLowerCase() === name.toLowerCase())
                        if (match) {
                          // Move selected to front so the edit card binds to it
                          setProviders((arr) => {
                            const sel = arr.find((p) => p.id === match.id)
                            if (!sel) return arr
                            return [sel, ...arr.filter((p) => p.id !== match.id)]
                          })
                        }
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2"
                    />
                    <select
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        // Move selected to front for editing
                        setProviders((arr) => {
                          const sel = arr.find((p) => p.id === id)
                          if (!sel) return arr
                          return [sel, ...arr.filter((p) => p.id !== id)]
                        })
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
                    >
                      <option value="">Select provider…</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <datalist id="providers-list">
                      {providers.map((p) => (
                        <option key={p.id} value={p.name}></option>
                      ))}
                    </datalist>
                  </div>
                  {/* Single edit card bound to the first provider in array */}
                  {providers[0] && (
                    <div className="rounded-xl border border-neutral-200 p-3">
                      <div className="text-neutral-700 font-medium mb-2">Editing: {providers[0].name}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={providers[0].name} onChange={(e) => setProviders((arr) => [{ ...arr[0], name: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Name" />
                        <select value={providers[0].category_key} onChange={(e) => setProviders((arr) => [{ ...arr[0], category_key: e.target.value } as any, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                          {catOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.name}</option>
                          ))}
                        </select>
                        <input value={(providers[0].tags || []).join(', ')} onChange={(e) => setProviders((arr) => [{ ...arr[0], tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Tags" />
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={providers[0].is_member === true} onChange={(e) => setProviders((arr) => [{ ...arr[0], is_member: e.target.checked }, ...arr.slice(1)])} />
                          <span>Featured (Paid)</span>
                        </label>
                        <input value={providers[0].phone || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], phone: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
                        <input value={providers[0].email || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], email: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
                        <input value={providers[0].website || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], website: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Website" />
                        <input value={providers[0].address || ''} onChange={(e) => setProviders((arr) => [{ ...arr[0], address: e.target.value }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Address" />
                        <input value={(providers[0].images || []).join(', ')} onChange={(e) => setProviders((arr) => [{ ...arr[0], images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }, ...arr.slice(1)])} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-3" placeholder="Image URLs" />
                      </div>
                      <div className="mt-2">
                        <button onClick={() => saveProvider(providers[0])} className="btn btn-secondary text-xs">Save</button>
                        <button
                          onClick={() => {
                            const id = providers[0].id
                            if (confirmDeleteProviderId === id) deleteProvider(id)
                            else setConfirmDeleteProviderId(id)
                          }}
                          className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs ml-2"
                        >
                          {confirmDeleteProviderId === providers[0].id ? 'Confirm' : 'Delete'}
                        </button>
                        {confirmDeleteProviderId === providers[0].id && (
                          <button onClick={() => setConfirmDeleteProviderId(null)} className="text-xs underline text-neutral-500 ml-2">Cancel</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Blog Post Manager</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-2">
                  <select value={blogDraft.category_key} onChange={(e) => setBlogDraft((d) => ({ ...d, category_key: e.target.value }))} className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                    <option value="restaurants-cafes">Restaurants & Cafés — Top 5 Restaurants This Month</option>
                    <option value="home-services">Home Services — Bonita Home Service Deals</option>
                    <option value="health-wellness">Health & Wellness — Wellness Spotlight</option>
                    <option value="real-estate">Real Estate — Property Opportunities in Bonita</option>
                    <option value="professional-services">Professional Services — Top Professional Services of Bonita</option>
                  </select>
                  <input value={blogDraft.title} onChange={(e) => setBlogDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Post title" className="rounded-xl border border-neutral-200 px-3 py-2" />
                  <textarea value={blogDraft.content} onChange={(e) => setBlogDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Content (markdown/plain)" rows={8} className="rounded-xl border border-neutral-200 px-3 py-2"></textarea>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setError(null); setMessage(null)
                        const { error } = await upsertBlogPost({ id: blogDraft.id, category_key: blogDraft.category_key, title: blogDraft.title, content: blogDraft.content } as any)
                        if (error) setError(error)
                        else {
                          setMessage('Blog post saved')
                          const posts = await fetchAllBlogPosts()
                          setBlogPosts(posts)
                          setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '' })
                        }
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Save Post
                    </button>
                    {blogDraft.id && (
                      <button onClick={() => setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '' })} className="text-xs underline">New</button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Existing Posts</div>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {blogPosts.length === 0 && <div className="text-neutral-500">No posts yet.</div>}
                  {blogPosts.map((bp) => (
                    <div key={bp.id} className="rounded-xl border border-neutral-200 p-2">
                      <div className="font-medium text-sm">{bp.title}</div>
                      <div className="text-[11px] text-neutral-500">{bp.category_key} • {new Date(bp.created_at).toLocaleString()}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => setBlogDraft({ id: bp.id, category_key: bp.category_key, title: bp.title, content: bp.content })} className="btn btn-secondary text-xs">Edit</button>
                        <button onClick={async () => { const { error } = await deleteBlogPost(bp.id); if (error) setError(error); else { setMessage('Post deleted'); setBlogPosts((arr) => arr.filter((p) => p.id !== bp.id)) } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Blog Post Manager UI block will be rendered below the providers section
// Inserted at bottom of file in the returned JSX above


