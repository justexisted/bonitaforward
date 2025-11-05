/**
 * Database operations for saved events
 * Migrated from localStorage to database for cross-device sync
 * 
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */

import { query, insert } from '../lib/supabaseQuery'

/**
 * Fetch all saved event IDs for a user
 * Uses centralized query utility with automatic retry logic
 */
export async function fetchSavedEvents(userId: string): Promise<Set<string>> {
  try {
    const result = await query('user_saved_events', { logPrefix: '[SavedEvents]' })
      .select('event_id')
      .eq('user_id', userId)
      .execute()
    
    if (result.error) {
      // If table doesn't exist yet, silently return empty set (not an error condition)
      if (result.error.code === 'PGRST205') {
        console.warn('[SavedEvents] Table not found - please run migrations')
        return new Set()
      }
      // Error already logged by query utility
      return new Set()
    }
    
    return new Set((result.data || []).map((row: any) => row.event_id))
  } catch (error) {
    console.error('[SavedEvents] Exception fetching saved events:', error)
    return new Set()
  }
}

/**
 * Save an event for a user
 * Uses centralized query utility with automatic retry logic
 */
export async function saveEvent(userId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await insert(
      'user_saved_events',
      { user_id: userId, event_id: eventId },
      { logPrefix: '[SavedEvents]' }
    )
    
    if (result.error) {
      // Ignore duplicate key errors (event already saved)
      if (result.error.code === '23505' || result.error.code === 'VALIDATION_ERROR') {
        return { success: true }
      }
      // If table doesn't exist, fail silently
      if (result.error.code === 'PGRST205') {
        console.warn('[SavedEvents] Table not found - please run migrations')
        return { success: false, error: 'Table not found' }
      }
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('[SavedEvents] Exception saving event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unsave an event for a user
 * Uses centralized query utility with automatic retry logic
 */
export async function unsaveEvent(userId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use query builder for delete with multiple conditions
    const result = await query('user_saved_events', { logPrefix: '[SavedEvents]' })
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .execute()
    
    if (result.error) {
      // If table doesn't exist, fail silently
      if (result.error.code === 'PGRST205') {
        console.warn('[SavedEvents] Table not found - please run migrations')
        return { success: false, error: 'Table not found' }
      }
      // Error already logged by query utility
      return { success: false, error: result.error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('[SavedEvents] Exception unsaving event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Migrate saved events from localStorage to database
 * This should be called once when user signs in
 */
export async function migrateLocalStorageToDatabase(userId: string): Promise<void> {
  try {
    // Check both possible localStorage keys
    const keys = [
      'bf-saved-events', // Legacy key (no user ID)
      `bf-saved-events-${userId}` // User-specific key
    ]
    
    const eventIds = new Set<string>()
    
    // Collect all saved events from localStorage
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored) as string[]
          parsed.forEach(id => eventIds.add(id))
        }
      } catch (error) {
        console.warn(`[SavedEvents] Could not parse localStorage key: ${key}`, error)
      }
    }
    
    if (eventIds.size === 0) {
      console.log('[SavedEvents] No events to migrate from localStorage')
      return
    }
    
    console.log(`[SavedEvents] Migrating ${eventIds.size} events from localStorage to database...`)
    
    // Fetch existing saved events from database to avoid duplicates
    const existingSaved = await fetchSavedEvents(userId)
    
    // Insert only new events
    const toInsert = Array.from(eventIds)
      .filter(id => !existingSaved.has(id))
      .map(event_id => ({ user_id: userId, event_id }))
    
    if (toInsert.length === 0) {
      console.log('[SavedEvents] All events already in database')
    } else {
      const result = await insert(
        'user_saved_events',
        toInsert,
        { logPrefix: '[SavedEvents]' }
      )
      
      if (result.error) {
        console.error('[SavedEvents] Error migrating events:', result.error.message)
      } else {
        console.log(`[SavedEvents] Successfully migrated ${toInsert.length} events to database`)
      }
    }
    
    // Clear localStorage after successful migration
    for (const key of keys) {
      try {
        localStorage.removeItem(key)
        console.log(`[SavedEvents] Cleared localStorage key: ${key}`)
      } catch (error) {
        console.warn(`[SavedEvents] Could not clear localStorage key: ${key}`, error)
      }
    }
  } catch (error) {
    console.error('[SavedEvents] Exception during migration:', error)
  }
}

/**
 * Get saved events from localStorage (fallback for non-authenticated users)
 */
export function getLocalStorageSavedEvents(): Set<string> {
  try {
    const stored = localStorage.getItem('bf-saved-events')
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      return new Set(parsed)
    }
  } catch (error) {
    console.error('[SavedEvents] Error reading localStorage:', error)
  }
  return new Set()
}

/**
 * Save event to localStorage (fallback for non-authenticated users)
 */
export function saveEventToLocalStorage(eventId: string): void {
  try {
    const saved = getLocalStorageSavedEvents()
    saved.add(eventId)
    localStorage.setItem('bf-saved-events', JSON.stringify(Array.from(saved)))
  } catch (error) {
    console.error('[SavedEvents] Error saving to localStorage:', error)
  }
}

/**
 * Remove event from localStorage (fallback for non-authenticated users)
 */
export function unsaveEventFromLocalStorage(eventId: string): void {
  try {
    const saved = getLocalStorageSavedEvents()
    saved.delete(eventId)
    localStorage.setItem('bf-saved-events', JSON.stringify(Array.from(saved)))
  } catch (error) {
    console.error('[SavedEvents] Error removing from localStorage:', error)
  }
}

