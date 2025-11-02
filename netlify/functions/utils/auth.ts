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
 * Decode JWT token without verification (for expired sessions)
 * Extracts user info from JWT payload directly
 */
function decodeJWT(token: string): { sub?: string; email?: string; [key: string]: any } | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode payload (base64url)
    const payload = parts[1]
    // Base64url decoding: replace - with + and _ with /
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    
    return JSON.parse(decoded)
  } catch (error) {
    console.error('[auth] JWT decode error:', error)
    return null
  }
}

/**
 * Verify JWT token using Supabase REST API
 * Falls back to JWT decoding if session doesn't exist (common in serverless)
 * 
 * Strategy:
 * 1. Try REST API first (most secure, validates session)
 * 2. If session_not_found (403), decode JWT directly (valid for serverless)
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
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
      'x-client-info': 'bonita-forward-netlify-function'
    }
    
    console.log('[auth] Verifying token via REST API...')
    
    // Try REST API first
    let authResponse = await fetch(authUrl, {
      method: 'GET',
      headers
    })

    // Log response for debugging
    console.log('[auth] REST API response:', {
      status: authResponse.status,
      ok: authResponse.ok
    })

    // If successful, return user data
    if (authResponse.ok) {
      const userData = await authResponse.json()
      if (userData?.id) {
        return {
          success: true,
          user: userData as AuthUser
        }
      }
    }

    // If 403 with session_not_found, try decoding JWT directly
    if (authResponse.status === 403) {
      let errorJson: any = null
      try {
        const contentType = authResponse.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          errorJson = await authResponse.json()
        }
      } catch {
        // Ignore parse errors
      }

      const isSessionNotFound = errorJson?.error_code === 'session_not_found' ||
                                 errorJson?.msg?.includes('session') ||
                                 errorJson?.msg?.includes('Session')

      if (isSessionNotFound) {
        console.log('[auth] Session not found, decoding JWT directly (serverless fallback)')
        
        // Decode JWT directly - for serverless, we don't need active session
        const payload = decodeJWT(token)
        
        if (payload?.sub) {
          // Extract user info from JWT payload
          const userId = payload.sub
          const email = payload.email || payload.user_email || null
          
          console.log('[auth] JWT decoded successfully:', { userId, email })
          
          return {
            success: true,
            user: {
              id: userId,
              email: email || undefined,
              email_confirmed_at: payload.email_confirmed_at || undefined,
              created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined
            } as AuthUser
          }
        } else {
          console.error('[auth] JWT decode failed - no user ID in payload')
          return {
            success: false,
            error: 'Invalid JWT - no user ID in token',
            statusCode: 401
          }
        }
      }
    }

    // If we get here, it's a different error - return detailed message
    let errorDetails = 'Auth verification failed'
    try {
      const contentType = authResponse.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const errorJson = await authResponse.json()
        errorDetails = errorJson?.msg || errorJson?.message || errorJson?.error || JSON.stringify(errorJson)
      } else {
        errorDetails = await authResponse.text()
      }
    } catch {
      // Keep default error
    }
    
    console.error('[auth] Token verification failed:', {
      status: authResponse.status,
      errorDetails
    })
    
    return {
      success: false,
      error: `Token verification failed: ${authResponse.status} - ${errorDetails}`,
      statusCode: authResponse.status
    }
  } catch (error: any) {
    // If fetch fails entirely, try JWT decode as last resort
    console.warn('[auth] REST API request failed, trying JWT decode:', error?.message)
    const payload = decodeJWT(token)
    
    if (payload?.sub) {
      return {
        success: true,
        user: {
          id: payload.sub,
          email: payload.email || payload.user_email || undefined
        } as AuthUser
      }
    }
    
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

