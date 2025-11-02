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
