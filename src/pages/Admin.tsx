import { useEffect, useState } from 'react'
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
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }] = await Promise.all([
          supabase.from('funnel_responses').select('*').eq('user_email', auth.email).order('created_at', { ascending: false }),
          supabase.from('bookings').select('*').eq('user_email', auth.email).order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (fErr) setError(fErr.message)
        if (bErr) setError((prev) => prev ?? bErr.message)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
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
  }, [auth.email])

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

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Your Data</h1>
        {loading && <div className="mt-3 text-sm text-neutral-600">Loading…</div>}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Funnel Responses</div>
            <div className="mt-2 space-y-2 text-sm">
              {funnels.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {funnels.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-neutral-800 font-medium">{row.category}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
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

          <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Bookings</div>
            <div className="mt-2 space-y-2 text-sm">
              {bookings.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {bookings.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
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


