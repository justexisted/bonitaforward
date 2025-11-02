import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify auth and admin status
    const authAdminResult = await verifyAuthAndAdmin(event)
    
    if (!authAdminResult.success || !authAdminResult.supabaseClient) {
      return authAdminErrorResponse(authAdminResult)
    }

    const { supabaseClient } = authAdminResult

    // Get user_id from request body
    const body = JSON.parse(event.body || '{}') as { user_id?: string }
    const user_id = body.user_id
    if (!user_id) {
      return errorResponse(400, 'Missing user_id')
    }

    console.log(`[admin-sync-profile] Syncing profile for user: ${user_id}`)

    // Step 1: Fetch user from auth.users table
    const { data: { user }, error: userError } = await (supabaseClient as any).auth.admin.getUserById(user_id)
    
    if (userError || !user) {
      console.error(`[admin-sync-profile] User not found in auth.users:`, userError)
      return errorResponse(404, 'User not found in auth system', userError?.message || 'Unknown error')
    }

    console.log(`[admin-sync-profile] Found user in auth.users:`, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    })

    // Step 2: Check if profile already exists
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle()

    if (existingProfile) {
      console.log(`[admin-sync-profile] Profile already exists, updating...`)
      
      // Update existing profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          role: user.user_metadata?.role || 'business',
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)

      if (updateError) {
        console.error(`[admin-sync-profile] Error updating profile:`, updateError)
        return errorResponse(500, 'Failed to update profile', updateError.message)
      }

      return successResponse({ 
        success: true, 
        message: 'Profile updated successfully',
        user_id,
        email: user.email
      })
    }

    // Step 3: Create new profile
    console.log(`[admin-sync-profile] Creating new profile...`)
    const { error: insertError } = await supabaseClient
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
      return errorResponse(500, 'Failed to create profile', insertError.message)
    }

    console.log(`[admin-sync-profile] ✓ Profile created for ${user.email}`)

    return successResponse({ 
      success: true, 
      message: 'Profile created successfully',
      user_id,
      email: user.email
    })
  } catch (err: any) {
    console.error('[admin-sync-profile] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
