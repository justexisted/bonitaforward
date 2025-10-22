import { ReactNode } from 'react'

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
 * - Debug information for troubleshooting auth issues
 * - Console logging for monitoring auth flow
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
    console.log('[Admin] 🚫 NO EMAIL - Rendering auth check UI')
    console.log('[Admin] Auth state:', { 
      email: auth.email, 
      loading: auth.loading, 
      isAuthed: auth.isAuthed 
    })
    
    // Don't show "please sign in" message while auth is still loading
    if (auth.loading) {
      console.log('[Admin] ⏳ Auth loading - showing skeleton')
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
    
    console.log('[Admin] 🚫 Auth not loading but no email - showing "Please sign in"')
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: email={auth.email || 'none'}, loading={String(auth.loading)}, isAuthed={String(auth.isAuthed)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    console.log('[Admin] 🚫 NOT ADMIN - Showing unauthorized message')
    console.log('[Admin] isAdmin:', isAdmin, 'adminStatus:', adminStatus)
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: isAdmin={String(isAdmin)}, email={auth.email}, adminStatus={JSON.stringify(adminStatus)}
            </div>
          </div>
        </div>
      </section>
    )
  }
  
  /* console.log('[Admin] ✅ Auth checks passed - rendering admin panel') */

  // All authentication checks passed - render the protected content
  return <>{children}</>
}

