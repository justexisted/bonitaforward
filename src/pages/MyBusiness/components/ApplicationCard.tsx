import { Link } from 'react-router-dom'
import type { BusinessApplication } from '../types'

/**
 * APPLICATION CARD COMPONENT
 * 
 * Displays a single business application with basic information
 * and allows the owner to request a status update from the admin.
 * 
 * Extracted from MyBusiness.tsx for better maintainability.
 */

interface ApplicationCardProps {
  application: BusinessApplication
  onRequestFreeListing: (applicationId: string) => void
  onDeleteRejected?: (applicationId: string) => void
  onCancelPending?: (applicationId: string, businessName: string) => void
}

export function ApplicationCard({ application, onRequestFreeListing, onDeleteRejected, onCancelPending }: ApplicationCardProps) {
  // Determine status badge styling based on application status
  const getStatusBadge = () => {
    const status = application.status || 'pending'
    
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>Approved</span>
        </span>
      )
    }
    
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>Rejected</span>
        </span>
      )
    }

    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
          <svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
          <span>Cancelled</span>
        </span>
      )
    }
    
    // Pending status (default)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <svg 
          className="w-3.5 h-3.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span>Pending Review</span>
      </span>
    )
  }

  const updateRequestMeta = (() => {
    if (!application.challenge) return { exists: false, latest: null as any }
    try {
      const parsed = JSON.parse(application.challenge)
      const updates = Array.isArray(parsed.update_requests)
        ? parsed.update_requests
        : parsed.update_request
        ? [parsed.update_request]
        : []
      if (updates.length === 0) return { exists: false, latest: null as any }
      return { exists: true, latest: updates[updates.length - 1] }
    } catch {
      return { exists: false, latest: null as any }
    }
  })()
  
  // Only show "Request Update" button for pending applications without an open request
  const showRequestButton = (application.status === 'pending' || !application.status) && !updateRequestMeta.exists
  
  return (
    <div key={application.id} className="rounded-2xl border border-neutral-100 p-6 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{application.business_name}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            <span className="font-medium">Category:</span> {application.category}
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            {application.email} {application.phone && `• ${application.phone}`}
          </p>
          <p className="text-sm text-neutral-500 mt-3">
            Applied: {new Date(application.created_at).toLocaleDateString()}
          </p>
          
          {/* Status-specific messaging */}
          {application.status === 'approved' && (
            <p className="text-sm text-green-700 mt-3 font-medium">
              ✅ Your application has been approved! Your business listing should now be visible in the directory.
            </p>
          )}
          
          {application.status === 'rejected' && (
            <p className="text-sm text-red-700 mt-3 font-medium">
              ❌ Your application was not approved. Please review the requirements and submit a new application if needed.
            </p>
          )}

          {application.status === 'cancelled' && (
            <p className="text-sm text-neutral-600 mt-3 font-medium">
              ✅ You cancelled this application. Submit a new one whenever you are ready.
            </p>
          )}
          
          <p className="text-sm text-amber-700 mt-3">
            ⏳ Your application is under review. You'll be notified once a decision has been made.
          </p>

          {updateRequestMeta.exists && (
            <p className="text-xs text-neutral-500 mt-2">
              {updateRequestMeta.latest?.message || 'Update request sent.'}
              {updateRequestMeta.latest?.requested_at && (
                <> — {new Date(updateRequestMeta.latest.requested_at).toLocaleString()}</>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {showRequestButton && (
            <button
              onClick={() => onRequestFreeListing(application.id)}
              className="rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-xs border border-green-200 hover:bg-green-100 transition-colors"
            >
              Request Update
            </button>
          )}
          {onCancelPending && (application.status === 'pending' || !application.status) && (
            <button
              onClick={() => onCancelPending(application.id, application.business_name || 'Untitled Application')}
              className="flex-shrink-0 px-3 py-2 text-sm text-amber-700 hover:text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          {onDeleteRejected && (application.status === 'rejected' || application.status === 'cancelled') && (
            <button
              onClick={() => onDeleteRejected(application.id)}
              className="flex-shrink-0 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * EMPTY STATE COMPONENT
 * Displayed when there are no applications
 */
export function ApplicationsEmptyState() {
  return (
    <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
      <h3 className="text-lg font-medium text-neutral-900">No Applications</h3>
      <p className="mt-2 text-neutral-600">You haven't submitted any business applications yet.</p>
      <Link 
        to="/business#apply" 
        className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
      >
        Apply for Business Listing
      </Link>
    </div>
  )
}

