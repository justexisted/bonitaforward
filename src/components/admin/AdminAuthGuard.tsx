import type { ReactNode } from 'react'

// ============================================================================
// ADMIN AUTH GUARD COMPONENT
// ============================================================================

/**
 * AdminAuthGuard - Authentication guard for admin pages
 * 
 * This component handles three authentication states:
 * 1. **Loading**: Shows skeleton UI while authentication is being verified
 * 2. **Not Signed In**: Shows "Please sign in" message when no email is present
 * 3. **Unauthorized**: Shows "Unauthorized" message when user is not an admin
 * 
 * If all checks pass, renders the children (the actual admin content).
 * 
 * Features:
 * - Prevents flash of "Please sign in" during auth loading
 * - Consistent error UI across admin pages
 * 
 * Critical Fix:
 * The auth.loading check prevents showing "Please sign in" message when
 * auth.email is temporarily undefined during the authentication loading phase.
 * This was causing a confusing UX where signed-in users would briefly see
 * the sign-in prompt before the admin panel loaded.
 * 
 * @param auth - Authentication context object
 * @param isAdmin - Whether the current user has admin privileges
 * @param adminStatus - Admin verification status details
 * @param children - Content to render when authentication passes
 */

export interface AdminAuthGuardProps {
  auth: {
    email: string | null
    loading: boolean
    isAuthed: boolean
  }
  isAdmin: boolean
  adminStatus: {
    verified: boolean
    error?: string
    [key: string]: any
  }
  children: ReactNode
}

export function AdminAuthGuard({
  auth,
  isAdmin,
  adminStatus,
  children
}: AdminAuthGuardProps) {
  /**
   * CRITICAL FIX: Admin page auth check
   * 
   * The issue was that auth.email was temporarily undefined during auth loading,
   * causing the "Please sign in" message to show even when user was signed in.
   * 
   * Fix: Check auth.loading state to prevent premature "sign in" message.
   */
  if (!auth.email) {
    // Don't show "please sign in" message while auth is still loading
    if (auth.loading) {
      return (
        <section className="py-8">
          <div className="container-px mx-auto max-w-3xl">
            <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        </section>
      )
    }
    
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
          </div>
        </div>
      </section>
    )
  }

  // Wait for admin verification to complete before showing unauthorized message
  if (adminStatus.loading) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2 mt-2"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
          </div>
        </div>
      </section>
    )
  }

  // All authentication checks passed - render the protected content
  return <>{children}</>
}

