import { type ReactNode } from 'react'
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
}

export default function EmailVerificationGuard({ 
  children
}: EmailVerificationGuardProps) {
  const auth = useAuth()
  
  console.log('[EmailVerificationGuard] Rendering:', {
    loading: auth.loading,
    isAuthed: auth.isAuthed,
    emailVerified: auth.emailVerified
  })

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
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
        <div className="inline-block rounded-full bg-blue-100 p-3 mb-4">
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-blue-900 mb-3">
          Verify Your Email Address
        </h2>
        <p className="text-lg text-blue-800 mb-4">
          Hey, verify your email address so you can access your business and request to make changes.
        </p>
        <p className="text-blue-700 mb-6">
          Once you verify your email, you'll be able to view your business listings, manage your profile, and submit change requests.
        </p>
        <div className="bg-white rounded-lg border border-blue-200 p-6 text-left max-w-2xl mx-auto">
          <h3 className="font-semibold text-blue-900 mb-3">What you can do after verifying:</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              View and manage your business listings
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Request changes to your business information
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Post job openings and manage applications
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Access analytics and business insights
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

