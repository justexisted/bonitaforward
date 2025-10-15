import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

/**
 * PRICING PAGE
 * 
 * This page displays the subscription comparison for business accounts.
 * It shows the Free vs Featured account options with clear pricing and features.
 * 
 * Features:
 * - Free and Featured account comparison
 * - Interactive buttons for plan selection
 * - Persistent state tracking
 * - Business account only access
 */
export default function PricingPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  /**
   * SELECT FREE ACCOUNT
   * 
   * This function redirects to My Business page where the free account selection is handled.
   * Passes 'selectFree' state so MyBusiness page can auto-select the free option.
   */
  const selectFreeAccount = () => {
    // Redirect to My Business page with state indicating free account selection
    navigate('/my-business', { state: { autoSelectPlan: 'free' } })
  }

  /**
   * UPGRADE TO FEATURED TIER
   * 
   * This function redirects to My Business page where the featured upgrade is handled.
   * Passes 'selectFeatured' state so MyBusiness page can auto-select the featured option.
   */
  const upgradeToFeatured = () => {
    // Redirect to My Business page with state indicating featured account selection
    navigate('/my-business', { state: { autoSelectPlan: 'featured' } })
  }

  // Check authentication when component loads
  useEffect(() => {
    if (!auth.isAuthed) {
      navigate('/signin', { state: { from: '/pricing' } })
      return
    }

    if (auth.role !== 'business') {
      setMessage(`This page is only available for business accounts. Your current role: ${auth.role || 'none'}`)
      return
    }
  }, [auth.role, auth.isAuthed, navigate])

  // Redirect if not authenticated or not business account
  if (!auth.isAuthed) {
    return null
  }

  if (auth.role !== 'business') {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-6xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-2xl font-semibold text-red-900 mb-4">Access Restricted</h1>
            <p className="text-red-800">
              This page is only available for business accounts. Your current role: {auth.role || 'none'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Choose Your Business Plan</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Select the plan that best fits your business needs. You can upgrade or change your plan at any time.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* Subscription Comparison Section - Always visible on Pricing page */}
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900 mb-6 text-center">Compare Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Account Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    Free Account
                  </h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">$0/month</p>
                </div>
                <ul className="text-sm text-neutral-700 space-y-2">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Business name, category, phone, email
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Website and address
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic business description (up to 200 characters)
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic tags and specialties
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    1 business image
                  </li>
                </ul>
                <button
                  onClick={selectFreeAccount}
                  className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Choose Free Account
                </button>
              </div>
              
              {/* Featured Account Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                    Featured Account
                  </h3>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">$97/year</p>
                </div>
                <ul className="text-sm text-neutral-700 space-y-2">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Everything in Free, plus:</strong>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Priority placement</strong> - appears at top of search results
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Enhanced description</strong> - up to 500 characters
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Social media links</strong> - Facebook, Instagram, etc.
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Google Maps integration</strong> - interactive location
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Multiple images</strong> - showcase your business
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Booking system</strong> - direct appointment scheduling
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>Analytics</strong> - view customer interactions
                  </li>
                </ul>
                <button
                  onClick={upgradeToFeatured}
                  className="w-full mt-4 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  Choose Featured Account
                </button>
              </div>
            </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Secure & Safe</h3>
            <p className="text-neutral-600 text-sm">Your business information is protected with enterprise-grade security.</p>
          </div>
          
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Quick Setup</h3>
            <p className="text-neutral-600 text-sm">Get your business listed and visible to customers in minutes.</p>
          </div>
          
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">24/7 Support</h3>
            <p className="text-neutral-600 text-sm">Our team is here to help you succeed with your business listing.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
