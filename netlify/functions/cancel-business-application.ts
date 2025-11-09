import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { checkIsAdmin } from './utils/admin'

interface CancelApplicationBody {
  application_id?: string
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions()
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    const { url, serviceRole, anonKey } = getSupabaseConfig()
    const authResult = await extractAndVerifyToken(event, url, anonKey)

    if (!authResult.success || !authResult.user) {
      return errorResponse(authResult.statusCode || 401, authResult.error || 'Authentication failed')
    }

    const { id: userId, email: userEmail } = authResult.user

    const supabaseClient = createClient(url, serviceRole, {
      auth: { persistSession: false }
    })

    const body: CancelApplicationBody = JSON.parse(event.body || '{}')
    const applicationId = body.application_id

    if (!applicationId) {
      return errorResponse(400, 'Missing application_id')
    }

    console.log('[CancelApplication] Request received:', {
      applicationId,
      userId,
      userEmail
    })

    const { data: application, error: fetchError } = await supabaseClient
      .from('business_applications')
      .select('id, email, status')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError) {
      console.error('[CancelApplication] Fetch error:', fetchError)
      return errorResponse(500, 'Failed to load application', fetchError.message)
    }

    if (!application) {
      return errorResponse(404, 'Application not found')
    }

    const adminCheck = await checkIsAdmin(userId, userEmail, supabaseClient)
    const isOwner = application.email?.toLowerCase() === (userEmail || '').toLowerCase()

    if (!isOwner && !adminCheck.isAdmin) {
      console.warn('[CancelApplication] Permission denied:', {
        applicationEmail: application.email,
        userEmail,
        isAdmin: adminCheck.isAdmin
      })
      return errorResponse(403, 'Permission denied', 'You can only cancel your own applications')
    }

    if (application.status && application.status !== 'pending') {
      console.log('[CancelApplication] Application already decided:', {
        applicationId,
        status: application.status
      })

      return successResponse({
        message: `Application already marked as ${application.status}`,
        applicationId,
        status: application.status
      })
    }

    const timestamp = new Date().toISOString()

    const { error: updateError } = await supabaseClient
      .from('business_applications')
      .update({
        status: 'cancelled',
        decided_at: timestamp,
        updated_at: timestamp
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('[CancelApplication] Update failed:', updateError)
      return errorResponse(500, 'Failed to cancel application', updateError.message)
    }

    console.log('[CancelApplication] Application cancelled successfully:', {
      applicationId,
      timestamp
    })

    return successResponse({
      message: 'Application cancelled successfully',
      applicationId,
      status: 'cancelled',
      cancelled_at: timestamp
    })
  } catch (err: any) {
    console.error('[CancelApplication] Unexpected error:', err)
    return errorResponse(500, 'Server error', err?.message || 'Unknown error')
  }
}

