// Local minimal Netlify Handler type
type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
  clientContext?: any
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }> 

import { createClient } from '@supabase/supabase-js'

// Netlify function to sync/create a missing profile from auth.users table
// This fixes the "Unknown Owner" issue when profiles are missing
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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
  
  if (event.httpMethod !== 'POST') {
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

    // Verify the JWT token and get admin user info
    const { data: adminUserData, error: getAdminErr } = await (sb as any).auth.getUser(token)
    if (getAdminErr || !adminUserData?.user?.id) {
      return { statusCode: 401, headers, body: 'Invalid token' }
    }

    const adminEmail = adminUserData.user.email?.toLowerCase()

    // Check if user is admin
    const adminEmails = (process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    
    const isEmailAdmin = adminEmails.length > 0 ? 
      adminEmails.includes(adminEmail || '') : 
      adminEmail === 'justexisted@gmail.com'

    // Check database for is_admin flag
    let isDatabaseAdmin = false
    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', adminUserData.user.id)
        .single()
      
      isDatabaseAdmin = Boolean(profile?.is_admin)
    } catch {
      // is_admin column doesn't exist yet, that's okay
    }

    if (!isEmailAdmin && !isDatabaseAdmin) {
      return { statusCode: 403, headers, body: 'Admin access required' }
    }

    // Get user_id from request body
    const body = JSON.parse(event.body || '{}') as { user_id?: string }
    const user_id = body.user_id
    if (!user_id) {
      return { statusCode: 400, headers, body: 'Missing user_id' }
    }

    console.log(`[admin-sync-profile] Syncing profile for user: ${user_id}`)

    // Step 1: Fetch user from auth.users table
    const { data: { user }, error: userError } = await (sb as any).auth.admin.getUserById(user_id)
    
    if (userError || !user) {
      console.error(`[admin-sync-profile] User not found in auth.users:`, userError)
      return {
        statusCode: 404,
        headers,
        body: `User not found in auth system: ${userError?.message || 'Unknown error'}`
      }
    }

    console.log(`[admin-sync-profile] Found user in auth.users:`, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    })

    // Step 2: Check if profile already exists
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle()

    if (existingProfile) {
      console.log(`[admin-sync-profile] Profile already exists, updating with auth data...`)
      
      // Update existing profile with auth data
      const { error: updateError } = await sb
        .from('profiles')
        .update({
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
      
      if (updateError) {
        console.error(`[admin-sync-profile] Error updating profile:`, updateError)
        return {
          statusCode: 500,
          headers,
          body: `Failed to update profile: ${updateError.message}`
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Profile updated successfully',
          profile: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name
          }
        })
      }
    }

    // Step 3: Create new profile from auth user data
    console.log(`[admin-sync-profile] Creating new profile from auth data...`)
    
    const { error: insertError } = await sb
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        role: user.user_metadata?.role || 'business',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error(`[admin-sync-profile] Error creating profile:`, insertError)
      return {
        statusCode: 500,
        headers,
        body: `Failed to create profile: ${insertError.message}`
      }
    }

    console.log(`[admin-sync-profile] Successfully created profile for ${user.email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Profile created successfully',
        profile: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name
        }
      })
    }
    
  } catch (err: any) {
    console.error('[admin-sync-profile] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: err?.message || 'Server error'
    }
  }
}

