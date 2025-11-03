/**
 * Self-service user deletion endpoint
 * 
 * CRITICAL: Uses shared deletion utility to ensure correct deletion order
 * (related data first, auth user last) to prevent foreign key constraint errors.
 */

import { Handler } from '@netlify/functions'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { createClient } from '@supabase/supabase-js'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { deleteUserAndRelatedData } from './utils/userDeletion'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify token (user deleting themselves, not admin-only)
    const { url, serviceRole, anonKey } = getSupabaseConfig()
    const authResult = await extractAndVerifyToken(event, url, anonKey)
    
    if (!authResult.success || !authResult.user) {
      return errorResponse(401, 'Authentication failed', authResult.error)
    }

    const userId = authResult.user.id
    const userEmail = authResult.user.email || null
    const supabaseClient = createClient(url, serviceRole, { auth: { persistSession: false } })

    // Parse request body for deleteBusinesses option
    const body = JSON.parse(event.body || '{}') as { deleteBusinesses?: boolean }
    const deleteBusinesses = body.deleteBusinesses === true

    // Use shared deletion utility to ensure correct deletion order
    // This handles all related data deletion before auth user deletion
    const deletionResult = await deleteUserAndRelatedData({
      userId,
      userEmail,
      supabaseClient,
      logPrefix: '[user-delete]',
      deleteBusinesses
    })

    if (!deletionResult.success) {
      console.error(`[user-delete] Deletion failed:`, deletionResult.error)
      return errorResponse(400, 'Failed to delete user', deletionResult.error)
    }

    console.log(`[user-delete] ✓ User deletion completed successfully`, deletionResult.deletedCounts)

    // successResponse() automatically includes success: true and ok: true
    return successResponse({ 
      deletedCounts: deletionResult.deletedCounts
    })
  } catch (err: any) {
    console.error('[user-delete] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
