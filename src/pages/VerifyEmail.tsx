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
      // Keep loading state while processing
      setStatus('loading')
      setMessage('Verifying your email address...')
      
      try {
        // Call verify-email function with token as query parameter
        // token is guaranteed to be non-null here because we return early if it's null
        const verifyUrl = `/.netlify/functions/verify-email?token=${encodeURIComponent(token!)}`
        console.log('[VerifyEmail] Starting verification request...')
        
        const response = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log('[VerifyEmail] Response status:', response.status, response.statusText)
        
        // Parse response body
        let result: any
        try {
          const responseText = await response.text()
          console.log('[VerifyEmail] Response body:', responseText)
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error('[VerifyEmail] Failed to parse response:', parseError)
          setStatus('error')
          setMessage(`Server error: Invalid response format. Status: ${response.status}`)
          return
        }

        console.log('[VerifyEmail] Parsed result:', result)

        // Check if verification was successful
        if (result.success === true) {
          setStatus('success')
          const successMessage = result.alreadyVerified 
            ? 'Your email is already verified!' 
            : 'Your email has been verified successfully!'
          setMessage(successMessage)
          
          // DISABLED: Automatic redirect - commented out to allow viewing console logs
          // Refresh auth state to pick up verification status
          // setTimeout(() => {
          //   if (auth.isAuthed) {
          //     navigate('/account', { replace: true })
          //   } else {
          //     navigate('/signin', { replace: true })
          //   }
          // }, 2000)
        } else {
          setStatus('error')
          // Show detailed error message if available, otherwise show generic error
          const errorMessage = result.error || 'Failed to verify email address'
          const details = result.details ? `\n\n${result.details}` : ''
          setMessage(errorMessage + details)
          console.error('[VerifyEmail] Verification failed:', result)
        }
      } catch (error: any) {
        console.error('[VerifyEmail] Network or parsing error:', error)
        setStatus('error')
        setMessage(error.message || 'An error occurred while verifying your email. Please check your connection and try again.')
      }
    }

    verifyEmail()
  }, [searchParams, navigate, auth.isAuthed])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-neutral-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Verifying Email...</h1>
            <p className="text-neutral-600 mb-4">{message || 'Please wait while we verify your email address.'}</p>
            <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-neutral-500">This may take a few seconds...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-block rounded-full bg-green-100 p-4 mb-6 animate-pulse">
              <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-3">Email Verified!</h1>
            <p className="text-neutral-700 mb-6 text-lg">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (auth.isAuthed) {
                    navigate('/account', { replace: true })
                  } else {
                    navigate('/signin', { replace: true })
                  }
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-lg"
              >
                {auth.isAuthed ? 'Go to Account' : 'Go to Sign In'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3 bg-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-block rounded-full bg-red-100 p-4 mb-6">
              <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-700 mb-3">Verification Failed</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 whitespace-pre-line text-left">{message}</p>
            </div>
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

