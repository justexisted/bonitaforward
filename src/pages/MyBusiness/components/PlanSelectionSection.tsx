/**
 * PlanSelectionSection Component
 * 
 * Displays a comparison between Free and Featured account plans
 * Allows users to select their preferred plan tier
 * 
 * @param onSelectFree - Callback when user chooses free account
 * @param onSelectFeatured - Callback when user chooses featured account
 */

interface PlanSelectionSectionProps {
  onSelectFree: () => void
  onSelectFeatured: () => void
}

export function PlanSelectionSection({ onSelectFree, onSelectFeatured }: PlanSelectionSectionProps) {
  return (
    <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm my-business-plan-card">
      <h2 className="text-xl font-semibold text-neutral-900 mb-6 text-center my-business-heading-xl">Choose Your Business Plan</h2>
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
            <li className="flex items-start">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-amber-700"><strong>Changes require admin approval</strong> (1-2 business days)</span>
            </li>
          </ul>
          <button
            onClick={onSelectFree}
            className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium my-business-btn-lg"
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
              <strong>Exclusive coupons</strong> - create special offers for customers
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <strong>Analytics</strong> - view customer interactions
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700"><strong>No admin approval needed</strong> - make changes instantly</span>
            </li>
          </ul>
          <button
            onClick={onSelectFeatured}
            className="w-full mt-4 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium my-business-btn-lg"
          >
            Choose Featured Account
          </button>
        </div>
      </div>
    </div>
  )
}


