import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Admin verification (similar to admin-verify function)
  const token = event.headers.authorization?.split(' ')[1]
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized: No token provided' }
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userResponse.user) {
    console.error('Admin verification failed:', userError?.message)
    return { statusCode: 401, body: `Unauthorized: ${userError?.message || 'Invalid token'}` }
  }

  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const userEmail = userResponse.user.email?.toLowerCase()

  if (!userEmail || !adminEmails.includes(userEmail)) {
    console.warn(`Non-admin user (${userEmail}) attempted to access admin-list-job-posts`)
    return { statusCode: 403, body: 'Forbidden: Not an administrator' }
  }

  try {
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
    console.error('Exception in admin-list-job-posts:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
