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
 */
export async function verifyToken(
  token: string,
  supabaseUrl: string,
  anonKey: string
): Promise<AuthVerificationResult> {
  try {
    const authUrl = `${supabaseUrl}/auth/v1/user`
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json'
      }
    })

    if (!authResponse.ok) {
      const authError = await authResponse.text().catch(() => 'Auth verification failed')
      return {
        success: false,
        error: `Token verification failed: ${authResponse.status}`,
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

