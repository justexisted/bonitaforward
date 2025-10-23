/**
 * Database operations for event terms acceptance
 * Tracks legal compliance for terms acceptance
 */

import { supabase } from '../lib/supabase'

/**
 * Check if user has accepted event creation terms
 */
export async function hasAcceptedEventTerms(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('event_terms_accepted_at')
      .eq('id', userId)
      .maybeSingle()
    
    if (error) {
      console.error('[EventTerms] Error checking terms acceptance:', error)
      return false
    }
    
    return data?.event_terms_accepted_at != null
  } catch (error) {
    console.error('[EventTerms] Exception checking terms acceptance:', error)
    return false
  }
}

/**
 * Mark that user has accepted event creation terms
 */
export async function acceptEventTerms(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ event_terms_accepted_at: new Date().toISOString() })
      .eq('id', userId)
    
    if (error) {
      console.error('[EventTerms] Error accepting terms:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('[EventTerms] Exception accepting terms:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Migrate localStorage terms acceptance to database
 */
export async function migrateEventTermsToDatabase(userId: string): Promise<void> {
  try {
    const key = `bf-event-terms-${userId}`
    const localAccepted = localStorage.getItem(key) === 'true'
    
    if (localAccepted) {
      console.log('[EventTerms] Migrating localStorage terms acceptance to database...')
      await acceptEventTerms(userId)
      
      // Clear localStorage after migration
      try {
        localStorage.removeItem(key)
        console.log('[EventTerms] Cleared localStorage key:', key)
      } catch (error) {
        console.warn('[EventTerms] Could not clear localStorage key:', key, error)
      }
    }
  } catch (error) {
    console.error('[EventTerms] Exception during migration:', error)
  }
}

