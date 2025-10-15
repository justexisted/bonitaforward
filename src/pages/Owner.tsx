import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { createProviderChangeRequest, listOwnerChangeRequests, type ProviderChangeRequest } from '../lib/supabaseData'

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
  
  // Server-side admin verification with client-side fallback
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean
    loading: boolean
    verified: boolean
  }>({ isAdmin: false, loading: true, verified: false })
  
  // Legacy client-side check for fallback
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isClientAdmin = !!email && adminList.includes(email.toLowerCase())

  // Server-side admin verification
  useEffect(() => {
    async function verifyAdmin() {
      if (!email) {
        setAdminStatus({ isAdmin: false, loading: false, verified: false })
        return
      }

      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        
        if (!token) {
          setAdminStatus({ isAdmin: isClientAdmin, loading: false, verified: false })
          return
        }

        const fnBase = (import.meta.env.VITE_FN_BASE_URL as string) || 
          (window.location.hostname === 'localhost' ? 'http://localhost:8888' : '')
        const url = fnBase ? `${fnBase}/.netlify/functions/admin-verify` : '/.netlify/functions/admin-verify'
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          setAdminStatus({
            isAdmin: result.isAdmin,
            loading: false,
            verified: true
          })
        } else {
          // Fallback to client-side check
          setAdminStatus({
            isAdmin: isClientAdmin,
            loading: false,
            verified: false
          })
        }
      } catch {
        // Fallback to client-side check on error
        setAdminStatus({
          isAdmin: isClientAdmin,
          loading: false,
          verified: false
        })
      }
    }

    verifyAdmin()
  }, [email, isClientAdmin])

  const isAdmin = adminStatus.isAdmin
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [requests, setRequests] = useState<ProviderChangeRequest[]>([])
  const [pendingApps, setPendingApps] = useState<{ id: string; business_name: string | null; created_at: string; status: string | null }[]>([])

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
      // Show owned businesses, or claimable if emails match (normalize case/whitespace)
      const norm = (s?: string | null) => String(s || '').trim().toLowerCase()
      const userEmail = norm(email)
      const filtered = rows.filter((r) => r.owner_user_id === userId || (!r.owner_user_id && norm(r.email) && userEmail && norm(r.email) === userEmail))
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
          .select('id,business_name,created_at,email,status')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(10)
        const rows = ((data as any[]) || []).map((r) => ({ id: r.id, business_name: r.business_name, created_at: r.created_at, status: r.status }))
        setPendingApps(rows)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    void load()
  }, [userId])

  // claimProvider disabled; we now guide users to Featured request

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
    const { error } = await createProviderChangeRequest({ provider_id: p.id, owner_user_id: userId!, type: 'feature_request', changes: {}, reason: 'Request to be Featured — $97/year' })
    if (error) setMessage('Request failed: ' + error)
    else setMessage('Request sent. Awaiting admin approval.')
  }

  // submitJob temporarily disabled; job posting UI was removed from owner view

  if (!userId) {
    return <div className="py-8"><div className="rounded-2xl border border-neutral-100 p-5 bg-white">Please sign in to manage your business.</div></div>
  }

  if (isAdmin) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Admins manage businesses in the Admin page. The owner dashboard is hidden for admins.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-xl font-semibold tracking-tight">My Business</h1>
          {message && <div className="mt-2 text-sm text-neutral-600">{message}</div>}
          
          {/* Application Status Banner */}
          {pendingApps.length > 0 && pendingApps.some(a => a.status === 'pending' || !a.status) && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-amber-900">Business Application Status</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Status: <strong>Pending admin approval</strong> - We will notify you when your application is reviewed and approved.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {pendingApps.length > 0 && pendingApps.some(a => a.status === 'approved') && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-green-900">Business Application Approved</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Status: <strong>Approved</strong> - Your business has been successfully added to the directory!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {pendingApps.length > 0 && pendingApps.some(a => a.status === 'rejected') && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-red-900">Business Application Rejected</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Status: <strong>Rejected</strong> - Please contact support if you have questions about this decision.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
                    </div>
                    {!p.is_member && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] ml-auto">Get Featured • $97/year</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    <input value={p.address ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, address: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Address" />
                    <input value={(p.images || []).join(', ')} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Image URLs (comma separated)" />
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
                      <button onClick={() => requestFeatured(p)} className="ml-2 btn btn-primary text-xs">Request to be Featured ($97/year)</button>
                    )}
                  </div>
                  {/* Job posting section intentionally removed from owner view per requirements clarification */}
                </div>
              ))}
              {(pendingApps.length > 0) && (
                <div className="rounded-xl border border-neutral-200 p-4">
                  <div className="text-sm font-medium">Business Applications</div>
                  <ul className="mt-2 text-sm space-y-2">
                    {pendingApps.map((a) => (
                      <li key={a.id} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium">{a.business_name || 'Unnamed Business'}</span>
                          <span className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          {a.status === 'pending' && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">
                              Under Review
                            </span>
                          )}
                          {a.status === 'approved' && (
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 text-green-700 px-2 py-0.5 text-xs font-medium">
                              Approved
                            </span>
                          )}
                          {a.status === 'rejected' && (
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 text-red-700 px-2 py-0.5 text-xs font-medium">
                              Rejected
                            </span>
                          )}
                          {!a.status && (
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5 text-xs font-medium">
                              Under Review
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {pendingApps.some(a => a.status === 'pending' || !a.status) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">
                        <strong>Status Update:</strong> We will notify you when your application is reviewed and approved.
                      </p>
                    </div>
                  )}
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


