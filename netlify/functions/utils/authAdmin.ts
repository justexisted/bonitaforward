/**
 * Combined auth and admin verification utility
 * Most functions need both - this combines them for convenience
 */

import { extractAndVerifyToken, AuthVerificationResult } from './auth'
import { checkIsAdmin, AdminCheckResult } from './admin'
import { getSupabaseConfig } from './env'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { errorResponse } from './response'

export interface AuthAdminResult {
  success: boolean
  userId?: string
  email?: string
  isAdmin?: boolean
  adminMethod?: 'email' | 'database' | 'fallback'
  error?: string
  statusCode?: number
  supabaseClient?: SupabaseClient
}

/**
 * Complete auth + admin verification in one call
 * Returns both auth result and admin status
 */
export async function verifyAuthAndAdmin(
  event: { headers: Record<string, string> }
): Promise<AuthAdminResult> {
  try {
    // Get Supabase config
    const { url, serviceRole, anonKey } = getSupabaseConfig()
    
    // Verify token
    const authResult = await extractAndVerifyToken(event, url, anonKey)
    
    if (!authResult.success || !authResult.user) {
      return {
        success: false,
        error: authResult.error || 'Authentication failed',
        statusCode: authResult.statusCode || 401
      }
    }
    
    const { id: userId, email } = authResult.user
    
    // Create service role client for admin check and data operations
    const supabaseClient = createClient(url, serviceRole, { auth: { persistSession: false } })
    
    // Check admin status
    const adminResult = await checkIsAdmin(userId, email, supabaseClient)
    
    if (!adminResult.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        statusCode: 403,
        userId,
        email
      }
    }
    
    return {
      success: true,
      userId,
      email,
      isAdmin: true,
      adminMethod: adminResult.method,
      supabaseClient
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Authentication and admin check failed',
      statusCode: 500
    }
  }
}

/**
 * Get standardized 401/403 error response for auth/admin failures
 */
export function authAdminErrorResponse(result: AuthAdminResult) {
  return errorResponse(
    result.statusCode || 401,
    result.error || 'Authentication failed',
    undefined,
    {},
    undefined
  )
}

