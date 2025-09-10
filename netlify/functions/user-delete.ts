// Local minimal Netlify Handler type to avoid requiring '@netlify/functions' types at build time
type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
  clientContext?: any
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>
import { createClient } from '@supabase/supabase-js'

// Self-serve user deletion (GDPR/CCPA-aligned):
// - Verifies Supabase JWT from Authorization: Bearer <token>
// - Deletes PII rows owned by the user (profiles, funnel_responses, bookings)
// - Deletes providers only if owned by this user (optional: archive instead)
// - Deletes auth user via Admin API
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function getEnv(names: string[]): string {
  for (const name of names) {
    const v = process.env[name]
    if (v) return v
  }
  throw new Error(`Missing env variables: ${names.join(', ')}`)
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, body: 'Unauthorized' }

    const SUPABASE_URL = getEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL'])
    const SUPABASE_SERVICE_ROLE = getEnv(['SUPABASE_SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_KEY'])

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
    // Verify the JWT to identify the caller
    const { data: userData, error: getUserErr } = await (adminClient as any).auth.getUser(token)
    if (getUserErr || !userData?.user?.id) return { statusCode: 401, body: 'Invalid token' }
    const userId: string = userData.user.id
    const userEmail: string | null = userData.user.email || null

    // Best-effort purge PII in application tables BEFORE deleting the auth user
    // Note: use service role to bypass RLS and ensure deletion
    // 1) profiles (id primary key = auth user id)
    try { await adminClient.from('profiles').delete().eq('id', userId) } catch {}
    // 2) funnel_responses (keyed by email)
    if (userEmail) { try { await adminClient.from('funnel_responses').delete().eq('user_email', userEmail) } catch {} }
    // 3) bookings (keyed by email)
    if (userEmail) { try { await adminClient.from('bookings').delete().eq('user_email', userEmail) } catch {} }
    // 4) provider_change_requests / provider_job_posts (owned by user)
    try { await adminClient.from('provider_change_requests').delete().eq('owner_user_id', userId) } catch {}
    try { await adminClient.from('provider_job_posts').delete().eq('owner_user_id', userId) } catch {}
    // 5) user_notifications
    try { await adminClient.from('user_notifications').delete().eq('user_id', userId) } catch {}
    // 6) providers owned by the user: archive (soft delete) to avoid breaking references for public directory; remove owner link
    try {
      const { data: provs } = await adminClient.from('providers').select('id,badges').eq('owner_user_id', userId)
      if (Array.isArray(provs) && provs.length) {
        for (const p of provs) {
          const badges = Array.isArray((p as any)?.badges) ? ((p as any)?.badges as string[]) : []
          const next = Array.from(new Set([...(badges || []), 'deleted']))
          await adminClient.from('providers').update({ badges: next as any, owner_user_id: null as any }).eq('id', (p as any).id)
        }
      }
    } catch {}

    // Finally, delete the auth user
    const { error: delErr } = await (adminClient as any).auth.admin.deleteUser(userId)
    if (delErr) return { statusCode: 400, body: delErr.message }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || 'Server error' }
  }
}


