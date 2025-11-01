import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

function getEnv(name: string, fallbackName?: string): string {
  const v = process.env[name] || (fallbackName ? process.env[fallbackName] : '')
  if (!v) throw new Error(`Missing env ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`)
  return v
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    // Verify admin authorization first
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: No token provided' }) }
    }

    const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = getEnv('SUPABASE_SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // CRITICAL FIX: Verify the JWT token using ANON key (service role can't verify user tokens)
    const { data: userResponse, error: userError } = await (sbAnon as any).auth.getUser(token)
    if (userError || !userResponse?.user) {
      console.error('[admin-update-provider] Token verification failed:', userError)
      return { statusCode: 401, headers, body: JSON.stringify({ error: `Unauthorized: ${userError?.message || 'Invalid token'}` }) }
    }

    const adminUserId = userResponse.user.id
    const adminEmail = userResponse.user.email?.toLowerCase()

    // Check if user is admin via multiple methods
    // Method 1: Check email against admin list
    const adminEmails = (process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    
    const isEmailAdmin = adminEmails.length > 0 ? 
      adminEmails.includes(adminEmail || '') : 
      adminEmail === 'justexisted@gmail.com'

    // Method 2: Check database for is_admin flag (future-proofing)
    let isDatabaseAdmin = false
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', adminUserId)
        .single()
      
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {
      // is_admin column doesn't exist yet, that's okay
    }

    if (!isEmailAdmin && !isDatabaseAdmin) {
      console.warn(`[admin-update-provider] Non-admin user (${adminEmail}) attempted access`)
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Not an administrator' }) }
    }
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}
    const { providerId, updates } = body

    if (!providerId || !updates) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: providerId and updates' }),
      }
    }

    console.log('[admin-update-provider] Updating provider:', providerId, 'with updates:', JSON.stringify(updates))

    // Update the provider using service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()

    if (error) {
      console.error('[admin-update-provider] Error updating provider:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update provider', details: error.message }),
      }
    }

    console.log('[admin-update-provider] Successfully updated provider:', providerId, 'New tags:', updates.tags)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, provider: data[0] }),
    }
  } catch (error: any) {
    console.error('[admin-update-provider] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
