/**
 * Shared authentication utilities for Netlify functions
 * Handles token extraction and verification via Supabase REST API
 */

export interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string
  created_at?: string
  [key: string]: any
}

export interface AuthVerificationResult {
  success: boolean
  user?: AuthUser
  error?: string
  statusCode?: number
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(event: { headers: Record<string, string> }): string | null {
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  if (!authHeader) return null
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }
  
  return null
}

/**
 * Verify JWT token using Supabase REST API
 * This approach works reliably in serverless functions (auth.getUser() doesn't)
 * 
 * Uses Supabase GoTrue API: POST /auth/v1/user with JWT in Authorization header
 */
export async function verifyToken(
  token: string,
  supabaseUrl: string,
  anonKey: string
): Promise<AuthVerificationResult> {
  try {
    // Ensure URL doesn't have trailing slash
    const baseUrl = supabaseUrl.replace(/\/$/, '')
    const authUrl = `${baseUrl}/auth/v1/user`
    
    // Supabase GoTrue API expects specific headers
    // Note: Some Supabase instances require 'x-client-info' header for GoTrue API
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
      'x-client-info': 'bonita-forward-netlify-function'
    }
    
    console.log('[auth] Verifying token:', {
      url: authUrl,
      baseUrl: baseUrl,
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20),
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey?.length,
      anonKeyPrefix: anonKey?.substring(0, 20)
    })
    
    // Try GET first (standard), fallback to POST if needed
    let authResponse = await fetch(authUrl, {
      method: 'GET',
      headers
    })
    
    // If GET returns 403, try POST (some Supabase configs require POST)
    if (authResponse.status === 403) {
      console.log('[auth] GET returned 403, trying POST method')
      authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
    }

    // Log response details for debugging
    console.log('[auth] Token verification response:', {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
      headers: Object.fromEntries(authResponse.headers.entries())
    })

    if (!authResponse.ok) {
      // Try to get detailed error message from response
      let errorDetails = 'Auth verification failed'
      let errorJson: any = null
      
      try {
        const contentType = authResponse.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          errorJson = await authResponse.json()
          errorDetails = errorJson?.message || errorJson?.error || JSON.stringify(errorJson)
        } else {
          errorDetails = await authResponse.text()
        }
      } catch {
        // Keep default error if parsing fails
      }
      
      console.error('[auth] Token verification failed:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        errorDetails,
        errorJson,
        url: authUrl,
        requestHeaders: headers
      })
      
      return {
        success: false,
        error: `Token verification failed: ${authResponse.status} - ${errorDetails}`,
        statusCode: authResponse.status
      }
    }

    const userData = await authResponse.json()
    
    if (!userData?.id) {
      return {
        success: false,
        error: 'Invalid token - no user data in response',
        statusCode: 401
      }
    }

    return {
      success: true,
      user: userData as AuthUser
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Token verification failed',
      statusCode: 500
    }
  }
}

/**
 * Extract and verify token in one step
 */
export async function extractAndVerifyToken(
  event: { headers: Record<string, string> },
  supabaseUrl: string,
  anonKey: string
): Promise<AuthVerificationResult> {
  const token = extractToken(event)
  
  if (!token) {
    return {
      success: false,
      error: 'No token provided',
      statusCode: 401
    }
  }

  return await verifyToken(token, supabaseUrl, anonKey)
}

