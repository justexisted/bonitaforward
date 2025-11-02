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
      // Return 403 if admin check failed (not just auth)
      if (authAdminResult.statusCode === 403) {
        return successResponse({ 
          isAdmin: false, 
          error: authAdminResult.error || 'Admin access required' 
        })
      }
      return authAdminErrorResponse(authAdminResult)
    }

    const { userId, email, adminMethod, supabaseClient } = authAdminResult

    // Log admin access for audit trail
    try {
      await supabaseClient.from('admin_audit_log').insert({
        admin_user_id: userId,
        admin_email: email,
        action: 'admin_verify',
        timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
    } catch {
      // audit log table doesn't exist yet, that's okay
    }

    return successResponse({ 
      isAdmin: true, 
      userId,
      email,
      method: adminMethod || 'email'
    })
  } catch (err: any) {
    console.error('[admin-verify] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
