import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Unsubscribe() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'not-found'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleUnsubscribe = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      // Find user by email
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, email_notifications_enabled')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (fetchError || !profile) {
        setStatus('not-found')
        return
      }

      // Check if already unsubscribed
      if (!profile.email_notifications_enabled) {
        setStatus('success')
        return
      }

      // Update preferences
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          email_notifications_enabled: false,
          marketing_emails_enabled: false,
          email_unsubscribe_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('[Unsubscribe] Error updating preferences:', updateError)
        setErrorMessage(updateError.message)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (error: any) {
      console.error('[Unsubscribe] Exception:', error)
      setErrorMessage(error.message || 'An unexpected error occurred')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Unsubscribe from Emails
            </h1>
            <p className="text-gray-600">
              We're sorry to see you go. You can unsubscribe from email notifications below.
            </p>
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    You've been unsubscribed
                  </h3>
                  <p className="text-green-800 mb-4">
                    You will no longer receive email notifications from Bonita Forward.
                  </p>
                  <div className="bg-green-100 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-900 font-medium mb-2">
                      You'll still receive:
                    </p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Security alerts and password resets</li>
                      <li>• Critical account notifications</li>
                      <li>• Legal or compliance updates</li>
                    </ul>
                  </div>
                  <p className="text-sm text-green-700">
                    You can re-enable email notifications anytime in your{' '}
                    <a href="/account" className="font-semibold underline hover:text-green-900">
                      account settings
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Not Found State */}
          {status === 'not-found' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Email not found
                  </h3>
                  <p className="text-yellow-800 mb-3">
                    We couldn't find an account with that email address.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Please double-check your email address, or{' '}
                    <a href="/contact" className="font-semibold underline hover:text-yellow-900">
                      contact support
                    </a>{' '}
                    if you need assistance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-red-800 mb-3">
                    We couldn't process your unsubscribe request.
                  </p>
                  {errorMessage && (
                    <p className="text-sm text-red-700 mb-3 font-mono bg-red-100 p-2 rounded">
                      {errorMessage}
                    </p>
                  )}
                  <p className="text-sm text-red-700">
                    Please try again or{' '}
                    <a href="/contact" className="font-semibold underline hover:text-red-900">
                      contact support
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {status !== 'success' && (
            <form onSubmit={handleUnsubscribe} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter the email address associated with your Bonita Forward account
                </p>
              </div>

              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 focus:ring-4 focus:ring-red-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Unsubscribe from Emails'
                )}
              </button>
            </form>
          )}

          {/* Footer Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              What happens when you unsubscribe?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>You'll stop receiving business update notifications</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>You'll stop receiving newsletters and promotional emails</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Your account will remain active</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>You can re-enable emails anytime in your account settings</span>
              </li>
            </ul>

            <div className="mt-6 text-center">
              <a 
                href="https://www.bonitaforward.com" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to Bonita Forward
              </a>
            </div>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Bonita Forward | San Diego, CA 92108, United States
          </p>
        </div>
      </div>
    </div>
  )
}

