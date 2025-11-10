import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { checkIsAdmin } from './utils/admin'

interface DeleteEventBody {
  event_id?: string
}

type EventOriginType = 'local' | 'auto_netlify' | 'auto_manual' | 'auto_other' | 'unknown' | null

function getDeletionPermission(
  event: {
    created_by_user_id: string | null
    source: string | null
    origin_type: EventOriginType
  },
  currentUserId: string,
  isAdmin: boolean
): { allowed: boolean; reason?: string } {
  const originType = event.origin_type
  const source = event.source?.trim() || null

  if (originType === 'local' || (originType === null && source === 'Local')) {
    if (!event.created_by_user_id) {
      return {
        allowed: false,
        reason: 'This event is missing creator data. Please contact an admin to remove it.'
      }
    }

    if (event.created_by_user_id !== currentUserId && !isAdmin) {
      return {
        allowed: false,
        reason: 'You do not have permission to delete this event.'
      }
    }

    return { allowed: true }
  }

  if (originType && originType.startsWith('auto_')) {
    if (!isAdmin) {
      return {
        allowed: false,
        reason: 'Only admins can delete automatically imported events.'
      }
    }

    return { allowed: true }
  }

  // Unknown origin – only admins should remove it
  if (!isAdmin) {
    return {
      allowed: false,
      reason: 'This event requires admin review before it can be deleted.'
    }
  }

  return { allowed: true }
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
    const supabaseClient = createClient(url, serviceRole, { auth: { persistSession: false } })

    const body: DeleteEventBody = JSON.parse(event.body || '{}')
    const eventId = body.event_id

    if (!eventId) {
      return errorResponse(400, 'Missing event_id')
    }

    console.log('[DeleteEvent] Request received:', {
      eventId,
      userId,
      userEmail
    })

    const { data: eventRecord, error: fetchError } = await supabaseClient
      .from('calendar_events')
      .select('id, created_by_user_id, source, origin_type, origin_identifier')
      .eq('id', eventId)
      .maybeSingle()

    if (fetchError) {
      console.error('[DeleteEvent] Failed to load event:', fetchError)
      return errorResponse(500, 'Failed to load event', fetchError.message)
    }

    if (!eventRecord) {
      return errorResponse(404, 'Event not found')
    }

    const adminCheck = await checkIsAdmin(userId, userEmail, supabaseClient)
    const isAdmin = adminCheck.isAdmin

    const permission = getDeletionPermission(eventRecord, userId, isAdmin)

    if (!permission.allowed) {
      console.warn('[DeleteEvent] Permission denied:', {
        eventId,
        reason: permission.reason,
        userId,
        isAdmin
      })

      return errorResponse(403, 'Permission denied', permission.reason)
    }

    console.log('[DeleteEvent] Permission granted. Cleaning up related rows...')

    // Remove related records first (service role bypasses RLS)
    await supabaseClient.from('event_votes').delete().eq('event_id', eventId)
    await supabaseClient.from('event_flags').delete().eq('event_id', eventId)
    await supabaseClient.from('user_saved_events').delete().eq('event_id', eventId)

    console.log('[DeleteEvent] Related rows removed. Deleting main event...')

    const { error: deleteError, count } = await supabaseClient
      .from('calendar_events')
      .delete({ count: 'exact' })
      .eq('id', eventId)

    if (deleteError) {
      console.error('[DeleteEvent] Delete failed:', deleteError)
      return errorResponse(500, 'Failed to delete event', deleteError.message)
    }

    if (!count) {
      console.error('[DeleteEvent] No rows deleted for event:', eventId)
      return errorResponse(500, 'Failed to delete event', 'No rows were deleted')
    }

    console.log('[DeleteEvent] Event deleted successfully:', {
      eventId,
      userId,
      origin_type: eventRecord.origin_type,
      origin_identifier: eventRecord.origin_identifier
    })

    return successResponse({
      message: 'Event deleted successfully',
      deleted_event_id: eventId,
      deleted_by: userId,
      origin_type: eventRecord.origin_type,
      origin_identifier: eventRecord.origin_identifier
    })
  } catch (err: any) {
    console.error('[DeleteEvent] Unexpected error:', err)
    return errorResponse(500, 'Server error', err?.message || 'Unknown error')
  }
}

