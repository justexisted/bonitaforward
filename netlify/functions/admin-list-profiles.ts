/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - verifyAuthAndAdmin(): Verifies user is authenticated and admin
 *   → CRITICAL: Must return supabaseClient with service role key
 * - successResponse(): Returns standardized response format
 *   → CRITICAL: ALWAYS includes success: true and ok: true automatically
 * - profiles table: Must have columns (is_bonita_resident, resident_verification_method, etc.)
 *   → CRITICAL: Falls back to basic fields if resident columns don't exist
 * 
 * WHAT DEPENDS ON THIS:
 * - useAdminDataLoader: Calls this function to load profiles
 *   → CRITICAL: Expects response format { success: true, ok: true, profiles: ProfileRow[] }
 * - Admin.tsx: Uses profiles from useAdminDataLoader
 * - ResidentVerificationSection: Filters profiles by is_bonita_resident
 * - UsersSection: Displays profiles with resident verification data
 * 
 * BREAKING CHANGES:
 * - If you change response format → useAdminDataLoader won't find profiles
 * - If you remove resident verification fields → ResidentVerificationSection breaks
 * - If you change ProfileRow type → Type mismatch between backend and frontend
 * - If successResponse() format changes → ALL consumers break
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Check ProfileRow type in src/types/admin.ts matches query fields
 * 2. Verify successResponse() format is correct
 * 3. Update types/admin.ts if adding new fields
 * 4. Test useAdminDataLoader receives correct data
 * 5. Test all admin sections that use profiles
 * 
 * RELATED FILES:
 * - src/types/admin.ts: ProfileRow type (MUST match query fields)
 * - src/hooks/useAdminDataLoader.ts: Calls this function
 * - netlify/functions/utils/response.ts: successResponse() utility
 * - src/components/admin/sections/ResidentVerificationSection.tsx: Consumes profiles
 * 
 * RECENT BREAKS:
 * - API response format (2025-01-XX): Changed from { ok: true } to { success: true }
 *   → Fix: successResponse() now includes both for backward compatibility
 * - Resident verification empty: useAdminDataLoader had wrong ProfileRow type
 * 
 * See: docs/prevention/API_CONTRACT_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify auth and admin status
    const authAdminResult = await verifyAuthAndAdmin(event)
    
    if (!authAdminResult.success || !authAdminResult.supabaseClient) {
      return authAdminErrorResponse(authAdminResult)
    }

    const { supabaseClient, userId, email } = authAdminResult

    // Log admin action for audit trail
    try {
      await supabaseClient.from('admin_audit_log').insert({
        admin_user_id: userId,
        admin_email: email,
        action: 'admin_list_profiles',
        timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
      })
    } catch {
      // audit log table doesn't exist yet, that's okay for now
    }

    // Select all profile fields including resident verification data
    // Try with resident verification fields first, fallback to basic fields if columns don't exist
    let query = supabaseClient
      .from('profiles')
      .select('id,email,name,role,is_admin,is_bonita_resident,resident_verification_method,resident_zip_code,resident_verified_at')
      .order('email', { ascending: true })
    
    let { data, error } = await query
    
    // If error is about missing columns, try again with just basic fields
    if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.warn('[admin-list-profiles] Resident verification columns not found, using basic fields:', error.message)
      const basicQuery = supabaseClient
        .from('profiles')
        .select('id,email,name,role,is_admin')
        .order('email', { ascending: true })
      const basicResult = await basicQuery
      if (basicResult.error) {
        console.error('[admin-list-profiles] Error fetching profiles:', basicResult.error)
        return errorResponse(500, 'Failed to fetch profiles', basicResult.error.message)
      }
      data = basicResult.data
    } else if (error) {
      console.error('[admin-list-profiles] Error fetching profiles:', error)
      return errorResponse(500, 'Database query failed', error.message)
    }
    
    return successResponse({ profiles: data || [] })
  } catch (err: any) {
    console.error('[admin-list-profiles] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
