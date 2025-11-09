import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { checkIsAdmin } from './utils/admin'

interface DeleteApplicationBody {
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

    const body: DeleteApplicationBody = JSON.parse(event.body || '{}')
    const applicationId = body.application_id

    if (!applicationId) {
      return errorResponse(400, 'Missing application_id')
    }

    console.log('[DeleteApplication] Request received:', {
      applicationId,
      userId,
      userEmail
    })

    const { data: application, error: fetchError } = await supabaseClient
      .from('business_applications')
      .select('id, email, status, owner_hidden_at')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError) {
      console.error('[DeleteApplication] Fetch error:', fetchError)
      return errorResponse(500, 'Failed to load application', fetchError.message)
    }

    if (!application) {
      return errorResponse(404, 'Application not found')
    }

    const adminCheck = await checkIsAdmin(userId, userEmail, supabaseClient)
    const isOwner = application.email?.toLowerCase() === (userEmail || '').toLowerCase()

    if (!isOwner && !adminCheck.isAdmin) {
      console.warn('[DeleteApplication] Permission denied:', {
        applicationEmail: application.email,
        userEmail,
        isAdmin: adminCheck.isAdmin
      })
      return errorResponse(403, 'Permission denied', 'You can only delete your own applications')
    }

    if (application.status !== 'rejected' && application.status !== 'cancelled') {
      return errorResponse(400, 'Only rejected or cancelled applications can be deleted')
    }

    if (application.owner_hidden_at) {
      return successResponse({
        message: 'Application already hidden',
        applicationId,
        status: application.status
      })
    }

    const timestamp = new Date().toISOString()

    const { error: updateError } = await supabaseClient
      .from('business_applications')
      .update({
        owner_hidden_at: timestamp,
        updated_at: timestamp
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('[DeleteApplication] Update failed:', updateError)
      return errorResponse(500, 'Failed to delete application', updateError.message)
    }

    console.log('[DeleteApplication] Application hidden successfully:', {
      applicationId,
      timestamp
    })

    return successResponse({
      message: 'Application removed from your dashboard.',
      applicationId,
      status: application.status,
      hidden_at: timestamp
    })
  } catch (err: any) {
    console.error('[DeleteApplication] Unexpected error:', err)
    return errorResponse(500, 'Server error', err?.message || 'Unknown error')
  }
}

