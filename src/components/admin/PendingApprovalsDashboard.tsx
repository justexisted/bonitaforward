import type { 
  BusinessApplicationRow, 
  ContactLeadRow, 
  FlaggedEventRow,
  ProviderChangeRequestWithDetails,
  ProviderJobPostWithDetails,
  AdminSection
} from '../../types/admin'

// ============================================================================
// PENDING APPROVALS DASHBOARD COMPONENT
// ============================================================================

/**
 * PendingApprovalsDashboard - Displays overview of pending admin tasks
 * 
 * Shows counts and quick previews of:
 * - Pending business applications
 * - Pending change requests
 * - Pending job posts
 * - Contact/feature request leads
 * - Flagged calendar events
 * 
 * Features:
 * - Visual cards for each pending category
 * - Quick action buttons to navigate to each section
 * - Preview of first 2 items in each category
 * - Color-coded alerts (amber for pending, red for flagged)
 * 
 * @param bizApps - Pending business applications
 * @param changeRequests - All provider change requests
 * @param jobPosts - All job posts
 * @param contactLeads - Contact/feature request leads
 * @param flaggedEvents - Flagged calendar events
 * @param onSectionChange - Callback to navigate to a specific admin section
 */

export interface PendingApprovalsDashboardProps {
  bizApps: BusinessApplicationRow[]
  changeRequests: ProviderChangeRequestWithDetails[]
  jobPosts: ProviderJobPostWithDetails[]
  contactLeads: ContactLeadRow[]
  flaggedEvents: FlaggedEventRow[]
  onSectionChange: (section: AdminSection) => void
}

export function PendingApprovalsDashboard({
  bizApps,
  changeRequests,
  jobPosts,
  contactLeads,
  flaggedEvents,
  onSectionChange
}: PendingApprovalsDashboardProps) {
  // Filter to only pending items
  const pendingChangeRequests = changeRequests.filter(req => req.status === 'pending')
  const pendingJobPosts = jobPosts.filter(job => job.status === 'pending')

  // Calculate if there are any pending items to show
  const hasPendingItems = 
    bizApps.length > 0 ||
    pendingChangeRequests.length > 0 ||
    pendingJobPosts.length > 0 ||
    contactLeads.length > 0 ||
    flaggedEvents.length > 0

  // Don't render if nothing pending
  if (!hasPendingItems) {
    return null
  }

  return (
    <div className="mt-6 mb-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-amber-800">Pending Approvals</h3>
            <div className="mt-2 text-sm text-amber-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Pending Business Applications */}
                {bizApps.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="font-medium text-amber-800">Business Applications</div>
                    <div className="text-xs text-amber-600 mt-1">{bizApps.length} pending</div>
                    <div className="text-xs text-amber-700 mt-2">
                      {bizApps.slice(0, 2).map(app => (
                        <div key={app.id} className="truncate">
                          {app.business_name || app.full_name || 'Unnamed Business'}
                        </div>
                      ))}
                      {bizApps.length > 2 && <div className="text-amber-500">+{bizApps.length - 2} more</div>}
                    </div>
                  </div>
                )}

                {/* Pending Change Requests */}
                {pendingChangeRequests.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="font-medium text-amber-800">Change Requests</div>
                    <div className="text-xs text-amber-600 mt-1">
                      {pendingChangeRequests.length} pending
                    </div>
                    <div className="text-xs text-amber-700 mt-2">
                      {pendingChangeRequests.slice(0, 2).map(req => (
                        <div key={req.id} className="truncate">
                          {/* Show business name if available, otherwise show request type */}
                          {req.providers?.name ? `${req.providers.name} - ` : ''}
                          {req.type === 'feature_request' ? 'Featured Upgrade' : 
                           req.type === 'update' ? 'Listing Update' : 
                           req.type === 'delete' ? 'Listing Deletion' :
                           req.type === 'claim' ? 'Business Claim' : req.type}
                        </div>
                      ))}
                      {pendingChangeRequests.length > 2 && (
                        <div className="text-amber-500">+{pendingChangeRequests.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pending Job Posts */}
                {pendingJobPosts.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="font-medium text-amber-800">Job Posts</div>
                    <div className="text-xs text-amber-600 mt-1">
                      {pendingJobPosts.length} pending
                    </div>
                    <div className="text-xs text-amber-700 mt-2">
                      {pendingJobPosts.slice(0, 2).map(job => (
                        <div key={job.id} className="truncate">
                          {job.title}
                        </div>
                      ))}
                      {pendingJobPosts.length > 2 && (
                        <div className="text-amber-500">+{pendingJobPosts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pending Contact Leads */}
                {contactLeads.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="font-medium text-amber-800">Contact Leads</div>
                    <div className="text-xs text-amber-600 mt-1">{contactLeads.length} pending</div>
                    <div className="text-xs text-amber-700 mt-2">
                      {contactLeads.slice(0, 2).map(lead => (
                        <div key={lead.id} className="truncate">
                          {lead.business_name || 'Unnamed Business'}
                        </div>
                      ))}
                      {contactLeads.length > 2 && <div className="text-amber-500">+{contactLeads.length - 2} more</div>}
                    </div>
                  </div>
                )}

                {/* Flagged Calendar Events */}
                {flaggedEvents.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-red-300">
                    <div className="font-medium text-red-800">Flagged Events</div>
                    <div className="text-xs text-red-600 mt-1">{flaggedEvents.length} flagged</div>
                    <div className="text-xs text-red-700 mt-2">
                      {flaggedEvents.slice(0, 2).map(flag => (
                        <div key={flag.id} className="truncate">
                          {flag.event?.title || 'Event deleted'} ({flag.reason})
                        </div>
                      ))}
                      {flaggedEvents.length > 2 && <div className="text-red-500">+{flaggedEvents.length - 2} more</div>}
                    </div>
                    <button
                      onClick={() => onSectionChange('flagged-events')}
                      className="mt-3 w-full px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                    >
                      Review Flagged Events
                    </button>
                  </div>
                )}
              </div>
              
              {/* Quick Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {bizApps.length > 0 && (
                  <button 
                    onClick={() => onSectionChange('business-applications')}
                    className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    Review Applications ({bizApps.length})
                  </button>
                )}
                {pendingChangeRequests.length > 0 && (
                  <button 
                    onClick={() => onSectionChange('owner-change-requests')}
                    className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    Review Changes ({pendingChangeRequests.length})
                  </button>
                )}
                {pendingJobPosts.length > 0 && (
                  <button 
                    onClick={() => onSectionChange('job-posts')}
                    className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    Review Jobs ({pendingJobPosts.length})
                  </button>
                )}
                {contactLeads.length > 0 && (
                  <button 
                    onClick={() => onSectionChange('contact-leads')}
                    className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    Review Leads ({contactLeads.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

