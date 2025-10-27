/**
 * FeaturedUpgradeCard Component
 * 
 * Displays a prominent notification card when a user requests a featured upgrade.
 * Shows pending approval status and next steps for the upgrade process.
 * 
 * @param onDismiss - Callback function to close/dismiss the card
 */

interface FeaturedUpgradeCardProps {
  onDismiss: () => void
}

export function FeaturedUpgradeCard({ onDismiss }: FeaturedUpgradeCardProps) {
  return (
    <div className="my-business-mb-6 rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-7 w-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Featured Upgrade Requested!</h3>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Pending Admin Approval</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your request is in the queue. We'll review it and contact you about payment options and setup.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-900 mb-2">What happens next?</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Admin will review your request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>We'll contact you about payment ($97/year)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Once approved, you'll get priority placement & instant updates</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}


