/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - SupabaseClient: Must have service role key for admin operations
 *   → CRITICAL: Uses service role to bypass RLS
 * - profiles table: Structure must match deletion logic
 *   → CRITICAL: Deletes profile by user_id
 * - providers table: Must support owner_user_id column
 *   → CRITICAL: Queries by owner_user_id to find businesses
 *   → CRITICAL: Must support badges column for soft delete (adds 'deleted' badge)
 *   → CRITICAL: Must support setting owner_user_id to null for soft delete
 * - Other tables: funnel_responses, bookings, provider_change_requests, user_saved_events,
 *   saved_providers, coupon_redemptions, calendar_events, business_applications, event_flags,
 *   event_votes, email_preferences, dismissed_notifications, etc.
 *   → CRITICAL: Deletion order matters - related data FIRST, auth user LAST
 * 
 * WHAT DEPENDS ON THIS:
 * - admin-delete-user.ts: Uses this utility for admin user deletion
 *   → CRITICAL: Passes deleteBusinesses parameter (true = hard delete, false = soft delete)
 * - user-delete.ts: Uses this utility for self-deletion
 *   → CRITICAL: Passes deleteBusinesses parameter (true = hard delete, false = soft delete)
 *   → CRITICAL: Both must use same deletion order
 * 
 * BREAKING CHANGES:
 * - If you change deletion order → Foreign key constraint errors
 * - If table schema changes → Deletion queries fail
 * - If you remove this utility → Both admin-delete-user and user-delete break
 * - If you change deleteBusinesses parameter → Both callers break
 * - If providers table structure changes → Business deletion logic fails
 * - If you remove deleteBusinesses logic → Businesses always soft-deleted (unlinked)
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Test deletion order is correct (related data → auth user)
 * 2. Test both admin-delete-user and user-delete with deleteBusinesses=true and false
 * 3. Verify all related tables are handled
 * 4. Check for foreign key constraints that might block deletion
 * 5. Test hard delete (deleteBusinesses=true) - businesses permanently removed
 * 6. Test soft delete (deleteBusinesses=false) - businesses unlinked with 'deleted' badge
 * 7. Verify providers table supports owner_user_id=null and badges array
 * 
 * RELATED FILES:
 * - netlify/functions/admin-delete-user.ts: Admin deletion endpoint (passes deleteBusinesses)
 * - netlify/functions/user-delete.ts: Self-deletion endpoint (passes deleteBusinesses)
 * - src/utils/adminUserUtils.ts: Checks for businesses, prompts admin
 * - src/pages/Account.tsx: Self-delete, prompts user about businesses
 * 
 * RECENT BREAKS:
 * - User deletion failing (2025-01-XX): Wrong deletion order
 *   → Fix: Created this shared utility to ensure correct order
 * - Business deletion (2025-01-XX): Added deleteBusinesses parameter
 *   → Fix: Hard delete removes businesses, soft delete unlinks them (owner_user_id=null, badges=['deleted'])
 * 
 * See: docs/prevention/ASYNC_FLOW_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

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
 * - Dismissed notifications (by user_id)
 * - Saved events (user_saved_events by user_id)
 * - Saved businesses (saved_providers by user_id)
 * - Coupon redemptions (coupon_redemptions by user_id)
 * - Calendar events created by user (calendar_events by created_by_user_id)
 * - Business applications (business_applications by email)
 * - Event flags (event_flags by user_id)
 * - Event votes (event_votes by user_id)
 * - Email preferences (email_preferences by user_id)
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
  deleteBusinesses?: boolean // If true, hard delete businesses; if false, just unlink them
  businessIdsToDelete?: string[] // Specific business IDs to delete (if provided, only these will be deleted)
}

