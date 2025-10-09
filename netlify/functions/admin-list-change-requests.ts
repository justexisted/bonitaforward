// Netlify function to fetch change requests with joined profile and provider data
// Uses Service Role Key to bypass RLS and ensure all data is fetched correctly

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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' }
  }
  
  try {
    // Verify admin authorization
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, headers, body: 'Unauthorized' }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify admin
    const { data: adminUserData, error: getAdminErr } = await (sb as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      return { statusCode: 401, headers, body: 'Invalid token' }
    }

    const adminEmail = adminUserData.user.email?.toLowerCase()
    const adminEmails = (process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    
    const isEmailAdmin = adminEmails.length > 0 ? 
      adminEmails.includes(adminEmail || '') : 
      adminEmail === 'justexisted@gmail.com'

    let isDatabaseAdmin = false
    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', adminUserData.user.id)
        .single()
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {}

    if (!isEmailAdmin && !isDatabaseAdmin) {
      return { statusCode: 403, headers, body: 'Admin access required' }
    }

    console.log('[admin-list-change-requests] Fetching change requests with service role...')

    // Fetch change requests using service role (bypasses RLS)
    const { data: requests, error: requestsError } = await sb
      .from('provider_change_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('[admin-list-change-requests] Error fetching requests:', requestsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: requestsError.message, requests: [] })
      }
    }

    console.log(`[admin-list-change-requests] Found ${requests?.length || 0} requests`)

    // Enrich with provider and profile data
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request) => {
        // Fetch provider info
        let providerInfo = null
        if (request.provider_id) {
          const { data: provider } = await sb
            .from('providers')
            .select('id, name, email')
            .eq('id', request.provider_id)
            .maybeSingle()
          providerInfo = provider
        }

        // Fetch profile info - using service role bypasses RLS
        let profileInfo = null
        if (request.owner_user_id) {
          const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('id, email, name')
            .eq('id', request.owner_user_id)
            .maybeSingle()

          if (profileError) {
            console.error(`[admin-list-change-requests] Error fetching profile for ${request.owner_user_id}:`, profileError)
          } else if (!profile) {
            console.warn(`[admin-list-change-requests] No profile in profiles table for ${request.owner_user_id}, checking auth.users...`)
            
            // Profile doesn't exist - get from auth.users and create it
            const { data: { user }, error: authError } = await (sb as any).auth.admin.getUserById(request.owner_user_id)
            
            if (user && !authError) {
              console.log(`[admin-list-change-requests] Found in auth.users, creating profile...`)
              
              // Create the missing profile
              const { error: createError } = await sb
                .from('profiles')
                .insert({
                  id: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || user.user_metadata?.full_name || null,
                  role: user.user_metadata?.role || 'business',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              
              if (createError) {
                console.error(`[admin-list-change-requests] Error creating profile:`, createError)
              } else {
                console.log(`[admin-list-change-requests] ✓ Created missing profile for ${user.email}`)
              }
              
              // Use the auth data as profile info
              profileInfo = {
                id: user.id,
                email: user.email || null,
                name: user.user_metadata?.name || user.user_metadata?.full_name || null
              }
            } else {
              console.error(`[admin-list-change-requests] User not found in auth.users either:`, authError)
            }
          } else {
            profileInfo = profile
          }
        }

        return {
          ...request,
          providers: providerInfo,
          profiles: profileInfo
        }
      })
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ requests: enrichedRequests })
    }
    
  } catch (err: any) {
    console.error('[admin-list-change-requests] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Server error', requests: [] })
    }
  }
}

