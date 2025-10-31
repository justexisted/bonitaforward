// Local minimal Netlify Handler type to avoid requiring '@netlify/functions' types at build time
type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
  clientContext?: any
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }> 

import { createClient } from '@supabase/supabase-js'

// Netlify function to get user data from auth.users table
// Used when profile is missing from profiles table
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
  }
  
  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' }
  }
  
  try {
    // Verify admin authorization
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, headers, body: 'Unauthorized' }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify the JWT token using ANON key (service role can't verify user tokens)
    const { data: adminUserData, error: getAdminErr } = await (sbAnon as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      console.error('[admin-get-user] Token verification failed:', getAdminErr)
      return { statusCode: 401, headers, body: 'Invalid token' }
    }

    const adminEmail = adminUserData.user.email?.toLowerCase()

    // Check if user is admin
    const adminEmails = (process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    
    const isEmailAdmin = adminEmails.length > 0 ? 
      adminEmails.includes(adminEmail || '') : 
      adminEmail === 'justexisted@gmail.com'

    // Check database for is_admin flag
    let isDatabaseAdmin = false
    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', adminUserData.user.id)
        .single()
      
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {
      // is_admin column doesn't exist yet, that's okay
    }

    if (!isEmailAdmin && !isDatabaseAdmin) {
      return { statusCode: 403, headers, body: 'Admin access required' }
    }

    // Get user_id from request body
    const body = JSON.parse(event.body || '{}') as { user_id?: string }
    const user_id = body.user_id
    if (!user_id) {
      return { statusCode: 400, headers, body: 'Missing user_id' }
    }

    // Fetch user from auth.users table
    const { data: { user }, error: userError } = await (sb as any).auth.admin.getUserById(user_id)
    
    if (userError) {
      console.error(`[admin-get-user] Error fetching user ${user_id}:`, userError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: userError.message, user: null })
      }
    }

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found', user: null })
      }
    }

    // Return user data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          created_at: user.created_at
        }
      })
    }
    
  } catch (err: any) {
    console.error('[admin-get-user] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Server error', user: null })
    }
  }
}

