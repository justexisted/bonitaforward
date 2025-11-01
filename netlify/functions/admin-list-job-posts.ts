import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

function getEnv(name: string, fallbackName?: string): string {
  const v = process.env[name] || (fallbackName ? process.env[fallbackName] : '')
  if (!v) throw new Error(`Missing env ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`)
  return v
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    // Verify admin authorization first
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) {
      return { statusCode: 401, body: 'Unauthorized: No token provided' }
    }

    const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = getEnv('SUPABASE_SERVICE_ROLE')
    const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // CRITICAL FIX: Verify the JWT token using ANON key (service role can't verify user tokens)
    const { data: userResponse, error: userError } = await (sbAnon as any).auth.getUser(token)
    if (userError || !userResponse?.user) {
      console.error('[admin-list-job-posts] Token verification failed:', userError)
      return { statusCode: 401, body: `Unauthorized: ${userError?.message || 'Invalid token'}` }
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
      console.warn(`[admin-list-job-posts] Non-admin user (${adminEmail}) attempted access`)
      return { statusCode: 403, body: 'Forbidden: Not an administrator' }
    }
    // Fetch all job posts first, then enrich with provider and profile data
    const { data: jobPosts, error } = await supabaseAdmin
      .from('provider_job_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching job posts:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch job posts', details: error.message }),
      }
    }

    // Enrich job posts with provider and profile information
    const enrichedJobPosts = await Promise.all(
      (jobPosts || []).map(async (jobPost) => {
        let providerInfo = null
        let ownerInfo = null

        // Fetch provider information
        if (jobPost.provider_id) {
          const { data: provider, error: providerError } = await supabaseAdmin
            .from('providers')
            .select('id, name, email')
            .eq('id', jobPost.provider_id)
            .maybeSingle()
          
          if (!providerError && provider) {
            providerInfo = provider
          }
        }

        // Fetch owner profile information
        if (jobPost.owner_user_id) {
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, name')
            .eq('id', jobPost.owner_user_id)
            .maybeSingle()
          
          if (!profileError && profile) {
            ownerInfo = profile
          }
        }

        return {
          ...jobPost,
          provider: providerInfo,
          owner: ownerInfo
        }
      })
    )

    return {
      statusCode: 200,
      body: JSON.stringify({ jobPosts: enrichedJobPosts }),
    }
  } catch (error: any) {
    console.error('[admin-list-job-posts] Exception:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
