import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

/**
 * Reusable loading spinner component
 */
function LoadingSpinner({ message = 'Loading...', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
      <p className="mt-4 text-neutral-600">{message}</p>
    </div>
  )
}

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

/**
 * ProtectedRoute component for role-based access control
 * 
 * Features:
 * - Redirects unauthenticated users to sign-in page
 * - Redirects users without proper role to home page
 * - Blocks unverified users from accessing protected content
 * - Shows loading state while authentication is being determined
 * - Supports multiple allowed roles
 */
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: ('business' | 'community')[]
  requireEmailVerification?: boolean // Whether email verification is required (default: true)
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireEmailVerification = true // Default to requiring email verification
}: ProtectedRouteProps) {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Don't redirect while still loading
    if (auth.loading) return

    if (!auth.isAuthed) {
      navigate('/signin')
      return
    }

    // Check email verification if required
    if (requireEmailVerification && !auth.emailVerified) {
      // Don't redirect - let EmailVerificationGuard handle it
      return
    }

    if (!allowedRoles.includes(auth.role || 'community')) {
      navigate('/')
      return
    }
  }, [auth.isAuthed, auth.loading, auth.role, auth.emailVerified, allowedRoles, requireEmailVerification, navigate])

  // Show loading state while authentication is being determined
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    )
  }

  if (!auth.isAuthed || !allowedRoles.includes(auth.role || 'community')) {
    return null
  }

  // Block unverified users if email verification is required
  if (requireEmailVerification && !auth.emailVerified) {
    return null // EmailVerificationGuard will show the verification prompt
  }

  return <>{children}</>
}
