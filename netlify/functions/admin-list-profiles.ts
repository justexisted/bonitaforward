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
