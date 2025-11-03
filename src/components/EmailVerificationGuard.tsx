import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import EmailVerificationPrompt from './EmailVerificationPrompt'

/**
 * EMAIL VERIFICATION GUARD COMPONENT
 * 
 * Blocks unverified users from accessing protected content.
 * Shows verification prompt instead of the protected content.
 * 
 * Use this component to wrap protected features that require verified email.
 */
interface EmailVerificationGuardProps {
  children: ReactNode
  showPrompt?: boolean // Whether to show the verification prompt (default: true)
}

export default function EmailVerificationGuard({ 
  children, 
  showPrompt = true 
}: EmailVerificationGuardProps) {
  const auth = useAuth()

  // Show loading state while auth is loading
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="mt-2 text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  // User must be authenticated
  if (!auth.isAuthed) {
    return null // Let parent handle redirect to signin
  }

  // If email is verified, show protected content
  if (auth.emailVerified) {
    return <>{children}</>
  }

  // Email not verified - show verification prompt and block content
  return (
    <div className="container-px mx-auto max-w-4xl py-8">
      <EmailVerificationPrompt />
      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Email Verification Required
        </h2>
        <p className="text-neutral-600">
          Please verify your email address to access this feature.
        </p>
      </div>
    </div>
  )
}

