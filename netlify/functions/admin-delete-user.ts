/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - verifyAuthAndAdmin(): Verifies user is authenticated and admin
 *   → CRITICAL: Must return supabaseClient with service role key
 * - utils/userDeletion: Shared deletion utility
 *   → CRITICAL: Ensures correct deletion order (related data → auth user)
 * - utils/response: Standardized response format
 *   → CRITICAL: Returns { success: true, ok: true, ... }
 * 
 * WHAT DEPENDS ON THIS:
 * - adminUserUtils.deleteUser(): Calls this function
 *   → CRITICAL: Expects response format { success: true, ok: true, ... }
 * - Admin.tsx: Uses deleteUser() from adminUserUtils
 * - UsersSection: Calls deleteUser() from Admin.tsx
 * 
 * BREAKING CHANGES:
 * - If you change deletion order → Foreign key constraint errors
 * - If you change response format → adminUserUtils won't recognize success
 * - If you change userDeletion utility → Both admin-delete-user and user-delete break
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Update utils/userDeletion.ts FIRST (shared utility)
 * 2. Verify deletion order is correct (related data → auth user)
 * 3. Test both admin-delete-user and user-delete
 * 4. Verify response format matches adminUserUtils expectations
 * 5. Test admin UI still works after changes
 * 
 * RELATED FILES:
 * - netlify/functions/utils/userDeletion.ts: Shared deletion logic
 * - netlify/functions/user-delete.ts: Self-delete endpoint (uses same utility)
 * - src/utils/adminUserUtils.ts: Frontend wrapper for this function
 * - src/pages/Admin.tsx: Uses adminUserUtils.deleteUser()
 * 
 * RECENT BREAKS:
 * - User deletion failing (2025-01-XX): Wrong deletion order (auth user before related data)
 *   → Fix: Use shared userDeletion utility that ensures correct order
 * - API response format (2025-01-XX): Changed from { ok: true } to { success: true }
 *   → Fix: successResponse() now includes both for backward compatibility
 * 
 * See: docs/prevention/API_CONTRACT_PREVENTION.md
 * See: docs/prevention/ASYNC_FLOW_PREVENTION.md
 */

/**
 * Admin user deletion endpoint
 * 
 * CRITICAL: Uses shared deletion utility to ensure correct deletion order
 * (related data first, auth user last) to prevent foreign key constraint errors.
 */

import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { deleteUserAndRelatedData, getUserEmailFromProfile } from './utils/userDeletion'

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

    // Get user email from profile (needed for deleting email-keyed data)
    const userEmail = await getUserEmailFromProfile(user_id, supabaseClient)

    // Use shared deletion utility to ensure correct deletion order
    const deletionResult = await deleteUserAndRelatedData({
      userId: user_id,
      userEmail,
      supabaseClient,
      logPrefix: '[admin-delete-user]'
    })

    if (!deletionResult.success) {
      console.error(`[admin-delete-user] Deletion failed:`, deletionResult.error)
      return errorResponse(500, 'Failed to delete user from auth system', deletionResult.error)
    }

    console.log(`[admin-delete-user] ✓ User deletion completed successfully`, deletionResult.deletedCounts)

    // successResponse() automatically includes success: true and ok: true
    return successResponse({ 
      message: `User ${user_id} deleted successfully`,
      deletedCounts: deletionResult.deletedCounts
    })
  } catch (err: any) {
    console.error('[admin-delete-user] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