export interface UserDeletionResult {
  success: boolean
  error?: string
  deletedCounts?: {
    funnelResponses?: number
    bookings?: number
    businessesDeleted?: number // Number of businesses hard deleted
    businessesKept?: number // Number of businesses soft deleted (kept in system)
    changeRequests?: number
    jobPosts?: number
    notifications?: number
    dismissedNotifications?: number
    savedEvents?: number
    savedBusinesses?: number
    couponRedemptions?: number
    calendarEvents?: number
    businessApplications?: number
    eventFlags?: number
    eventVotes?: number
    emailPreferences?: boolean
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
  const { userId, userEmail, supabaseClient, logPrefix = '[user-deletion]', deleteBusinesses = false, businessIdsToDelete = [] } = options
  
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
    
    // Step 5b: Delete dismissed notifications
    try {
      const { count } = await supabaseClient
        .from('dismissed_notifications')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      deletedCounts.dismissedNotifications = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} dismissed notification(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting dismissed notifications:`, err)
    }
    
    // Step 5c: Delete saved events (user_saved_events)
    try {
      // First verify if data exists
      const { count: existingCount, error: checkError } = await supabaseClient
        .from('user_saved_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      if (checkError) {
        console.warn(`${logPrefix} Error checking saved events:`, checkError)
      } else if (existingCount && existingCount > 0) {
        console.log(`${logPrefix} Found ${existingCount} saved event(s) to delete`)
      }
      
      const { count, error } = await supabaseClient
        .from('user_saved_events')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (error) {
        console.warn(`${logPrefix} Error deleting saved events:`, error)
      } else {
        deletedCounts.savedEvents = count || 0
        if (count && count > 0) {
          console.log(`${logPrefix} ✓ Deleted ${count} saved event(s)`)
        } else if (existingCount && existingCount > 0 && (!count || count === 0)) {
          console.warn(`${logPrefix} ⚠️ Found ${existingCount} saved event(s) but deleted 0 - possible RLS issue`)
        }
      }
    } catch (err) {
      console.warn(`${logPrefix} Exception deleting saved events:`, err)
    }
    
    // Step 5d: Delete saved businesses (saved_providers)
    try {
      // First verify if data exists
      const { count: existingCount, error: checkError } = await supabaseClient
        .from('saved_providers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      if (checkError) {
        console.warn(`${logPrefix} Error checking saved businesses:`, checkError)
      } else if (existingCount && existingCount > 0) {
        console.log(`${logPrefix} Found ${existingCount} saved business(es) to delete`)
      }
      
      const { count, error } = await supabaseClient
        .from('saved_providers')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (error) {
        console.warn(`${logPrefix} Error deleting saved businesses:`, error)
      } else {
        deletedCounts.savedBusinesses = count || 0
        if (count && count > 0) {
          console.log(`${logPrefix} ✓ Deleted ${count} saved business(es)`)
        } else if (existingCount && existingCount > 0 && (!count || count === 0)) {
          console.warn(`${logPrefix} ⚠️ Found ${existingCount} saved business(es) but deleted 0 - possible RLS issue`)
        }
      }
    } catch (err) {
      console.warn(`${logPrefix} Exception deleting saved businesses:`, err)
    }
    
    // Step 5e: Delete coupon redemptions
    try {
      // First verify if data exists
      const { count: existingCount, error: checkError } = await supabaseClient
        .from('coupon_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      if (checkError) {
        console.warn(`${logPrefix} Error checking coupon redemptions:`, checkError)
      } else if (existingCount && existingCount > 0) {
        console.log(`${logPrefix} Found ${existingCount} coupon redemption(s) to delete`)
      }
      
      const { count, error } = await supabaseClient
        .from('coupon_redemptions')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (error) {
        console.warn(`${logPrefix} Error deleting coupon redemptions:`, error)
      } else {
        deletedCounts.couponRedemptions = count || 0
        if (count && count > 0) {
          console.log(`${logPrefix} ✓ Deleted ${count} coupon redemption(s)`)
        } else if (existingCount && existingCount > 0 && (!count || count === 0)) {
          console.warn(`${logPrefix} ⚠️ Found ${existingCount} coupon redemption(s) but deleted 0 - possible RLS issue`)
        }
      }
    } catch (err) {
      console.warn(`${logPrefix} Exception deleting coupon redemptions:`, err)
    }
    
    // Step 5f: Delete calendar events created by user
    try {
      // First verify if data exists
      const { count: existingCount, error: checkError } = await supabaseClient
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_user_id', userId)
      
      if (checkError) {
        console.warn(`${logPrefix} Error checking calendar events:`, checkError)
      } else if (existingCount && existingCount > 0) {
        console.log(`${logPrefix} Found ${existingCount} calendar event(s) to delete`)
      }
      
      const { count, error } = await supabaseClient
        .from('calendar_events')
        .delete({ count: 'exact' })
        .eq('created_by_user_id', userId)
      
      if (error) {
        console.warn(`${logPrefix} Error deleting calendar events:`, error)
      } else {
        deletedCounts.calendarEvents = count || 0
        if (count && count > 0) {
          console.log(`${logPrefix} ✓ Deleted ${count} calendar event(s)`)
        } else if (existingCount && existingCount > 0 && (!count || count === 0)) {
          console.warn(`${logPrefix} ⚠️ Found ${existingCount} calendar event(s) but deleted 0 - possible RLS issue`)
        }
      }
    } catch (err) {
      console.warn(`${logPrefix} Exception deleting calendar events:`, err)
    }
    
    // Step 5g: Delete business applications (by email)
    if (userEmail) {
      try {
        const { count } = await supabaseClient
          .from('business_applications')
          .delete({ count: 'exact' })
          .eq('email', userEmail)
        deletedCounts.businessApplications = count || 0
        console.log(`${logPrefix} ✓ Deleted ${count || 0} business application(s)`)
      } catch (err) {
        console.warn(`${logPrefix} Warning deleting business applications:`, err)
      }
    }
    
    // Step 5h: Delete event flags (user who flagged events)
    try {
      const { count } = await supabaseClient
        .from('event_flags')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      deletedCounts.eventFlags = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} event flag(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting event flags:`, err)
    }
    
