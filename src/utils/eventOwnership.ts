/**
 * Event Ownership Utilities
 *
 * Centralize how we decide whether an event belongs to a user or was auto-imported.
 * This keeps deletion logic consistent without touching image handling.
 */

import type { CalendarEvent } from '../types'

export type EventOwnership = 'user-created' | 'auto-imported' | 'unknown'

/**
 * Classify an event based on source metadata.
 * - `Local` events are user-created (if they have created_by_user_id)
 * - Any other source is treated as auto-imported by background jobs
 * - Missing metadata is flagged as unknown so callers can block unsafe operations
 */
export function classifyEventOwnership(
  event: Pick<CalendarEvent, 'source' | 'created_by_user_id' | 'origin_type'>
): EventOwnership {
  if (!event) return 'unknown'

  if (event.origin_type) {
    if (event.origin_type === 'local') {
      return event.created_by_user_id ? 'user-created' : 'unknown'
    }

    if (event.origin_type === 'unknown') {
      return 'unknown'
    }

    if (event.origin_type.startsWith('auto_')) {
      return 'auto-imported'
    }
  }

  const source = event.source?.trim()

  if (!source) {
    return 'unknown'
  }

  if (source === 'Local') {
    return event.created_by_user_id ? 'user-created' : 'unknown'
  }

  return 'auto-imported'
}

/**
 * Determine whether the current user can delete the event.
 * We avoid mutating any data here—callers decide how to respond.
 */
export function evaluateEventDeletionPermission(
  event: Pick<CalendarEvent, 'source' | 'created_by_user_id' | 'origin_type'>,
  currentUserId: string,
  isAdmin: boolean
): { allowed: boolean; reason?: string } {
  const ownership = classifyEventOwnership(event)

  if (ownership === 'user-created') {
    if (event.created_by_user_id !== currentUserId && !isAdmin) {
      return { allowed: false, reason: 'You do not have permission to delete this event.' }
    }
    return { allowed: true }
  }

  if (ownership === 'auto-imported') {
    if (!isAdmin) {
      return { allowed: false, reason: 'Only admins can delete automatically imported events.' }
    }
    return { allowed: true }
  }

  // Unknown ownership metadata – safest response is to block.
  return {
    allowed: false,
    reason: 'This event is missing creator data. Please contact an admin to remove it.'
  }
}

