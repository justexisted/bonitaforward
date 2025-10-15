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

  // Admin verification
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
    console.warn(`Non-admin user (${userEmail}) attempted to access admin-update-provider`)
    return { statusCode: 403, body: 'Forbidden: Not an administrator' }
  }

  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}
    const { providerId, updates } = body

    if (!providerId || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: providerId and updates' }),
      }
    }

    // Update the provider using service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()

    if (error) {
      console.error('Error updating provider:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update provider', details: error.message }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, provider: data[0] }),
    }
  } catch (error: any) {
    console.error('Exception in admin-update-provider:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
