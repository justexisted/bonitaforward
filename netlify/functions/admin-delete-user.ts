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

    console.log(`[admin-delete-user] Deleting user: ${user_id}`)

    // Prevent admins from deleting themselves
    if (user_id === authAdminResult.userId) {
      return errorResponse(400, 'Cannot delete your own account', 'Admins cannot delete themselves')
    }

    // Step 1: Delete from auth.users using Admin API
    const { error: authError } = await (supabaseClient as any).auth.admin.deleteUser(user_id)
    
    if (authError) {
      console.error(`[admin-delete-user] Error deleting from auth.users:`, authError)
      return errorResponse(500, 'Failed to delete user from auth system', authError.message)
    }

    console.log(`[admin-delete-user] ✓ Deleted user from auth.users`)

    // Step 2: Delete from profiles table (cascade should handle most, but ensure it's done)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', user_id)

    if (profileError) {
      console.warn(`[admin-delete-user] Warning deleting profile:`, profileError)
      // Don't fail the whole operation if profile deletion fails (might already be deleted)
    }

    return successResponse({ 
      success: true, 
      message: `User ${user_id} deleted successfully`
    })
  } catch (err: any) {
    console.error('[admin-delete-user] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
