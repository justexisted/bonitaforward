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
    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle()
    
    if (profileError) {
      console.error('[Delete User] Error fetching profile:', profileError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error fetching user profile',
          details: profileError.message,
          code: profileError.code,
          hint: profileError.hint
        })
      }
    }
    
    const userEmail = profile?.email
    console.log(`[Delete User] User email: ${userEmail}`)
    
    // Get all provider listings owned by this user
    const { data: providers, error: providersError } = await sb
      .from('providers')
      .select('*')
      .eq('owner_user_id', user_id)
    
    if (providersError) {
      console.error('[Delete User] Error fetching providers:', providersError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error fetching user providers',
          details: providersError.message,
          code: providersError.code,
          hint: providersError.hint
        })
      }
    }
    
    // Get change requests - FIXED: using correct field name 'owner_user_id'
    const { data: changeRequests, error: changeRequestsError } = await sb
      .from('provider_change_requests')
      .select('*')
      .eq('owner_user_id', user_id)
    
    if (changeRequestsError) {
      console.error('[Delete User] Error fetching change requests:', changeRequestsError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error fetching user change requests',
          details: changeRequestsError.message,
          code: changeRequestsError.code,
          hint: changeRequestsError.hint
        })
      }
    }
    
    // Get job posts for all their providers
    let jobPosts = null
    if (providers && providers.length > 0) {
      const providerIds = providers.map(p => p.id)
      const { data: jobs, error: jobsError } = await sb
        .from('provider_job_posts')
        .select('*')
        .in('provider_id', providerIds)
      
      if (jobsError) {
        console.error('[Delete User] Error fetching job posts:', jobsError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error fetching user job posts',
            details: jobsError.message,
            code: jobsError.code,
            hint: jobsError.hint
          })
        }
      }
      jobPosts = jobs
    }
    
    // CRITICAL FIX: Get funnel responses by email
    let funnelResponses = null
    if (userEmail) {
      const { data: funnels, error: funnelsError } = await sb
        .from('funnel_responses')
        .select('*')
        .eq('user_email', userEmail)
      
      if (funnelsError) {
        console.error('[Delete User] Error fetching funnel responses:', funnelsError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error fetching funnel responses',
            details: funnelsError.message,
            code: funnelsError.code,
            hint: funnelsError.hint
          })
        }
      }
      funnelResponses = funnels
    }
    
    // CRITICAL FIX: Get bookings by email
    let bookings = null
    if (userEmail) {
      const { data: bookingsData, error: bookingsError } = await sb
        .from('bookings')
        .select('*')
        .eq('user_email', userEmail)
      
      if (bookingsError) {
        console.error('[Delete User] Error fetching bookings:', bookingsError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error fetching bookings',
            details: bookingsError.message,
            code: bookingsError.code,
            hint: bookingsError.hint
          })
        }
      }
      bookings = bookingsData
    }
    
    // Get business applications by email
    let businessApplications = null
    if (userEmail) {
      const { data: apps, error: appsError } = await sb
        .from('business_applications')
        .select('*')
        .eq('email', userEmail)
      
      if (appsError) {
        console.error('[Delete User] Error fetching business applications:', appsError)
        // Don't fail on this, just log it
      } else {
        businessApplications = apps
      }
    }
    
    // Get contact leads by email
    let contactLeads = null
    if (userEmail) {
      const { data: leads, error: leadsError } = await sb
        .from('contact_leads')
        .select('*')
        .eq('contact_email', userEmail)
      
      if (leadsError) {
        console.error('[Delete User] Error fetching contact leads:', leadsError)
        // Don't fail on this, just log it
      } else {
        contactLeads = leads
      }
    }
    
    // Get user notifications
    const { data: notifications } = await sb
      .from('user_notifications')
      .select('*')
      .eq('user_id', user_id)
    
    console.log(`[Delete User] Data summary:`)
    console.log(`[Delete User]   - Providers: ${providers?.length || 0}`)
    console.log(`[Delete User]   - Change requests: ${changeRequests?.length || 0}`)
    console.log(`[Delete User]   - Job posts: ${jobPosts?.length || 0}`)
    console.log(`[Delete User]   - Funnel responses: ${funnelResponses?.length || 0}`)
    console.log(`[Delete User]   - Bookings: ${bookings?.length || 0}`)
    console.log(`[Delete User]   - Business applications: ${businessApplications?.length || 0}`)
    console.log(`[Delete User]   - Contact leads: ${contactLeads?.length || 0}`)
    console.log(`[Delete User]   - Notifications: ${notifications?.length || 0}`)
    
    // ============================================================
    // STEP 2: Archive all data to deleted_business_accounts table
    // ============================================================
    try {
      await sb.from('deleted_business_accounts').insert({
        original_user_id: user_id,
        original_email: userEmail || 'unknown',
        original_name: profile?.name,
        original_role: profile?.role,
        provider_data: providers || [],
        change_requests: changeRequests || [],
        job_posts: jobPosts || [],
        funnel_responses: funnelResponses || [],
        bookings: bookings || [],
        business_applications: businessApplications || [],
        contact_leads: contactLeads || [],
        notifications: notifications || [],
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
    
    // CRITICAL FIX: Delete funnel responses by email
    if (userEmail) {
      const { error: funnelDeleteError } = await sb
        .from('funnel_responses')
        .delete()
        .eq('user_email', userEmail)
      
      if (funnelDeleteError) {
        console.error('[Delete User] Error deleting funnel responses:', funnelDeleteError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error deleting funnel responses',
            details: funnelDeleteError.message,
            code: funnelDeleteError.code,
            hint: funnelDeleteError.hint
          })
        }
      }
      console.log(`[Delete User] Deleted ${funnelResponses?.length || 0} funnel responses`)
    }
    
    // CRITICAL FIX: Delete bookings by email
    if (userEmail) {
      const { error: bookingsDeleteError } = await sb
        .from('bookings')
        .delete()
        .eq('user_email', userEmail)
      
      if (bookingsDeleteError) {
        console.error('[Delete User] Error deleting bookings:', bookingsDeleteError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error deleting bookings',
            details: bookingsDeleteError.message,
            code: bookingsDeleteError.code,
            hint: bookingsDeleteError.hint
          })
        }
      }
      console.log(`[Delete User] Deleted ${bookings?.length || 0} bookings`)
    }
    
    // Delete business applications by email
    if (userEmail) {
      const { error: appsDeleteError } = await sb
        .from('business_applications')
        .delete()
        .eq('email', userEmail)
      
      if (appsDeleteError) {
        console.error('[Delete User] Error deleting business applications:', appsDeleteError)
        // Don't fail on this, just log it
      } else {
        console.log(`[Delete User] Deleted ${businessApplications?.length || 0} business applications`)
      }
    }
    
    // Delete contact leads by email
    if (userEmail) {
      const { error: leadsDeleteError } = await sb
        .from('contact_leads')
        .delete()
        .eq('contact_email', userEmail)
      
      if (leadsDeleteError) {
        console.error('[Delete User] Error deleting contact leads:', leadsDeleteError)
        // Don't fail on this, just log it
      } else {
        console.log(`[Delete User] Deleted ${contactLeads?.length || 0} contact leads`)
      }
    }
    
    // Delete user notifications
    const { error: notificationsDeleteError } = await sb
      .from('user_notifications')
      .delete()
      .eq('user_id', user_id)
    
    if (notificationsDeleteError) {
      console.error('[Delete User] Error deleting notifications:', notificationsDeleteError)
      // Don't fail on this, just log it
    } else {
      console.log(`[Delete User] Deleted ${notifications?.length || 0} notifications`)
    }
    
    // Delete provider job posts (foreign key dependency)
    if (providers && providers.length > 0) {
      const providerIds = providers.map(p => p.id)
      const { error: jobPostDeleteError } = await sb
        .from('provider_job_posts')
        .delete()
        .in('provider_id', providerIds)
      
      if (jobPostDeleteError) {
        console.error('[Delete User] Error deleting job posts:', jobPostDeleteError)
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Database error deleting user job posts',
            details: jobPostDeleteError.message,
            code: jobPostDeleteError.code,
            hint: jobPostDeleteError.hint
          })
        }
      }
      console.log(`[Delete User] Deleted job posts for ${providerIds.length} providers`)
    }
    
    // Delete provider change requests - FIXED: using correct field name 'owner_user_id'
    const { error: changeRequestDeleteError } = await sb
      .from('provider_change_requests')
      .delete()
      .eq('owner_user_id', user_id)
    
    if (changeRequestDeleteError) {
      console.error('[Delete User] Error deleting change requests:', changeRequestDeleteError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error deleting user change requests',
          details: changeRequestDeleteError.message,
          code: changeRequestDeleteError.code,
          hint: changeRequestDeleteError.hint
        })
      }
    }
    console.log(`[Delete User] Deleted change requests`)
    
    // Delete provider listings
    const { error: providerDeleteError } = await sb
      .from('providers')
      .delete()
      .eq('owner_user_id', user_id)
    
    if (providerDeleteError) {
      console.error('[Delete User] Error deleting providers:', providerDeleteError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error deleting user providers',
          details: providerDeleteError.message,
          code: providerDeleteError.code,
          hint: providerDeleteError.hint
        })
      }
    }
    console.log(`[Delete User] Deleted ${providers?.length || 0} provider listings`)
    
    // Delete profile
    const { error: profileDeleteError } = await sb
      .from('profiles')
      .delete()
      .eq('id', user_id)
    
    if (profileDeleteError) {
      console.error('[Delete User] Error deleting profile:', profileDeleteError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error deleting user profile',
          details: profileDeleteError.message,
          code: profileDeleteError.code,
          hint: profileDeleteError.hint
        })
      }
    }
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
    const { error: authDeleteError } = await (sb as any).auth.admin.deleteUser(user_id)
    if (authDeleteError) {
      console.error('[Delete User] Error deleting auth user:', authDeleteError)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Database error deleting auth user',
          details: authDeleteError.message,
          code: authDeleteError.code || 'AUTH_DELETE_ERROR',
          hint: 'The user data has been archived but auth deletion failed'
        })
      }
    }
    
    console.log(`[Delete User] Successfully deleted user ${user_id} and all associated data`)
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    console.error('[Delete User] Unexpected error:', err)
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Server error',
        details: err?.message || 'Unknown server error',
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      })
    }
  }
}


