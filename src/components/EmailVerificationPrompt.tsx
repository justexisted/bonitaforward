import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * EMAIL VERIFICATION PROMPT COMPONENT
 * 
 * Displays a message to unverified users asking them to verify their email.
 * Shows a resend verification email button.
 * 
 * This component should be shown when:
 * - User is authenticated but email is not verified
 * - User tries to access protected features
 */
export default function EmailVerificationPrompt() {
  const auth = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleResend = async () => {
    if (!auth.email) return
    
    setSending(true)
    setMessage(null)
    
    try {
      const result = await auth.resendVerificationEmail()
      if (result.error) {
        setMessage(`Failed to send verification email: ${result.error}`)
      } else {
        setMessage('Verification email sent! Please check your inbox and spam folder.')
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Failed to send verification email'}`)
    } finally {
      setSending(false)
    }
  }

  if (!auth.isAuthed || auth.emailVerified) {
    return null
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Please verify your email address
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your email address ({auth.email}) has not been verified. 
              Please check your inbox for a verification email and click the link to verify your account.
            </p>
            {message && (
              <p className={`mt-2 ${message.includes('Failed') || message.includes('Error') ? 'text-red-700' : 'text-green-700'}`}>
                {message}
              </p>
            )}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

