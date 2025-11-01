import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  // Admin verification
  const token = event.headers.authorization?.split(' ')[1]
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: No token provided' }) }
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userResponse.user) {
    console.error('[admin-update-provider] Admin verification failed:', userError?.message)
    return { statusCode: 401, headers, body: JSON.stringify({ error: `Unauthorized: ${userError?.message || 'Invalid token'}` }) }
  }

  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const userEmail = userResponse.user.email?.toLowerCase()

  if (!userEmail || !adminEmails.includes(userEmail)) {
    console.warn(`[admin-update-provider] Non-admin user (${userEmail}) attempted to access admin-update-provider`)
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Not an administrator' }) }
  }

  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}
    const { providerId, updates } = body

    if (!providerId || !updates) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: providerId and updates' }),
      }
    }

    console.log('[admin-update-provider] Updating provider:', providerId, 'with updates:', JSON.stringify(updates))

    // Update the provider using service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()

    if (error) {
      console.error('[admin-update-provider] Error updating provider:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update provider', details: error.message }),
      }
    }

    console.log('[admin-update-provider] Successfully updated provider:', providerId, 'New tags:', updates.tags)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, provider: data[0] }),
    }
  } catch (error: any) {
    console.error('[admin-update-provider] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
