import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * VERIFY EMAIL PAGE
 * 
 * Handles email verification via token from verification email.
 * Redirects users after successful verification.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('No verification token provided. Please check your email for the verification link.')
      return
    }

    async function verifyEmail() {
      try {
      // Call verify-email function with token as query parameter
      // token is guaranteed to be non-null here because we return early if it's null
      const verifyUrl = `/.netlify/functions/verify-email?token=${encodeURIComponent(token!)}`
      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

        const result = await response.json()

        if (result.success) {
          setStatus('success')
          setMessage('Your email has been verified successfully! Redirecting...')
          
          // Refresh auth state to pick up verification status
          // Wait a moment then redirect
          setTimeout(() => {
            if (auth.isAuthed) {
              navigate('/account', { replace: true })
            } else {
              navigate('/signin', { replace: true })
            }
          }, 2000)
        } else {
          setStatus('error')
          // Show detailed error message if available, otherwise show generic error
          const errorMessage = result.error || 'Failed to verify email address'
          const details = result.details ? `\n\n${result.details}` : ''
          setMessage(errorMessage + details)
        }
      } catch (error: any) {
        console.error('[VerifyEmail] Error:', error)
        setStatus('error')
        setMessage(error.message || 'An error occurred while verifying your email')
      }
    }

    verifyEmail()
  }, [searchParams, navigate, auth.isAuthed])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-neutral-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Verifying Email...</h1>
            <p className="text-neutral-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-block rounded-full bg-green-100 p-3 mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h1>
            <p className="text-neutral-600 mb-4">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-block rounded-full bg-red-100 p-3 mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h1>
            <p className="text-neutral-600 mb-4">{message}</p>
            <div className="space-y-2">
              {auth.isAuthed && (
                <button
                  onClick={async () => {
                    try {
                      const result = await auth.resendVerificationEmail()
                      if (result.error) {
                        setMessage(`Failed to send verification email: ${result.error}`)
                      } else {
                        setMessage('A new verification email has been sent. Please check your inbox.')
                        setStatus('loading')
                      }
                    } catch (error: any) {
                      setMessage(`Error: ${error.message || 'Failed to send verification email'}`)
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Request New Verification Email
                </button>
              )}
              <button
                onClick={() => navigate('/signin')}
                className="w-full px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
              >
                {auth.isAuthed ? 'Go to Account' : 'Go to Sign In'}
              </button>
              <p className="text-sm text-neutral-500">
                Need help? Contact us at{' '}
                <a href="mailto:hello@bonitaforward.com" className="text-blue-600 hover:underline">
                  hello@bonitaforward.com
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

