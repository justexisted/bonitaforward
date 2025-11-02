/**
 * Shared utility for user deletion logic
 * 
 * CRITICAL: Always delete related data BEFORE deleting the auth user
 * to avoid foreign key constraint errors.
 * 
 * This function handles:
 * - Funnel responses (by email)
 * - Bookings (by email)
 * - Provider change requests (by owner_user_id)
 * - Job posts (by owner_user_id)
 * - Notifications (by user_id)
 * - Providers (soft delete - archive with 'deleted' badge)
 * - Profile (by user_id)
 * - Auth user (final step)
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface UserDeletionOptions {
  userId: string
  userEmail: string | null
  supabaseClient: SupabaseClient
  logPrefix?: string
}

export interface UserDeletionResult {
  success: boolean
  error?: string
  deletedCounts?: {
    funnelResponses?: number
    bookings?: number
    changeRequests?: number
    jobPosts?: number
    notifications?: number
    providers?: number
    profile?: boolean
  }
}

/**
 * Delete all user-related data, then delete the auth user
 * 
 * @param options - User deletion options
 * @returns Result with success status and deletion counts
 */
export async function deleteUserAndRelatedData(
  options: UserDeletionOptions
): Promise<UserDeletionResult> {
  const { userId, userEmail, supabaseClient, logPrefix = '[user-deletion]' } = options
  
  const deletedCounts: UserDeletionResult['deletedCounts'] = {}
  
  try {
    // Step 1: Delete funnel responses (keyed by email)
    if (userEmail) {
      try {
        const { count } = await supabaseClient
          .from('funnel_responses')
          .delete({ count: 'exact' })
          .eq('user_email', userEmail)
        deletedCounts.funnelResponses = count || 0
        console.log(`${logPrefix} ✓ Deleted ${count || 0} funnel response(s)`)
      } catch (err) {
        console.warn(`${logPrefix} Warning deleting funnel responses:`, err)
      }
    }
    
    // Step 2: Delete bookings (keyed by email)
    if (userEmail) {
      try {
        const { count } = await supabaseClient
          .from('bookings')
          .delete({ count: 'exact' })
          .eq('user_email', userEmail)
        deletedCounts.bookings = count || 0
        console.log(`${logPrefix} ✓ Deleted ${count || 0} booking(s)`)
      } catch (err) {
        console.warn(`${logPrefix} Warning deleting bookings:`, err)
      }
    }
    
    // Step 3: Delete provider change requests
    try {
      const { count } = await supabaseClient
        .from('provider_change_requests')
        .delete({ count: 'exact' })
        .eq('owner_user_id', userId)
      deletedCounts.changeRequests = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} change request(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting change requests:`, err)
    }
    
    // Step 4: Delete job posts
    try {
      const { count } = await supabaseClient
        .from('provider_job_posts')
        .delete({ count: 'exact' })
        .eq('owner_user_id', userId)
      deletedCounts.jobPosts = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} job post(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting job posts:`, err)
    }
    
    // Step 5: Delete notifications
    try {
      const { count } = await supabaseClient
        .from('user_notifications')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      deletedCounts.notifications = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} notification(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting notifications:`, err)
    }
    
    // Step 6: Archive providers owned by user (soft delete)
    // This prevents breaking references in the public directory
    try {
      const { data: providers } = await supabaseClient
        .from('providers')
        .select('id, badges')
        .eq('owner_user_id', userId)
      
      if (Array.isArray(providers) && providers.length > 0) {
        for (const provider of providers) {
          const badges = Array.isArray((provider as any)?.badges) 
            ? ((provider as any)?.badges as string[]) 
            : []
          const nextBadges = Array.from(new Set([...badges, 'deleted']))
          await supabaseClient
            .from('providers')
            .update({ 
              badges: nextBadges as any, 
              owner_user_id: null as any 
            })
            .eq('id', (provider as any).id)
        }
        deletedCounts.providers = providers.length
        console.log(`${logPrefix} ✓ Archived ${providers.length} provider(s)`)
      }
    } catch (err) {
      console.warn(`${logPrefix} Warning archiving providers:`, err)
    }
    
    // Step 7: Delete profile
    try {
      await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId)
      deletedCounts.profile = true
      console.log(`${logPrefix} ✓ Deleted profile`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting profile:`, err)
    }

    // Step 8: Finally, delete from auth.users (must be last)
    console.log(`${logPrefix} Attempting to delete user ${userId} from auth.users`)
    const { error: authError } = await (supabaseClient as any).auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error(`${logPrefix} Error deleting from auth.users:`, {
        error: authError,
        message: authError.message,
        status: (authError as any).status,
        userId
      })
      
      return {
        success: false,
        error: authError.message || authError.toString(),
        deletedCounts
      }
    }

    console.log(`${logPrefix} ✓ Deleted user from auth.users`)
    
    return {
      success: true,
      deletedCounts
    }
  } catch (err: any) {
    console.error(`${logPrefix} Exception during user deletion:`, err)
    return {
      success: false,
      error: err?.message || 'Unknown error during user deletion',
      deletedCounts
    }
  }
}

/**
 * Get user email from profile (helper function)
 */
export async function getUserEmailFromProfile(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<string | null> {
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()
    return profile?.email || null
  } catch (err) {
    console.warn('[user-deletion] Could not fetch user email:', err)
    return null
  }
}

