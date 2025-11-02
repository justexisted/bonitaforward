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

    // Fetch all job posts first, then enrich with provider and profile data
    const { data: jobPosts, error } = await supabaseClient
      .from('provider_job_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin-list-job-posts] Error fetching job posts:', error)
      return errorResponse(500, 'Failed to fetch job posts', error.message)
    }

    // Enrich job posts with provider and profile information
    const enrichedJobPosts = await Promise.all(
      (jobPosts || []).map(async (jobPost) => {
        let providerInfo = null
        let ownerInfo = null

        // Fetch provider information
        if (jobPost.provider_id) {
          const { data: provider, error: providerError } = await supabaseClient
            .from('providers')
            .select('id, name, email')
            .eq('id', jobPost.provider_id)
            .maybeSingle()
          
          if (!providerError && provider) {
            providerInfo = provider
          }
        }

        // Fetch owner profile information
        if (jobPost.owner_user_id) {
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, email, name')
            .eq('id', jobPost.owner_user_id)
            .maybeSingle()
          
          if (!profileError && profile) {
            ownerInfo = profile
          }
        }

        return {
          ...jobPost,
          provider: providerInfo,
          owner: ownerInfo
        }
      })
    )

    return successResponse({ jobPosts: enrichedJobPosts })
  } catch (error: any) {
    console.error('[admin-list-job-posts] Exception:', error)
    return errorResponse(500, 'Internal server error', error.message)
  }
}
