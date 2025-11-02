/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - verifyAuthAndAdmin(): Verifies user is authenticated and admin
 *   → CRITICAL: Must return supabaseClient with service role key
 * - provider_change_requests table: NOT owner_change_requests!
 *   → CRITICAL: Table name is provider_change_requests (not owner_change_requests)
 * - utils/response: Standardized response format
 *   → CRITICAL: Returns { success: true, ok: true, requests: [...] }
 * 
 * WHAT DEPENDS ON THIS:
 * - Admin.tsx: Loads change requests via DataLoadingUtils.loadChangeRequests()
 * - ChangeRequestsSection: Displays change requests from Admin.tsx
 * 
 * BREAKING CHANGES:
 * - If you use wrong table name → 500 error "table not found"
 * - If you change response format → DataLoadingUtils won't find requests
 * - If table schema changes → Query fails or returns wrong data
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Verify table name is provider_change_requests (NOT owner_change_requests)
 * 2. Check table schema matches query fields
 * 3. Verify response format matches DataLoadingUtils expectations
 * 4. Test Admin.tsx still loads change requests
 * 5. Test ChangeRequestsSection still displays data
 * 
 * RELATED FILES:
 * - src/utils/adminDataLoadingUtils.ts: loadChangeRequests() calls this
 * - src/pages/Admin.tsx: Uses loadChangeRequests() from DataLoadingUtils
 * - src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx: Displays data
 * 
 * RECENT BREAKS:
 * - Wrong table name (2025-01-XX): Used owner_change_requests instead of provider_change_requests
 *   → Fix: Changed to provider_change_requests (correct table name)
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify auth and admin status
    const authAdminResult = await verifyAuthAndAdmin(event)
    
    if (!authAdminResult.success || !authAdminResult.supabaseClient) {
      return authAdminErrorResponse(authAdminResult)
    }

    const { supabaseClient, email } = authAdminResult

    console.log('[admin-list-change-requests] Admin user:', email)

    // Fetch change requests using service role (bypasses RLS)
    // Table: provider_change_requests (columns: id, provider_id, owner_user_id, type, changes, status, reason, created_at, decided_at)
    const { data: changeRequests, error: changeRequestsError } = await supabaseClient
      .from('provider_change_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (changeRequestsError) {
      console.error('[admin-list-change-requests] Error fetching change requests:', changeRequestsError)
      return errorResponse(500, 'Failed to fetch change requests', changeRequestsError.message)
    }

    // Enrich change requests with provider and owner profile data
    const enrichedRequests = await Promise.all(
      (changeRequests || []).map(async (request: any) => {
        let providerInfo = null
        let ownerProfile = null

        // Fetch provider information
        if (request.provider_id) {
          const { data: provider } = await supabaseClient
            .from('providers')
            .select('id, name, email, category_key')
            .eq('id', request.provider_id)
            .maybeSingle()
          
          if (provider) providerInfo = provider
        }

        // Fetch owner profile (the user who made the request)
        if (request.owner_user_id) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, email, name, role')
            .eq('id', request.owner_user_id)
            .maybeSingle()
          
          if (profile) ownerProfile = profile
        }

        return {
          ...request,
          provider: providerInfo,
          owner: ownerProfile
        }
      })
    )

    return successResponse({ requests: enrichedRequests || [] })
  } catch (err: any) {
    console.error('[admin-list-change-requests] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
