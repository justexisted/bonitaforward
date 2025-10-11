// Netlify function to verify admin status server-side
type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>

import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, body: 'Unauthorized' }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
    const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify the JWT token using ANON key (service role can't verify user tokens)
    const { data: userData, error: getUserErr } = await (sbAnon as any).auth.getUser(token)
    if (getUserErr || !userData?.user?.id) {
      console.error('[admin-verify] Token verification failed:', getUserErr)
      return { statusCode: 401, body: 'Invalid token' }
    }

    const userId = userData.user.id
    const userEmail = userData.user.email?.toLowerCase()

    // Check if user is admin via multiple methods for backward compatibility
    // Method 1: Check if email is in admin list (current method - keeping for now)
    const adminEmails = (process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    
    const isEmailAdmin = adminEmails.length > 0 ? 
      adminEmails.includes(userEmail || '') : 
      userEmail === 'justexisted@gmail.com' // Fallback

    // Method 2: Check database for is_admin flag (future-proofing)
    let isDatabaseAdmin = false
    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()
      
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {
      // is_admin column doesn't exist yet, that's okay
    }

    const isAdmin = isEmailAdmin || isDatabaseAdmin

    if (!isAdmin) {
      return { 
        statusCode: 403, 
        body: JSON.stringify({ isAdmin: false, error: 'Admin access required' })
      }
    }

    // Log admin access for audit trail
    try {
      await adminClient.from('admin_audit_log').insert({
        admin_user_id: userId,
        admin_email: userEmail,
        action: 'admin_verify',
        timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
    } catch {
      // audit log table doesn't exist yet, that's okay
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        isAdmin: true, 
        userId,
        email: userEmail,
        method: isDatabaseAdmin ? 'database' : 'email'
      })
    }
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || 'Server error' }
  }
}
