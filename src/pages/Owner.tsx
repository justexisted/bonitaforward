import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

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
}

export default function OwnerPage() {
  const { userId, email } = useAuth()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [message, setMessage] = useState<string | null>(null)

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
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    void load()
  }, [userId])

  async function claimProvider(id: string) {
    setMessage(null)
    const { error } = await supabase
      .from('providers')
      .update({ owner_user_id: userId })
      .eq('id', id)
    if (error) setMessage('Claim failed: ' + error.message)
    else {
      setMessage('Business claimed successfully')
      void load()
    }
  }

  async function saveProvider(p: ProviderRow) {
    setMessage(null)
    const { error } = await supabase
      .from('providers')
      .update({
        phone: p.phone,
        email: p.email,
        website: p.website,
        address: p.address,
        tags: p.tags || [],
        images: p.images || [],
      })
      .eq('id', p.id)
    if (error) setMessage('Save failed: ' + error.message)
    else setMessage('Saved')
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
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-neutral-500">Category: {p.category_key}</div>
                    </div>
                    {!p.owner_user_id && p.email && email && p.email.toLowerCase() === email.toLowerCase() ? (
                      <button onClick={() => claimProvider(p.id)} className="btn btn-primary text-xs">Claim</button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <input value={p.phone ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, phone: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
                    <input value={p.email ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, email: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
                    <input value={p.website ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, website: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Website" />
                    <input value={p.address ?? ''} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, address: e.target.value } : it))} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Address" />
                    <input value={(p.tags || []).join(', ')} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : it))} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Tags (comma separated)" />
                    <input value={(p.images || []).join(', ')} onChange={(e) => setProviders((arr) => arr.map((it) => it.id === p.id ? { ...it, images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : it))} className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2" placeholder="Image URLs (comma separated)" />
                  </div>
                  <div className="mt-3">
                    <button onClick={() => saveProvider(p)} className="btn btn-secondary">Save</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


