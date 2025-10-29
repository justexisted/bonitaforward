/**
 * HISTORICAL REQUESTS TAB
 * 
 * Displays approved or rejected change requests from the last 30 days.
 * This component is reusable for both "Recently Approved" and "Recently Rejected" tabs.
 */

import type { ProviderChangeRequest } from '../../../lib/supabaseData'
import type { BusinessListing } from '../types'

interface HistoricalRequestsTabProps {
  status: 'approved' | 'rejected'
  nonFeaturedChangeRequests: ProviderChangeRequest[]
  listings: BusinessListing[]
}

export function HistoricalRequestsTab({
  status,
  nonFeaturedChangeRequests,
}: HistoricalRequestsTabProps) {
  // Filter requests by status and date (last 30 days)
  const filteredRequests = nonFeaturedChangeRequests.filter(req => 
    req.status === status && 
    req.decided_at && 
    new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  // Styling based on status
  const styles = status === 'approved' ? {
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-900',
    badgeColor: 'bg-green-100 text-green-800',
    labelColor: 'text-green-700',
    metaColor: 'text-green-600',
    cardBorderColor: 'border-green-200'
  } : {
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    textColor: 'text-red-900',
    badgeColor: 'bg-red-100 text-red-800',
    labelColor: 'text-red-700',
    metaColor: 'text-red-600',
    cardBorderColor: 'border-red-200'
  }

  const title = status === 'approved' ? 'Recently Approved Requests' : 'Recently Rejected Requests'
  const description = status === 'approved' 
    ? 'Change requests that have been approved in the last 30 days'
    : 'Change requests that have been rejected in the last 30 days'
  const emptyTitle = status === 'approved' ? 'No Recently Approved Requests' : 'No Recently Rejected Requests'
  const emptyMessage = status === 'approved'
    ? 'Approved change requests from the last 30 days will appear here.'
    : 'Rejected change requests from the last 30 days will appear here.'
  const statusLabel = status === 'approved' ? 'Approved' : 'Rejected'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
          <h3 className="text-lg font-medium text-neutral-900">{emptyTitle}</h3>
          <p className="mt-2 text-neutral-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div key={request.id} className={`rounded-xl border ${styles.borderColor} p-4 ${styles.bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${styles.textColor}`}>
                    {request.type === 'update' ? 'Business Listing Update' : 
                     request.type === 'delete' ? 'Business Listing Deletion' :
                     request.type === 'feature_request' ? 'Featured Upgrade Request' :
                     request.type === 'claim' ? 'Business Claim Request' : request.type}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badgeColor}`}>
                    {status}
                  </span>
                </div>
                <div className={`text-xs ${styles.metaColor}`}>
                  {statusLabel} {request.decided_at ? new Date(request.decided_at).toLocaleString() : 'recently'}
                </div>
              </div>

              {/* Show the changes */}
              {request.changes && Object.keys(request.changes).length > 0 && (
                <div className={`mb-3 p-3 bg-white rounded-lg border ${styles.cardBorderColor}`}>
                  <div className={`text-sm font-medium ${styles.labelColor} mb-2`}>
                    {status === 'approved' ? 'Approved Changes:' : 'Rejected Changes:'}
                  </div>
                  <div className={`text-sm ${styles.metaColor} space-y-1`}>
                    {Object.keys(request.changes).map((field) => (
                      <div key={field} className="capitalize">
                        {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`text-xs ${styles.metaColor}`}>
                <div>Provider ID: {request.provider_id}</div>
                {request.reason && (
                  <div className={`mt-2 ${status === 'rejected' ? styles.textColor + ' font-medium' : ''}`}>
                    {status === 'rejected' ? 'Admin Response: ' : 'Reason: '}{request.reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

