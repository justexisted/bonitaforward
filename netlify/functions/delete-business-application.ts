/**
 * DELETE BUSINESS APPLICATION NETLIFY FUNCTION
 * 
 * Allows business owners to delete (hide) approved, rejected, or cancelled applications
 * from their dashboard while keeping the record for admin visibility.
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - business_applications.status: Must allow 'deleted' status (requires database migration)
 * - business_applications.owner_hidden_at: Used for filtering applications from UI
 * - application.email: Must match authenticated user's email (or user must be admin)
 * - extractAndVerifyToken: Validates user authentication
 * - checkIsAdmin: Validates admin permissions
 * 
 * WHAT DEPENDS ON THIS:
 * - ApplicationCard: Calls this function when delete button is clicked
 * - useBusinessOperations: deleteBusinessApplication function calls this endpoint
 * - MyBusiness page: Displays applications filtered by owner_hidden_at === null
 * 
 * BREAKING CHANGES:
 * - If you remove 'deleted' from status CHECK constraint → Update will fail (run migration first)
 * - If you change filtering logic from owner_hidden_at === null → Deleted applications will appear in UI
 * - If you remove owner_hidden_at update → Applications won't be hidden from UI (filtering won't work)
 * - If you change status restriction → Users won't be able to delete approved applications
 * 
 * RECENT CHANGES (2025-01-XX):
 * - ✅ Removed restriction that only allowed rejected/cancelled applications
 * - ✅ Now allows deletion of approved, rejected, or cancelled applications
 * - ✅ Implemented Option B: Sets both owner_hidden_at (for filtering) and status='deleted' (for record-keeping)
 * - ✅ Updated to set status='deleted' instead of just owner_hidden_at
 * 
 * RELATED FILES:
 * - src/pages/MyBusiness/components/ApplicationCard.tsx: Delete button display logic
 * - src/pages/MyBusiness/hooks/useBusinessOperations.ts: Frontend delete function
 * - src/pages/MyBusiness/hooks/useBusinessOperations.ts: Filtering logic (lines 174, 194) - **DO NOT CHANGE**
 * - ops/migrations/add-deleted-status-to-business-applications.sql: Database migration
 * 
 * CRITICAL NOTES:
 * - Filtering logic uses owner_hidden_at === null, NOT status - DO NOT change this
 * - Always set both fields when deleting: owner_hidden_at (for filtering) and status='deleted' (for record-keeping)
 * 
 * See: docs/prevention/CASCADING_FAILURES.md - Section #31 (Business Application Delete Button)
 */

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

    // Allow deletion of approved, rejected, or cancelled applications
    if (application.status !== 'approved' && application.status !== 'rejected' && application.status !== 'cancelled') {
      return errorResponse(400, 'Only approved, rejected, or cancelled applications can be deleted')
    }

    if (application.owner_hidden_at) {
      return successResponse({
        message: 'Application already hidden',
        applicationId,
        status: application.status
      })
    }

    const timestamp = new Date().toISOString()

    // Option B: Set both owner_hidden_at (for filtering) and status='deleted' (for record-keeping)
    // Filtering logic uses owner_hidden_at === null, so this will hide the application from UI
    const { error: updateError } = await supabaseClient
      .from('business_applications')
      .update({
        owner_hidden_at: timestamp,  // This is what actually hides it from UI (filtering checks this)
        status: 'deleted',  // For record-keeping
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

