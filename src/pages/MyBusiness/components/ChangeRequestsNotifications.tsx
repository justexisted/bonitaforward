/**
 * CHANGE REQUESTS NOTIFICATIONS COMPONENT
 * 
 * Displays collapsible notifications for change requests (pending, approved, rejected).
 * Only shown for non-featured accounts (featured accounts get instant updates).
 * 
 * Features:
 * - Collapsible toggle button with summary counts
 * - Pending requests notification with dismissal
 * - Recently approved requests notification with dismissal
 * - Recently rejected requests notification with dismissal
 * - Links to detailed change requests tab
 */

import { type ProviderChangeRequest } from '../../../lib/supabaseData'
import { type BusinessListing } from '../types'
import { type TabKey } from '../utils/tabs'

type NotificationType = 'pending' | 'approved' | 'rejected'

interface ChangeRequestsNotificationsProps {
  changeRequests: ProviderChangeRequest[]
  listings: BusinessListing[]
  showChangeRequests: boolean
  setShowChangeRequests: (show: boolean) => void
  shouldShowNotification: (notificationType: NotificationType) => boolean
  dismissNotification: (notificationType: NotificationType) => void | Promise<void>
  setActiveTab: (tab: TabKey) => void
}

export function ChangeRequestsNotifications({
  changeRequests,
  listings,
  showChangeRequests,
  setShowChangeRequests,
  shouldShowNotification,
  dismissNotification,
  setActiveTab
}: ChangeRequestsNotificationsProps) {
  // Filter out featured upgrade requests (handled separately)
  const nonFeaturedChangeRequests = changeRequests.filter(req => req.type !== 'feature_request')

  // Don't render if there are no change requests or all listings are featured
  if (changeRequests.length === 0 || !listings.some(listing => !listing.is_member)) {
    return null
  }

  const pendingCount = nonFeaturedChangeRequests.filter(req => req.status === 'pending').length
  const approvedCount = nonFeaturedChangeRequests.filter(req => 
    req.status === 'approved' && 
    req.decided_at && 
    new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length
  const rejectedCount = nonFeaturedChangeRequests.filter(req => 
    req.status === 'rejected' && 
    req.decided_at && 
    new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length

  return (
    <div className="mb-6 space-y-3">
      {/* Collapsible Toggle Button with Summary */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowChangeRequests(!showChangeRequests)}
          className="inline-flex items-center gap-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-sm font-medium text-amber-800">
              {pendingCount} Pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              {approvedCount} Recently Approved
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-800">
              {rejectedCount} Recently Rejected
            </span>
          </div>
          {/* Chevron icon */}
          <svg 
            className={`w-5 h-5 text-blue-600 transition-transform ${showChangeRequests ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Collapsible Content */}
      {showChangeRequests && (
        <div className="space-y-3">
          {/* Pending Requests */}
          {pendingCount > 0 && shouldShowNotification('pending') && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-amber-800">⏳ Pending Admin Review</h3>
                    <button
                      onClick={() => dismissNotification('pending')}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                      title="Dismiss notification"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-amber-700">
                    <p className="mb-2">You have {pendingCount} change request(s) waiting for admin approval:</p>
                    <ul className="mt-2 space-y-2">
                      {nonFeaturedChangeRequests.filter(req => req.status === 'pending').map(req => {
                        const listing = listings.find(l => l.id === req.provider_id)
                        const changeCount = req.changes ? Object.keys(req.changes).length : 0
                        
                        return (
                          <li key={req.id} className="text-xs bg-white rounded p-3 border border-amber-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-amber-900">
                                  <strong>{listing?.name || 'Business'}</strong> - {
                                    req.type === 'update' ? 'Listing Update' :
                                    req.type === 'feature_request' ? '⭐ Featured Upgrade Request' :
                                    req.type === 'delete' ? 'Deletion Request' :
                                    req.type === 'claim' ? 'Ownership Claim' :
                                    req.type
                                  }
                                </div>
                                
                                {changeCount > 0 && (
                                  <div className="text-amber-700 mt-1">
                                    {changeCount} field{changeCount !== 1 ? 's' : ''} being changed: {
                                      req.changes ? Object.keys(req.changes)
                                        .map(field => field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                        .join(', ') : 'Details available in Change Requests tab'
                                    }
                                  </div>
                                )}
                                
                                <div className="text-amber-600 mt-1">
                                  Submitted {new Date(req.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => setActiveTab('change-requests')}
                                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View Details
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recently Approved Requests */}
          {approvedCount > 0 && shouldShowNotification('approved') && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-green-800">✅ Recently Approved</h3>
                    <button
                      onClick={() => dismissNotification('approved')}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Dismiss notification"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <p className="mb-2">Great news! The following change requests have been approved:</p>
                    <ul className="mt-2 space-y-2">
                      {nonFeaturedChangeRequests.filter(req => 
                        req.status === 'approved' && 
                        req.decided_at && 
                        new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).map(req => {
                        const listing = listings.find(l => l.id === req.provider_id)
                        const changeCount = req.changes ? Object.keys(req.changes).length : 0
                        
                        return (
                          <li key={req.id} className="text-xs bg-white rounded p-3 border border-green-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-green-900">
                                  <strong>{listing?.name || 'Business'}</strong> - {
                                    req.type === 'update' ? 'Business Listing Updates' :
                                    req.type === 'feature_request' ? '⭐ Featured Upgrade' :
                                    req.type === 'delete' ? 'Business Deletion' :
                                    req.type === 'claim' ? 'Business Ownership Claim' :
                                    req.type
                                  } Approved!
                                </div>
                                
                                {changeCount > 0 && (
                                  <div className="text-green-700 mt-1">
                                    {changeCount} field{changeCount !== 1 ? 's' : ''} updated: {
                                      req.changes ? Object.keys(req.changes)
                                        .map(field => field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                        .join(', ') : 'Changes are now live'
                                    }
                                  </div>
                                )}
                                
                                <div className="text-green-600 mt-1">
                                  ✅ Approved {req.decided_at ? new Date(req.decided_at).toLocaleDateString() : 'recently'}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => setActiveTab('change-requests')}
                                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View Details
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recently Rejected Requests */}
          {rejectedCount > 0 && shouldShowNotification('rejected') && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-red-800">❌ Recently Rejected</h3>
                    <button
                      onClick={() => dismissNotification('rejected')}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Dismiss notification"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="space-y-1">
                      {nonFeaturedChangeRequests.filter(req => 
                        req.status === 'rejected' && 
                        req.decided_at && 
                        new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).map(req => {
                        const listing = listings.find(l => l.id === req.provider_id)
                        return (
                          <li key={req.id} className="text-xs bg-white rounded p-2">
                            <strong>{listing?.name || 'Business'}</strong> - {
                              req.type === 'update' ? 'Update' :
                              req.type === 'feature_request' ? 'Featured Request' :
                              req.type
                            } was rejected
                            <div className="text-red-600 mt-1">
                              {req.reason ? `Reason: ${req.reason}` : req.decided_at ? `Rejected ${new Date(req.decided_at).toLocaleDateString()}` : 'Rejected'}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

