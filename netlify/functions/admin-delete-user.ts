// Local minimal Netlify Handler type to avoid requiring '@netlify/functions' types at build time
type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
  clientContext?: any
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }> 
import { createClient } from '@supabase/supabase-js'

// Netlify function to delete a user via Supabase Admin API (service role)
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  
  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }
  try {
    // Verify admin authorization first
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, headers, body: 'Unauthorized' }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify the JWT token and get admin user info
    const { data: adminUserData, error: getAdminErr } = await (sb as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      return { statusCode: 401, headers, body: 'Invalid token' }
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
      return { statusCode: 403, headers, body: 'Admin access required' }
    }

    const body = JSON.parse(event.body || '{}') as { user_id?: string }
    const user_id = body.user_id
    if (!user_id) return { statusCode: 400, headers, body: 'Missing user_id' }

    // Prevent admins from deleting themselves
    if (user_id === adminUserId) {
      return { statusCode: 400, headers, body: 'Cannot delete your own account' }
    }

    // ============================================================
    // STEP 1: Gather all data to archive before deletion
    // ============================================================
    console.log(`[Delete User] Gathering data for user ${user_id}...`)
    
    // Get user profile
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle()
    
    // Get all provider listings owned by this user
    const { data: providers } = await sb
      .from('providers')
      .select('*')
      .eq('owner_user_id', user_id)
    
    // Get change requests
    const { data: changeRequests } = await sb
      .from('provider_change_requests')
      .select('*')
      .eq('user_id', user_id)
    
    // Get job posts for all their providers
    let jobPosts = null
    if (providers && providers.length > 0) {
      const providerIds = providers.map(p => p.id)
      const { data: jobs } = await sb
        .from('provider_job_posts')
        .select('*')
        .in('provider_id', providerIds)
      jobPosts = jobs
    }
    
    console.log(`[Delete User] Found: ${providers?.length || 0} providers, ${changeRequests?.length || 0} change requests, ${jobPosts?.length || 0} job posts`)
    
    // ============================================================
    // STEP 2: Archive all data to deleted_business_accounts table
    // ============================================================
    try {
      await sb.from('deleted_business_accounts').insert({
        original_user_id: user_id,
        original_email: profile?.email || 'unknown',
        original_name: profile?.name,
        original_role: profile?.role,
        provider_data: providers || [],
        change_requests: changeRequests || [],
        job_posts: jobPosts || [],
        profile_data: profile,
        deleted_by_admin_id: adminUserId,
        deleted_by_admin_email: adminEmail,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
      console.log(`[Delete User] Data archived successfully`)
    } catch (archiveError: any) {
      console.error('[Delete User] Failed to archive data:', archiveError)
      // Continue with deletion even if archive fails (table might not exist yet)
    }

    // ============================================================
    // STEP 3: Delete all related data from active tables
    // ============================================================
    
    // Delete provider job posts first (foreign key dependency)
    if (providers && providers.length > 0) {
      const providerIds = providers.map(p => p.id)
      await sb.from('provider_job_posts').delete().in('provider_id', providerIds)
      console.log(`[Delete User] Deleted job posts for ${providerIds.length} providers`)
    }
    
    // Delete provider change requests
    await sb.from('provider_change_requests').delete().eq('user_id', user_id)
    console.log(`[Delete User] Deleted change requests`)
    
    // Delete provider listings
    const { error: providerDeleteError } = await sb
      .from('providers')
      .delete()
      .eq('owner_user_id', user_id)
    
    if (providerDeleteError) {
      console.error('[Delete User] Error deleting providers:', providerDeleteError)
    } else {
      console.log(`[Delete User] Deleted ${providers?.length || 0} provider listings`)
    }
    
    // Delete profile
    await sb.from('profiles').delete().eq('id', user_id)
    console.log(`[Delete User] Deleted profile`)
    
    // Log admin action for audit trail
    try {
      await sb.from('admin_audit_log').insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action: 'admin_delete_user',
        target_user_id: user_id,
        timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
    } catch {
      // audit log table doesn't exist yet, that's okay for now
    }

    // ============================================================
    // STEP 4: Finally delete the auth user (last step)
    // ============================================================
    const { error } = await (sb as any).auth.admin.deleteUser(user_id)
    if (error) {
      console.error('[Delete User] Error deleting auth user:', error)
      return { statusCode: 400, headers, body: error.message }
    }
    
    console.log(`[Delete User] Successfully deleted user ${user_id} and all associated data`)
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    return { statusCode: 500, headers, body: err?.message || 'Server error' }
  }
}


