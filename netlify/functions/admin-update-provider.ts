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

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}
    const { providerId, updates } = body

    if (!providerId || !updates) {
      return errorResponse(400, 'Missing required fields', 'providerId and updates are required')
    }

    console.log('[admin-update-provider] Updating provider:', providerId, 'with updates:', JSON.stringify(updates))

    // Update the provider using service role to bypass RLS
    const { data, error } = await supabaseClient
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()

    if (error) {
      console.error('[admin-update-provider] Error updating provider:', error)
      return errorResponse(500, 'Failed to update provider', error.message)
    }

    console.log('[admin-update-provider] Successfully updated provider:', providerId, 'New tags:', updates.tags)

    return successResponse({ success: true, provider: data[0] })
  } catch (error: any) {
    console.error('[admin-update-provider] Exception:', error)
    return errorResponse(500, 'Internal server error', error.message)
  }
}
