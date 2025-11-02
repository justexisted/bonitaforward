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

    // Fetch user from auth.users table
    const { data: { user }, error: userError } = await (supabaseClient as any).auth.admin.getUserById(user_id)
    
    if (userError) {
      console.error(`[admin-get-user] Error fetching user ${user_id}:`, userError)
      return errorResponse(404, 'User not found', userError.message)
    }

    if (!user) {
      return errorResponse(404, 'User not found', 'User does not exist')
    }

    // Return user data
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at
      }
    })
  } catch (err: any) {
    console.error('[admin-get-user] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