    // Step 5i: Delete event votes (user who voted on events)
    try {
      const { count } = await supabaseClient
        .from('event_votes')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      deletedCounts.eventVotes = count || 0
      console.log(`${logPrefix} ✓ Deleted ${count || 0} event vote(s)`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting event votes:`, err)
    }
    
    // Step 5j: Delete email preferences
    try {
      await supabaseClient
        .from('email_preferences')
        .delete()
        .eq('user_id', userId)
      deletedCounts.emailPreferences = true
      console.log(`${logPrefix} ✓ Deleted email preferences`)
    } catch (err) {
      console.warn(`${logPrefix} Warning deleting email preferences:`, err)
    }
    
    // Step 6: Handle providers owned by user
    // If deleteBusinesses is true: Hard delete businesses (or specific businessIdsToDelete if provided)
    // If deleteBusinesses is false: Soft delete (archive with 'deleted' badge and unlink)
    try {
      const { data: providers } = await supabaseClient
        .from('providers')
        .select('id, badges, name, email')
        .eq('owner_user_id', userId)
      
      console.log(`${logPrefix} Found ${providers?.length || 0} provider(s) owned by user ${userId}:`, 
        providers?.map(p => ({ id: (p as any).id, name: (p as any).name, email: (p as any).email })))
      
      if (Array.isArray(providers) && providers.length > 0) {
        if (deleteBusinesses) {
          // Hard delete: Permanently delete businesses
          // If businessIdsToDelete is provided, only delete those specific businesses
          // Otherwise, delete all businesses owned by the user
          const businessesToDelete = businessIdsToDelete.length > 0
            ? providers.filter(p => businessIdsToDelete.includes((p as any).id))
            : providers
          
          console.log(`${logPrefix} 🔴 HARD DELETING ${businessesToDelete.length} provider(s):`, 
            businessesToDelete.map(p => ({ id: (p as any).id, name: (p as any).name, email: (p as any).email })))
          
          let deletedCount = 0
          const deletedBusinessIds: string[] = []
          const failedDeletions: Array<{ id: string; name: string; error: string }> = []
          
          for (const provider of businessesToDelete) {
            const providerId = (provider as any).id
            const providerName = (provider as any).name || 'Unnamed Business'
            const providerEmail = (provider as any).email || 'No email'
            
            console.log(`${logPrefix} 🔴 Attempting to DELETE provider ${providerId} (${providerName})...`)
            
            const { error: deleteError, count } = await supabaseClient
              .from('providers')
              .delete({ count: 'exact' })
              .eq('id', providerId)
            
            if (deleteError) {
              console.error(`${logPrefix} ❌ FAILED to delete provider ${providerId} (${providerName}):`, {
                error: deleteError,
                message: deleteError.message,
                code: deleteError.code,
                details: deleteError.details,
                hint: deleteError.hint
              })
              failedDeletions.push({ id: providerId, name: providerName, error: deleteError.message || deleteError.toString() })
            } else {
              // Verify deletion succeeded by checking if provider still exists
              const { data: verifyData, error: verifyError } = await supabaseClient
                .from('providers')
                .select('id')
                .eq('id', providerId)
                .maybeSingle()
              
              if (verifyError) {
                console.warn(`${logPrefix} ⚠️ Could not verify deletion of provider ${providerId} (${providerName}):`, verifyError)
              } else if (verifyData) {
                console.error(`${logPrefix} ❌ VERIFICATION FAILED: Provider ${providerId} (${providerName}) still exists after deletion!`)
                failedDeletions.push({ id: providerId, name: providerName, error: 'Provider still exists after deletion attempt' })
              } else {
                deletedCount++
                deletedBusinessIds.push(providerId)
                console.log(`${logPrefix} ✅ VERIFIED: Provider ${providerId} (${providerName}) successfully deleted (count: ${count || 0})`)
              }
            }
          }
          
          // Log summary of deletions
          console.log(`${logPrefix} 📊 DELETION SUMMARY:`)
          console.log(`${logPrefix}   - Attempted: ${businessesToDelete.length} provider(s)`)
          console.log(`${logPrefix}   - Successfully deleted: ${deletedCount} provider(s)`)
          console.log(`${logPrefix}   - Failed: ${failedDeletions.length} provider(s)`)
          if (deletedBusinessIds.length > 0) {
            console.log(`${logPrefix}   - Deleted IDs: ${deletedBusinessIds.join(', ')}`)
          }
          if (failedDeletions.length > 0) {
            console.error(`${logPrefix}   - Failed deletions:`, failedDeletions)
            
            // CRITICAL FIX: If hard delete failed, soft delete the businesses instead
            // This ensures they don't get reconnected when user signs up again
            console.log(`${logPrefix} 🔄 Attempting to soft delete businesses that failed hard delete...`)
            for (const failed of failedDeletions) {
              const provider = providers.find(p => (p as any).id === failed.id)
              if (provider) {
                const badges = Array.isArray((provider as any)?.badges) 
                  ? ((provider as any)?.badges as string[]) 
                  : []
                const nextBadges = Array.from(new Set([...badges, 'deleted']))
                const { error: softDeleteError } = await supabaseClient
                  .from('providers')
                  .update({ 
                    badges: nextBadges as any, 
                    owner_user_id: null as any 
                  })
                  .eq('id', failed.id)
                
                if (softDeleteError) {
                  console.error(`${logPrefix} ❌ CRITICAL: Failed to soft delete provider ${failed.id} (${failed.name}) after hard delete failed:`, softDeleteError)
                } else {
                  console.log(`${logPrefix} ✅ Soft deleted provider ${failed.id} (${failed.name}) as fallback after hard delete failed`)
                }
              }
            }
          }
          
          // Soft delete remaining businesses (if businessIdsToDelete was provided and there are businesses not in the list)
          if (businessIdsToDelete.length > 0) {
            const businessesToKeep = providers.filter(p => !businessIdsToDelete.includes((p as any).id))
            for (const provider of businessesToKeep) {
              const badges = Array.isArray((provider as any)?.badges) 
                ? ((provider as any)?.badges as string[]) 
                : []
              const nextBadges = Array.from(new Set([...badges, 'deleted']))
              const { error: updateError } = await supabaseClient
                .from('providers')
                .update({ 
                  badges: nextBadges as any, 
                  owner_user_id: null as any 
                })
                .eq('id', (provider as any).id)
              
              if (updateError) {
                console.error(`${logPrefix} ❌ Failed to soft delete provider ${(provider as any).id}:`, updateError)
              } else {
                console.log(`${logPrefix} ✓ Soft deleted provider ${(provider as any).id} (${(provider as any).name})`)
              }
            }
          }
          
          // Track business counts for email notification
          const businessesKept = businessIdsToDelete.length > 0 
            ? providers.length - deletedCount 
            : 0
          deletedCounts.businessesDeleted = deletedCount
          deletedCounts.businessesKept = businessesKept
          console.log(`${logPrefix} ✓ Deleted ${deletedCount} provider(s) permanently`)
          if (businessesKept > 0) {
            console.log(`${logPrefix} ✓ Kept ${businessesKept} provider(s) in system (soft deleted)`)
          }
          
          // CRITICAL: If any businesses failed to delete, log warning
          if (failedDeletions.length > 0) {
            console.error(`${logPrefix} ⚠️ WARNING: ${failedDeletions.length} business(es) failed to delete permanently and were soft-deleted instead.`)
            console.error(`${logPrefix} ⚠️ These businesses will NOT be reconnected when user signs up again (they have 'deleted' badge).`)
          }
        } else {
          // Soft delete: Archive and unlink (allows reconnection later)
          for (const provider of providers) {
            const badges = Array.isArray((provider as any)?.badges) 
              ? ((provider as any)?.badges as string[]) 
              : []
            const nextBadges = Array.from(new Set([...badges, 'deleted']))
            const { error: updateError } = await supabaseClient
              .from('providers')
              .update({ 
                badges: nextBadges as any, 
                owner_user_id: null as any 
              })
              .eq('id', (provider as any).id)
            
            if (updateError) {
              console.error(`${logPrefix} ❌ Failed to soft delete provider ${(provider as any).id}:`, updateError)
            }
          }
          deletedCounts.businessesDeleted = 0
          deletedCounts.businessesKept = providers.length
          console.log(`${logPrefix} ✓ Archived ${providers.length} provider(s) (unlinked, can be reconnected later)`)
        }
      }
    } catch (err) {
      console.error(`${logPrefix} ❌ ERROR handling providers:`, err)
      // Don't fail the entire deletion, but log the error clearly
    }
    
    // Step 7: Delete profile (must be after all related data)
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

    // Step 8: Finally, delete from auth.users (must be last - after all related data)
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

/**
 * Get user name from profile (helper function)
 */
export async function getUserNameFromProfile(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<string | null> {
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle()
    return profile?.name || null
  } catch (err) {
    console.warn('[user-deletion] Could not fetch user name:', err)
    return null
  }
}

