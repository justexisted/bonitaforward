import { Link } from 'react-router-dom'
import type { BusinessApplication } from '../types'

/**
 * APPLICATION CARD COMPONENT
 * 
 * Displays a single business application with basic information
 * and allows the owner to request a status update from the admin.
 * 
 * Extracted from MyBusiness.tsx for better maintainability.
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - application.status: Must be 'pending' | 'approved' | 'rejected' | 'cancelled' | 'deleted' | null
 * - application.challenge: Contains JSON with update request metadata
 * - onDeleteRejected: Function to delete approved, rejected, or cancelled applications
 * - onCancelPending: Function to cancel pending applications
 * - onRequestFreeListing: Function to request status update for pending applications
 * 
 * WHAT DEPENDS ON THIS:
 * - MyBusiness.tsx: Renders ApplicationCard for each application
 * - useBusinessOperations: Provides delete/cancel/request functions
 * 
 * BREAKING CHANGES:
 * - If you change status values → Delete button won't show for approved applications (fixed: now includes 'approved')
 * - If you change delete button condition → Users won't be able to delete approved applications
 * - If you remove 'deleted' status badge → Deleted applications won't display correctly
 * 
 * RECENT CHANGES (2025-01-XX):
 * - ✅ Added delete button for approved applications (was only for rejected/cancelled)
 * - ✅ Added 'deleted' status badge display
 * - ✅ Updated delete button condition to include 'approved' status
 * 
 * RELATED FILES:
 * - src/pages/MyBusiness/hooks/useBusinessOperations.ts: Provides delete function
 * - netlify/functions/delete-business-application.ts: Backend deletion logic
 * - src/pages/MyBusiness/types.ts: BusinessApplication type definition
 * 
 * See: docs/prevention/CASCADING_FAILURES.md - Section #31 (Business Application Delete Button)
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

    if (status === 'deleted') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
            />
          </svg>
          <span>Deleted</span>
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
          
          {(application.status === 'pending' || !application.status) && (
            <p className="text-sm text-amber-700 mt-3">
              ⏳ Your application is under review. You'll be notified once a decision has been made.
            </p>
          )}

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
          {onDeleteRejected && (application.status === 'approved' || application.status === 'rejected' || application.status === 'cancelled') && (
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

