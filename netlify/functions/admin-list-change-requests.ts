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
    const { data: changeRequests, error: changeRequestsError } = await supabaseClient
      .from('owner_change_requests')
      .select(`
        id,
        provider_id,
        requested_by_email,
        requested_by_name,
        current_owner_email,
        current_owner_name,
        new_owner_email,
        new_owner_name,
        status,
        reason,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (changeRequestsError) {
      console.error('[admin-list-change-requests] Error fetching change requests:', changeRequestsError)
      return errorResponse(500, 'Failed to fetch change requests', changeRequestsError.message)
    }

    // Enrich change requests with provider and profile data
    const enrichedRequests = await Promise.all(
      (changeRequests || []).map(async (request) => {
        let providerInfo = null
        let requestedByProfile = null
        let currentOwnerProfile = null
        let newOwnerProfile = null

        // Fetch provider information
        if (request.provider_id) {
          const { data: provider } = await supabaseClient
            .from('providers')
            .select('id, name, email, category_key')
            .eq('id', request.provider_id)
            .maybeSingle()
          
          if (provider) providerInfo = provider
        }

        // Fetch requested by profile
        if (request.requested_by_email) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, email, name, role')
            .eq('email', request.requested_by_email)
            .maybeSingle()
          
          if (profile) requestedByProfile = profile
        }

        // Fetch current owner profile
        if (request.current_owner_email) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, email, name, role')
            .eq('email', request.current_owner_email)
            .maybeSingle()
          
          if (profile) currentOwnerProfile = profile
        }

        // Fetch new owner profile
        if (request.new_owner_email) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, email, name, role')
            .eq('email', request.new_owner_email)
            .maybeSingle()
          
          if (profile) newOwnerProfile = profile
        }

        return {
          ...request,
          provider: providerInfo,
          requested_by: requestedByProfile,
          current_owner: currentOwnerProfile,
          new_owner: newOwnerProfile
        }
      })
    )

    return successResponse({ requests: enrichedRequests || [] })
  } catch (err: any) {
    console.error('[admin-list-change-requests] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
