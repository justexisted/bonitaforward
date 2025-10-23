/**
 * Database operations for user subscription plan choices
 * CRITICAL: Business logic should NEVER be in localStorage
 */

import { supabase } from '../lib/supabase'

export type PlanChoice = 'free' | 'featured' | 'featured-pending' | null

/**
 * Get user's current plan choice from database
 */
export async function getUserPlanChoice(userId: string): Promise<PlanChoice> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_plan_choice')
      .eq('id', userId)
      .maybeSingle()
    
    if (error) {
      console.error('[PlanChoice] Error fetching plan choice:', error)
      return null
    }
    
    return (data?.user_plan_choice as PlanChoice) || null
  } catch (error) {
    console.error('[PlanChoice] Exception fetching plan choice:', error)
    return null
  }
}

/**
 * Set user's plan choice
 */
export async function setUserPlanChoice(userId: string, choice: PlanChoice): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ user_plan_choice: choice })
      .eq('id', userId)
    
    if (error) {
      console.error('[PlanChoice] Error setting plan choice:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`[PlanChoice] Successfully set plan choice to: ${choice}`)
    return { success: true }
  } catch (error: any) {
    console.error('[PlanChoice] Exception setting plan choice:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Migrate plan choice from localStorage to database
 */
export async function migratePlanChoiceToDatabase(userId: string): Promise<void> {
  try {
    const key = `user_plan_choice_${userId}`
    const localChoice = localStorage.getItem(key) as PlanChoice
    
    if (localChoice) {
      console.log(`[PlanChoice] Migrating localStorage plan choice (${localChoice}) to database...`)
      
      const result = await setUserPlanChoice(userId, localChoice)
      
      if (result.success) {
        // Clear localStorage after successful migration
        try {
          localStorage.removeItem(key)
          console.log('[PlanChoice] Cleared localStorage key:', key)
        } catch (error) {
          console.warn('[PlanChoice] Could not clear localStorage key:', key, error)
        }
      }
    }
  } catch (error) {
    console.error('[PlanChoice] Exception during migration:', error)
  }
}

