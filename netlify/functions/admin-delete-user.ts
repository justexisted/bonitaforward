import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Netlify function to delete a user via Supabase Admin API (service role)
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    const claims = (event.clientContext as any)?.user || null
    // Basic guard: ensure only authenticated Netlify Identity admin or upstream check; ideally add JWT admin check
    // You can also pass a shared secret via headers if preferred.

    const body = JSON.parse(event.body || '{}') as { user_id?: string }
    const user_id = body.user_id
    if (!user_id) return { statusCode: 400, body: 'Missing user_id' }

    const { error } = await (sb as any).auth.admin.deleteUser(user_id)
    if (error) return { statusCode: 400, body: error.message }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || 'Server error' }
  }
}


