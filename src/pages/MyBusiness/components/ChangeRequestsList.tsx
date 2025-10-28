/**
 * CHANGE REQUESTS LIST COMPONENT
 * 
 * Displays the Change Requests tab content with detailed view of all change requests.
 * Shows specific field changes, status, and allows cancellation of pending requests.
 * 
 * Features:
 * - Empty state when no requests exist
 * - Detailed view of each change request with before/after comparison
 * - Status badges (pending, approved, rejected, cancelled)
 * - Cancel button for pending requests
 * - Field-by-field change comparison
 */

import { type ProviderChangeRequest } from '../../../lib/supabaseData'
import { type BusinessListing } from '../types'

interface ChangeRequestsListProps {
  nonFeaturedChangeRequests: ProviderChangeRequest[]
  listings: BusinessListing[]
  cancelChangeRequest: (id: string) => Promise<void>
}

export function ChangeRequestsList({
  nonFeaturedChangeRequests,
  listings,
  cancelChangeRequest
}: ChangeRequestsListProps) {
  // Format field names for better readability
  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Id', 'ID')
      .replace('Url', 'URL')
      .replace('Email', 'Email')
      .replace('Phone', 'Phone')
  }

  // Format values for better display
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'Not set'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.length > 0 ? val.join(', ') : 'None'
      }
      return JSON.stringify(val)
    }
    if (typeof val === 'string' && val.length > 50) {
      return val.substring(0, 50) + '...'
    }
    return String(val)
  }

  // Get request type display name
  const getRequestTypeName = (type: string): string => {
    switch (type) {
      case 'update': return 'Business Listing Update'
      case 'delete': return 'Business Listing Deletion'
      case 'feature_request': return 'Featured Upgrade Request'
      case 'claim': return 'Business Claim Request'
      default: return type
    }
  }

  // Get status badge classes
  const getStatusClasses = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get decided status text
  const getDecidedStatusText = (status: string): string => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Change Requests</h2>
          <p className="text-sm text-neutral-600">Track your pending business listing changes</p>
        </div>
      </div>

      {nonFeaturedChangeRequests.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
          <h3 className="text-lg font-medium text-neutral-900">No Change Requests</h3>
          <p className="mt-2 text-neutral-600">
            You haven't submitted any change requests yet. Edit your business listings to create change requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nonFeaturedChangeRequests.map((request) => (
            <div key={request.id} className="rounded-xl border border-neutral-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-neutral-900">
                    {getRequestTypeName(request.type)}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClasses(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(request.created_at).toLocaleString()}
                </div>
              </div>

              {/* Show the changes being requested */}
              {request.changes && Object.keys(request.changes).length > 0 && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Specific Changes Being Requested:</div>
                  <div className="text-sm text-gray-600 space-y-2">
                    {Object.entries(request.changes).map(([field, value]) => {
                      // Get current value from the listing for comparison
                      const currentListing = listings.find(l => l.id === request.provider_id)
                      const currentValue = currentListing ? (currentListing as any)[field] : null
                      
                      return (
                        <div key={field} className="border-l-2 border-blue-200 pl-3 py-1">
                          <div className="font-medium text-gray-800">{formatFieldName(field)}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex justify-between">
                              <span>Current: <span className="text-gray-600">{formatValue(currentValue)}</span></span>
                              <span className="text-blue-600">→</span>
                              <span>New: <span className="text-gray-600">{formatValue(value)}</span></span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-neutral-600">
                  <div>Provider ID: {request.provider_id}</div>
                  {request.reason && <div>Reason: {request.reason}</div>}
                  {request.decided_at && (
                    <div>
                      {getDecidedStatusText(request.status)} on: {new Date(request.decided_at).toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Cancel button for pending requests */}
                {request.status === 'pending' && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this change request? This action cannot be undone.')) {
                        cancelChangeRequest(request.id)
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

