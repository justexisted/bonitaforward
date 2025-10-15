import { createClient } from '@supabase/supabase-js'

export default async (req: any, context: any) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      }
    }

    // Extract the token
    const token = authHeader.split(' ')[1]
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No token provided' })
      }
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_emails')
      .select('email')
      .eq('email', user.email)
      .single()

    if (adminError || !adminCheck) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied - admin only' })
      }
    }

    // Fetch job posts with provider and profile details
    const { data: jobPosts, error: jobPostsError } = await supabase
      .from('provider_job_posts')
      .select(`
        *,
        provider:providers(id, name, email),
        owner:profiles(id, email, name)
      `)
      .order('created_at', { ascending: false })

    if (jobPostsError) {
      console.error('Error fetching job posts:', jobPostsError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch job posts' })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ jobPosts: jobPosts || [] })
    }

  } catch (error: any) {
    console.error('Admin job posts function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
