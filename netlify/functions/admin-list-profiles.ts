type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
  clientContext?: any
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>

import { createClient } from '@supabase/supabase-js'

function getEnv(name: string, fallbackName?: string): string {
  const v = process.env[name] || (fallbackName ? process.env[fallbackName] : '')
  if (!v) throw new Error(`Missing env ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`)
  return v
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = getEnv('SUPABASE_SERVICE_ROLE')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
    const { data, error } = await sb.from('profiles').select('id,email,name,role').order('email', { ascending: true })
    if (error) return { statusCode: 400, body: error.message }
    return { statusCode: 200, body: JSON.stringify({ profiles: data || [] }) }
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || 'Server error' }
  }
}


