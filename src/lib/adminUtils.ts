import { supabase } from './supabase'

// Client-side admin utilities with server-side verification

export type AdminVerificationResult = {
  isAdmin: boolean
  userId?: string
  email?: string
  method?: 'database' | 'email'
  error?: string
}

/**
 * Verify admin status server-side
 * This replaces the client-side email checking with secure server verification
 */
export async function verifyAdminStatus(): Promise<AdminVerificationResult> {
  try {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    
    if (!token) {
      return { isAdmin: false, error: 'Not authenticated' }
    }

    // Use consistent URL pattern for Netlify functions
    // Local dev: http://localhost:8888 (Netlify Dev port)
    // Production: relative URL (/.netlify/functions/...)
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = `${fnBase}/.netlify/functions/admin-verify`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const text = await response.text()
      return { 
        isAdmin: false, 
        error: response.status === 403 ? 'Access denied' : `Verification failed: ${text}` 
      }
    }

    const result = await response.json() as AdminVerificationResult
    return result
  } catch (err: any) {
    return { 
      isAdmin: false, 
      error: err?.message || 'Admin verification failed' 
    }
  }
}

/**
 * Legacy client-side admin check for backward compatibility
 * This will be phased out in favor of server-side verification
 */
export function isAdminByEmail(email?: string): boolean {
  if (!email) return false
  
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  
  return adminList.includes(email.toLowerCase())
}

/**
 * Hook for admin status with server-side verification
 * Falls back to client-side check if server verification fails
 */
export function useAdminStatus(email?: string) {
  const [adminStatus, setAdminStatus] = React.useState<{
    isAdmin: boolean
    loading: boolean
    error?: string
    verified: boolean // true if server-side verified
  }>({
    isAdmin: false,
    loading: true,
    verified: false
  })

  React.useEffect(() => {
    async function checkAdminStatus() {
      setAdminStatus(prev => ({ ...prev, loading: true }))
      
      // Try server-side verification first
      const serverResult = await verifyAdminStatus()
      
      if (serverResult.isAdmin) {
        setAdminStatus({
          isAdmin: true,
          loading: false,
          verified: true
        })
        return
      }

      // Fallback to client-side check for backward compatibility
      const clientAdmin = isAdminByEmail(email)
      setAdminStatus({
        isAdmin: clientAdmin,
        loading: false,
        error: serverResult.error,
        verified: false // client-side only
      })
    }

    if (email) {
      checkAdminStatus()
    } else {
      setAdminStatus({
        isAdmin: false,
        loading: false,
        verified: false
      })
    }
  }, [email])

  return adminStatus
}

// Re-export React for the hook
import * as React from 'react'
