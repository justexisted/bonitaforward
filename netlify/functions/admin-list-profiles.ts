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
    // Verify admin authorization first
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, body: 'Unauthorized' }

    const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = getEnv('SUPABASE_SERVICE_ROLE')
    const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify the JWT token using ANON key (service role can't verify user tokens)
    const { data: adminUserData, error: getAdminErr } = await (sbAnon as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      console.error('[admin-list-profiles] Token verification failed:', getAdminErr)
      return { statusCode: 401, body: 'Invalid token' }
    }

    const adminUserId = adminUserData.user.id
    const adminEmail = adminUserData.user.email?.toLowerCase()

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
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', adminUserId)
        .single()
      
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {
      // is_admin column doesn't exist yet, that's okay
    }

    if (!isEmailAdmin && !isDatabaseAdmin) {
      return { statusCode: 403, body: 'Admin access required' }
    }

    // Log admin action for audit trail
    try {
      await sb.from('admin_audit_log').insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action: 'admin_list_profiles',
        timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
    } catch {
      // audit log table doesn't exist yet, that's okay for now
    }

    // Select all profile fields including resident verification data
    // Try with resident verification fields first, fallback to basic fields if columns don't exist
    let query = sb
      .from('profiles')
      .select('id,email,name,role,is_admin,is_bonita_resident,resident_verification_method,resident_zip_code,resident_verified_at')
      .order('email', { ascending: true })
    
    let { data, error } = await query
    
    // If error is about missing columns, try again with just basic fields
    if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.warn('[admin-list-profiles] Resident verification columns not found, using basic fields:', error.message)
      const basicQuery = sb
        .from('profiles')
        .select('id,email,name,role,is_admin')
        .order('email', { ascending: true })
      const basicResult = await basicQuery
      if (basicResult.error) {
        console.error('[admin-list-profiles] Error fetching profiles:', basicResult.error)
        return { statusCode: 400, body: JSON.stringify({ error: basicResult.error.message, details: 'Failed to fetch profiles' }) }
      }
      data = basicResult.data
    } else if (error) {
      console.error('[admin-list-profiles] Error fetching profiles:', error)
      return { statusCode: 400, body: JSON.stringify({ error: error.message, details: 'Database query failed' }) }
    }
    
    return { statusCode: 200, body: JSON.stringify({ profiles: data || [] }) }
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || 'Server error' }
  }
}


