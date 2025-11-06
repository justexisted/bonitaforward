/**
 * HISTORICAL REQUESTS TAB
 * 
 * Displays approved or rejected change requests AND applications from the last 30 days.
 * This component is reusable for both "Recently Approved" and "Recently Rejected" tabs.
 * 
 * IMPORTANT: This component now shows BOTH:
 * 1. Change requests (from provider_change_requests table)
 * 2. Business applications (from business_applications table)
 * 
 * This ensures users can see all their approved/rejected items, whether they're
 * applications or change requests.
 * 
 * ==================================================================================
 * DEPENDENCY TRACKING - CASCADING FAILURES PREVENTION
 * ==================================================================================
 * 
 * This component depends on:
 * - MyBusiness.tsx: Passes `applications`, `nonFeaturedChangeRequests`, `listings` props
 * - useBusinessOperations.ts: Loads `applications` state from database
 * - BusinessApplication type (from types.ts): Must include `status`, `decided_at?`, `created_at`
 * - ProviderChangeRequest type (from supabaseData.ts): Must include `status`, `decided_at?`, `created_at`
 * - getNonFeaturedChangeRequests() utility: Filters change requests for non-featured businesses
 * 
 * If you change ANY of these, you MUST:
 * 1. Check this component still works
 * 2. Check all usages in MyBusiness.tsx pass required props
 * 3. Verify filtering logic still works correctly
 * 4. Test with both populated and empty data
 * 5. Update CASCADING_FAILURES.md with changes
 * 
 * Breaking Changes:
 * - ⚠️ REQUIRES `applications` PROP - All usages must pass this prop (added 2025-01-XX)
 * - If `BusinessApplication` type changes → TypeScript errors here
 * - If `decided_at` field removed → Fallback to `created_at` must be maintained
 * 
 * Related:
 * - Section #28 in CASCADING_FAILURES.md - Applications Not Showing in Sections
 * - src/pages/MyBusiness.tsx - All usages of this component
 * - src/pages/MyBusiness/hooks/useBusinessOperations.ts - Loads applications data
 * ==================================================================================
 */

import type { ProviderChangeRequest } from '../../../lib/supabaseData'
import type { BusinessListing, BusinessApplication } from '../types'

interface HistoricalRequestsTabProps {
  status: 'approved' | 'rejected'
  nonFeaturedChangeRequests: ProviderChangeRequest[]
  applications: BusinessApplication[]  // ⚠️ REQUIRED - Added 2025-01-XX
  listings: BusinessListing[]
}

export function HistoricalRequestsTab({
  status,
  nonFeaturedChangeRequests,
  applications,
}: HistoricalRequestsTabProps) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  // Filter change requests by status and date (last 30 days)
  const filteredChangeRequests = nonFeaturedChangeRequests.filter(req => 
    req.status === status && 
    req.decided_at && 
    new Date(req.decided_at) > thirtyDaysAgo
  )
  
  // Filter applications by status and date (last 30 days)
  // NOTE: business_applications table does NOT have decided_at column
  // Use created_at as the decision date (when application was created)
  // TODO: Add decided_at column to database and set it when status changes
  const filteredApplications = applications.filter(app => {
    if (app.status !== status) return false
    
    // Use created_at since decided_at column doesn't exist
    // This means we're showing applications created in last 30 days, not decided in last 30 days
    const decisionDate = new Date(app.created_at)
    return decisionDate > thirtyDaysAgo
  })
  
  // Combine both types for display
  const allItems = [
    ...filteredChangeRequests.map(req => ({ type: 'change_request' as const, data: req })),
    ...filteredApplications.map(app => ({ type: 'application' as const, data: app }))
  ]
  
  // Sort by date (most recent first)
  // NOTE: Applications don't have decided_at column, use created_at
  allItems.sort((a, b) => {
    const dateA = a.type === 'change_request' 
      ? (a.data.decided_at ? new Date(a.data.decided_at).getTime() : 0)
      : new Date(a.data.created_at).getTime()  // Applications use created_at
    const dateB = b.type === 'change_request'
      ? (b.data.decided_at ? new Date(b.data.decided_at).getTime() : 0)
      : new Date(b.data.created_at).getTime()  // Applications use created_at
    return dateB - dateA
  })
  
  console.log(`[HistoricalRequestsTab] ${status} items:`, {
    changeRequests: filteredChangeRequests.length,
    applications: filteredApplications.length,
    total: allItems.length
  })

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
    ? 'Applications and change requests that have been approved in the last 30 days'
    : 'Applications and change requests that have been rejected in the last 30 days'
  const emptyTitle = status === 'approved' ? 'No Recently Approved Requests' : 'No Recently Rejected Requests'
  const emptyMessage = status === 'approved'
    ? 'Approved applications and change requests from the last 30 days will appear here.'
    : 'Rejected applications and change requests from the last 30 days will appear here.'
  const statusLabel = status === 'approved' ? 'Approved' : 'Rejected'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
          <h3 className="text-lg font-medium text-neutral-900">{emptyTitle}</h3>
          <p className="mt-2 text-neutral-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.map((item) => {
            if (item.type === 'change_request') {
              const request = item.data as ProviderChangeRequest
              return (
                <div key={`cr-${request.id}`} className={`rounded-xl border ${styles.borderColor} p-4 ${styles.bgColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${styles.textColor}`}>
                        {request.type === 'update' ? 'Business Listing Update' : 
                         request.type === 'delete' ? 'Business Listing Deletion' :
                         request.type === 'feature_request' ? 'Featured Upgrade Request' :
                         request.type === 'claim' ? 'Business Claim Request' : request.type}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badgeColor}`}>
                        Change Request
                      </span>
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
                    {request.provider_id && <div>Provider ID: {request.provider_id}</div>}
                    {request.reason && (
                      <div className={`mt-2 ${status === 'rejected' ? styles.textColor + ' font-medium' : ''}`}>
                        {status === 'rejected' ? 'Admin Response: ' : 'Reason: '}{request.reason}
                      </div>
                    )}
                  </div>
                </div>
              )
            } else {
              const app = item.data as BusinessApplication
              // NOTE: business_applications table does NOT have decided_at column
              // Use created_at as the decision date
              const decisionDate = new Date(app.created_at)
              return (
                <div key={`app-${app.id}`} className={`rounded-xl border ${styles.borderColor} p-4 ${styles.bgColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${styles.textColor}`}>
                        Business Application: {app.business_name || 'Untitled'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badgeColor}`}>
                        Application
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badgeColor}`}>
                        {status}
                      </span>
                    </div>
                    <div className={`text-xs ${styles.metaColor}`}>
                      {statusLabel} {decisionDate.toLocaleString()}
                    </div>
                  </div>

                  <div className={`text-sm ${styles.metaColor} space-y-1 mb-3`}>
                    {app.category && (
                      <div><span className="font-medium">Category:</span> {app.category}</div>
                    )}
                    {app.tier_requested && (
                      <div><span className="font-medium">Tier Requested:</span> {app.tier_requested === 'featured' ? 'Featured' : 'Free'}</div>
                    )}
                    {app.email && (
                      <div><span className="font-medium">Email:</span> {app.email}</div>
                    )}
                  </div>

                  {status === 'rejected' && (
                    <div className={`text-xs ${styles.textColor} font-medium mt-2`}>
                      Your application was not approved. Please review the requirements and submit a new application if needed.
                    </div>
                  )}
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}

