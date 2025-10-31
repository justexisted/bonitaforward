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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
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
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
    // Try both VITE_ and non-VITE_ versions (Netlify backend might not have VITE_ vars)
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify admin using ANON key (service role can't verify user tokens)
    const { data: adminUserData, error: getAdminErr } = await (sbAnon as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      console.error('[admin-list-change-requests] Token verification failed:', getAdminErr)
      console.error('[admin-list-change-requests] Has ANON key?', !!SUPABASE_ANON_KEY)
      console.error('[admin-list-change-requests] Token length:', token?.length)
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ 
          error: 'Invalid token',
          details: getAdminErr?.message || 'No user data',
          hasAnonKey: !!SUPABASE_ANON_KEY
        })
      }
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

    console.log('========================================')
    console.log('[admin-list-change-requests] Starting function')
    console.log('[admin-list-change-requests] Admin user:', adminEmail)
    console.log('========================================')

    // Fetch change requests using service role (bypasses RLS)
    const { data: requests, error: requestsError } = await sb
      .from('provider_change_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('[admin-list-change-requests] ❌ Error fetching requests:', requestsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: requestsError.message, requests: [] })
      }
    }

    console.log(`[admin-list-change-requests] ✓ Found ${requests?.length || 0} requests in database`)

    // Enrich with provider and profile data
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request, index) => {
        console.log(`\n[admin-list-change-requests] Processing request ${index + 1}/${requests.length}`)
        console.log(`[admin-list-change-requests]   ID: ${request.id}`)
        console.log(`[admin-list-change-requests]   Type: ${request.type}`)
        console.log(`[admin-list-change-requests]   Owner User ID: ${request.owner_user_id}`)
        
        // Fetch provider info
        let providerInfo: { id: string; name: string; email: string | null } | null = null
        if (request.provider_id) {
          const { data: provider, error: provError } = await sb
            .from('providers')
            .select('id, name, email')
            .eq('id', request.provider_id)
            .maybeSingle()
          
          if (provError) {
            console.error(`[admin-list-change-requests]   ❌ Provider fetch error:`, provError)
          } else {
            console.log(`[admin-list-change-requests]   ✓ Provider:`, provider?.name)
            providerInfo = provider
          }
        }

        // Fetch profile info - using service role bypasses RLS
        let profileInfo: { id: string; email: string; name: string | null } | null = null
        if (request.owner_user_id) {
          console.log(`[admin-list-change-requests]   Looking up profile for: ${request.owner_user_id}`)
          
          const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('id, email, name')
            .eq('id', request.owner_user_id)
            .maybeSingle()

          if (profileError) {
            console.error(`[admin-list-change-requests]   ❌ Profile fetch error:`, profileError)
          } else if (!profile) {
            console.warn(`[admin-list-change-requests]   ⚠️ No profile in profiles table, checking auth.users...`)
            
            // Profile doesn't exist - get from auth.users and create it
            const { data: { user }, error: authError } = await (sb as any).auth.admin.getUserById(request.owner_user_id)
            
            console.log(`[admin-list-change-requests]   Auth lookup result:`, {
              hasUser: !!user,
              email: user?.email,
              name: user?.user_metadata?.name,
              error: authError?.message
            })
            
            if (user && !authError) {
              console.log(`[admin-list-change-requests]   ✓ Found in auth.users, creating profile...`)
              
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
                console.error(`[admin-list-change-requests]   ❌ Error creating profile:`, createError)
              } else {
                console.log(`[admin-list-change-requests]   ✓ Profile created for ${user.email}`)
              }
              
              // Use the auth data as profile info
              profileInfo = {
                id: user.id,
                email: user.email || null,
                name: user.user_metadata?.name || user.user_metadata?.full_name || null
              }
              console.log(`[admin-list-change-requests]   ✓ Profile info set:`, profileInfo)
            } else {
              console.error(`[admin-list-change-requests]   ❌ User not found in auth.users:`, authError)
            }
          } else {
            console.log(`[admin-list-change-requests]   ✓ Found profile:`, {
              email: profile.email,
              name: profile.name
            })
            profileInfo = profile
          }
        }

        const enriched = {
          ...request,
          providers: providerInfo,
          profiles: profileInfo
        }
        
        console.log(`[admin-list-change-requests]   Final enriched data:`, {
          hasProviders: !!enriched.providers,
          hasProfiles: !!enriched.profiles,
          profileEmail: enriched.profiles?.email
        })
        
        return enriched
      })
    )

    console.log('========================================')
    console.log(`[admin-list-change-requests] ✓ Returning ${enrichedRequests.length} enriched requests`)
    console.log('========================================')

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

