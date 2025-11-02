/**
 * DEPENDENCY TRACKING
 *
 * WHAT THIS DEPENDS ON:
 * - utils/authAdmin (verifyAuthAndAdmin, authAdminErrorResponse): Auth and admin verification utilities
 *   → CRITICAL: verifyAuthAndAdmin() checks both auth status and admin status
 *   → CRITICAL: Returns { success, supabaseClient, userId, email, adminMethod } if admin
 *   → CRITICAL: Returns 403 if user is authenticated but not admin
 * - utils/response (successResponse, errorResponse, handleOptions): Standardized response utilities
 *   → CRITICAL: Must use successResponse() and errorResponse() for consistent API format
 *   → CRITICAL: Response format must match what useAdminVerification hook expects
 * - admin_audit_log table: Stores admin access audit trail
 *   → CRITICAL: Logs admin verification events for security auditing
 *   → CRITICAL: Table may not exist (gracefully fails if missing)
 *
 * WHAT DEPENDS ON THIS:
 * - src/hooks/useAdminVerification.ts: Calls this function for server-side admin verification
 *   → CRITICAL: If response format changes, admin verification hook breaks
 *   → CRITICAL: If this function fails, admin verification falls back to client-side check
 * - Admin.tsx: Uses isAdmin from useAdminVerification hook
 *   → CRITICAL: If admin verification fails, admin panel doesn't load
 * - All admin operations: Depend on admin verification working correctly
 *   → CRITICAL: If admin verification breaks, all admin functions fail
 *
 * BREAKING CHANGES:
 * - If you change verifyAuthAndAdmin() API → Admin verification fails
 * - If you change response format → useAdminVerification hook breaks
 * - If you change successResponse()/errorResponse() → API contract breaks
 * - If you remove audit logging → Security audit trail is lost (not critical but recommended)
 *
 * HOW TO SAFELY UPDATE:
 * 1. Check useAdminVerification hook: grep -r "admin-verify" src/
 * 2. Verify response format matches what hook expects: { isAdmin: boolean, userId?, email?, method? }
 * 3. Test admin verification: Verify admin can access admin panel
 * 4. Test non-admin users: Verify they can't access admin panel
 * 5. Test audit logging: Verify admin_audit_log table receives entries
 * 6. Test error cases: Verify error responses are formatted correctly
 *
 * RELATED FILES:
 * - src/hooks/useAdminVerification.ts: Calls this function for server-side verification
 * - netlify/functions/utils/authAdmin.ts: Provides verifyAuthAndAdmin() and authAdminErrorResponse()
 * - netlify/functions/utils/response.ts: Provides successResponse() and errorResponse()
 * - src/pages/Admin.tsx: Uses isAdmin from useAdminVerification hook
 *
 * RECENT BREAKS:
 * - None yet (this function is stable)
 *
 * See: docs/prevention/API_CONTRACT_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

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
