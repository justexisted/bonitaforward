import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { createJobPost, createProviderChangeRequest, listOwnerChangeRequests, type ProviderChangeRequest } from '../lib/supabaseData'

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
  blog_opt_in?: boolean | null
}

export default function OwnerPage() {
  const { userId, email } = useAuth()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [requests, setRequests] = useState<ProviderChangeRequest[]>([])
  const [jobDrafts, setJobDrafts] = useState<Record<string, { title: string; description: string; apply_url: string; salary_range: string }>>({})
  const [pendingApps, setPendingApps] = useState<{ id: string; business_name: string | null; created_at: string }[]>([])

  async function load() {
    setLoading(true)
    setMessage(null)
    // Fetch providers owned by user OR unclaimed that match their email in provider email (simple heuristic for claiming)
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .or(`owner_user_id.eq.${userId},owner_user_id.is.null`)
      .order('name', { ascending: true })
    if (error) {
      setMessage('Failed to fetch providers')
    } else {
      const rows = (data as unknown as ProviderRow[]) || []
      const filtered = rows.filter((r) => r.owner_user_id === userId || (!r.owner_user_id && r.email && email && r.email.toLowerCase() === email.toLowerCase()))
      setProviders(filtered)
    }
    try {
      if (userId) {
        const list = await listOwnerChangeRequests(userId)
        setRequests(list)
      }
    } catch {}
    try {
      if (email) {
        const { data } = await supabase
          .from('business_applications')
          .select('id,business_name,created_at,email')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(10)
        const rows = ((data as any[]) || []).map((r) => ({ id: r.id, business_name: r.business_name, created_at: r.created_at }))
        setPendingApps(rows)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    void load()
  }, [userId])

  async function claimProvider(id: string) {
    setMessage(null)
    const { error } = await createProviderChangeRequest({ provider_id: id, owner_user_id: userId!, type: 'claim', changes: {}, reason: null })
    if (error) setMessage('Claim request failed: ' + error)
    else { setMessage('Claim requested. Awaiting admin approval.'); void load() }
  }

  async function saveProvider(p: ProviderRow) {
    setMessage(null)
    const changes: Record<string, any> = {
      name: p.name,
      address: p.address,
      phone: p.phone,
      email: p.email,
      website: p.website,
      tags: p.tags || [],
      images: p.images || [],
      blog_opt_in: p.blog_opt_in === true,
    }
    const { error } = await createProviderChangeRequest({ provider_id: p.id, owner_user_id: userId!, type: 'update', changes, reason: null })
    if (error) setMessage('Request failed: ' + error)
    else setMessage('Changes submitted for approval')
  }

  async function deleteProvider(id: string) {
    setMessage(null)
    const row = providers.find((p) => p.id === id)
    if (!row || row.owner_user_id !== userId) {
      setMessage('You can only request deletion for businesses you own')
      return
    }
    const { error } = await createProviderChangeRequest({ provider_id: id, owner_user_id: userId!, type: 'delete', changes: {}, reason: null })
    if (error) setMessage('Delete request failed: ' + error)
    else { setMessage('Delete requested. Awaiting admin approval.'); void load() }
  }

  async function requestFeatured(p: ProviderRow) {
    setMessage(null)
    const { error } = await createProviderChangeRequest({ provider_id: p.id, owner_user_id: userId!, type: 'feature_request', changes: {}, reason: 'Request to be Featured — $100/mo' })
    if (error) setMessage('Request failed: ' + error)
    else setMessage('Request sent. Awaiting admin approval.')
  }

  async function submitJob(p: ProviderRow) {
    setMessage(null)
    const draft = jobDrafts[p.id] || { title: '', description: '', apply_url: '', salary_range: '' }
    if (!draft.title.trim()) { setMessage('Please provide a job title.'); return }
    const { error } = await createJobPost({ provider_id: p.id, owner_user_id: userId!, title: draft.title.trim(), description: draft.description || null, apply_url: draft.apply_url || null, salary_range: draft.salary_range || null })
    if (error) setMessage('Job post failed: ' + error)
    else { setMessage('Job post submitted for approval'); setJobDrafts((m) => ({ ...m, [p.id]: { title: '', description: '', apply_url: '', salary_range: '' } })) }
  }

  if (!userId) {
    return <div className="py-8"><div className="rounded-2xl border border-neutral-100 p-5 bg-white">Please sign in to manage your business.</div></div>
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-xl font-semibold tracking-tight">My Business</h1>
          {message && <div className="mt-2 text-sm text-neutral-600">{message}</div>}
          {loading ? (
            <div className="mt-3 text-sm text-neutral-500">Loading…</div>
          ) : (
            <div className="mt-4 space-y-4">
              {providers.length === 0 && (
                <div className="text-sm text-neutral-600">No businesses found. If your business is missing, contact support.</div>
              )}
              {providers.map((p) => (
                <div key={p.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <input value={p.name} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, name: e.target.value } : it))} className="font-medium rounded-md px-2 py-1 border border-neutral-200" />
                      <div className="text-xs text-neutral-500">Category: {p.category_key}</div>
                      <div className="text-xs mt-1">
                        <span className="text-neutral-500">Featured:</span>{' '}
                        <span className={p.is_member ? 'text-emerald-700' : 'text-neutral-700'}>
                          {p.is_member ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    {!p.owner_user_id && p.email && email && p.email.toLowerCase() === email.toLowerCase() ? (
                      <button onClick={() => claimProvider(p.id)} className="btn btn-primary text-xs">Claim</button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <input value={p.address ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, address: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Address" />
                    <input value={p.phone ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, phone: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
                    <input value={p.email ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, email: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
                    <input value={p.website ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, website: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Website" />
                    <input value={(p.tags || []).join(', ')} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : it))} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Tags (comma separated)" />
                    <input value={(p.images || []).join(', ')} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : it))} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Image URLs (comma separated)" />
                    <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={p.blog_opt_in === true} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, blog_opt_in: e.target.checked } : it))} />
                      <span>Opt-in to be included in Bonita blog posts</span>
                    </label>
                  </div>
                  <div className="mt-3">
                    <button onClick={() => saveProvider(p)} className="btn btn-secondary">Save</button>
                    {p.owner_user_id === userId && (
                      <button
                        onClick={() => {
                          if (confirmDeleteId === p.id) deleteProvider(p.id)
                          else setConfirmDeleteId(p.id)
                        }}
                        className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs ml-2"
                      >
                        {confirmDeleteId === p.id ? 'Confirm' : 'Delete'}
                      </button>
                    )}
                    {!p.is_member && (
                      <button onClick={() => requestFeatured(p)} className="ml-2 btn btn-primary text-xs">Request to be Featured ($100/mo)</button>
                    )}
                  </div>
                  <div className="mt-4 border-t border-neutral-100 pt-3">
                    <div className="text-sm font-medium">Job Postings</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <input value={jobDrafts[p.id]?.title || ''} onChange={(e) => setJobDrafts((m) => ({ ...m, [p.id]: { ...(m[p.id] || { title: '', description: '', apply_url: '', salary_range: '' }), title: e.target.value } }))} placeholder="Title" className="rounded-xl border border-neutral-200 px-3 py-2" />
                      <input value={jobDrafts[p.id]?.apply_url || ''} onChange={(e) => setJobDrafts((m) => ({ ...m, [p.id]: { ...(m[p.id] || { title: '', description: '', apply_url: '', salary_range: '' }), apply_url: e.target.value } }))} placeholder="Apply URL" className="rounded-xl border border-neutral-200 px-3 py-2" />
                      <input value={jobDrafts[p.id]?.salary_range || ''} onChange={(e) => setJobDrafts((m) => ({ ...m, [p.id]: { ...(m[p.id] || { title: '', description: '', apply_url: '', salary_range: '' }), salary_range: e.target.value } }))} placeholder="Salary Range (optional)" className="rounded-xl border border-neutral-200 px-3 py-2" />
                      <textarea value={jobDrafts[p.id]?.description || ''} onChange={(e) => setJobDrafts((m) => ({ ...m, [p.id]: { ...(m[p.id] || { title: '', description: '', apply_url: '', salary_range: '' }), description: e.target.value } }))} placeholder="Description" className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2 min-h-[80px]" />
                    </div>
                    <div className="mt-2">
                      <button onClick={() => submitJob(p)} className="btn btn-secondary text-xs">Submit Job for Approval</button>
                    </div>
                  </div>
                </div>
              ))}
              {(pendingApps.length > 0) && (
                <div className="rounded-xl border border-neutral-200 p-4">
                  <div className="text-sm font-medium">Pending Applications</div>
                  <ul className="mt-2 text-sm space-y-1">
                    {pendingApps.map((a) => (
                      <li key={a.id} className="flex items-center justify-between">
                        <span>{a.business_name || 'Unnamed Business'}</span>
                        <span className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {requests.length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-4">
                  <div className="text-sm font-medium">Recent Requests</div>
                  <ul className="mt-2 text-sm space-y-1">
                    {requests.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex items-center justify-between">
                        <span>{r.type} • {r.status}</span>
                        <span className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


