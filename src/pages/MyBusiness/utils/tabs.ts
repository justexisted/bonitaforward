/**
 * TAB CONFIGURATION UTILITIES
 * 
 * This module handles the tab configuration for the My Business dashboard.
 * It provides helper functions to calculate tab counts and configure tabs.
 */

import type { ProviderChangeRequest } from '../../../lib/supabaseData'
import type { BusinessListing, BusinessApplication, JobPost, UserActivity } from '../types'

/**
 * Tab key type definition
 */
export type TabKey = 'listings' | 'applications' | 'jobs' | 'change-requests' | 'user-activity' | 'analytics' | 'recently-approved' | 'recently-rejected' | 'pending-requests'

/**
 * Tab configuration interface
 */
export interface TabConfig {
  key: TabKey
  label: string
  count?: number
}

/**
 * Helper function to get change requests for non-featured businesses only
 * Featured businesses (is_member: true) have direct edit access and don't use change requests
 * 
 * IMPORTANT: This includes change requests with null provider_id (new listing requests)
 */
export function getNonFeaturedChangeRequests(
  listings: BusinessListing[],
  changeRequests: ProviderChangeRequest[]
): ProviderChangeRequest[] {
  // Get IDs of featured listings
  const featuredBusinessIds = listings
    .filter(listing => listing.is_member)
    .map(listing => listing.id)
  
  // Return all change requests EXCEPT those for featured listings
  // Include requests with null provider_id (new listing requests)
  return changeRequests.filter(req => 
    !req.provider_id || // Include if no provider_id (new listing request)
    !featuredBusinessIds.includes(req.provider_id) // Or if not a featured listing
  )
}

/**
 * Creates the tab configuration for the dashboard
 * Calculates counts and filters based on current data
 */
export function createTabsConfig(
  listings: BusinessListing[],
  applications: BusinessApplication[],
  jobPosts: JobPost[],
  changeRequests: ProviderChangeRequest[],
  userActivity: UserActivity[]
): readonly TabConfig[] {
  const nonFeaturedChangeRequests = getNonFeaturedChangeRequests(listings, changeRequests)
  
  // 30 days ago threshold for recent approvals/rejections
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  return [
    { key: 'listings', label: 'Business Listings', count: listings.length },
    { key: 'applications', label: 'Applications', count: applications.length },
    { key: 'jobs', label: 'Job Posts', count: jobPosts.length },
    { 
      key: 'change-requests', 
      label: 'Change Requests', 
      count: nonFeaturedChangeRequests.filter(req => req.status === 'pending').length 
    },
    { key: 'user-activity', label: 'User Activity', count: userActivity.length },
    { key: 'analytics', label: 'Analytics' },
    { 
      key: 'recently-approved', 
      label: 'Recently Approved', 
      count: nonFeaturedChangeRequests.filter(
        req => req.status === 'approved' && 
        req.decided_at && 
        new Date(req.decided_at) > thirtyDaysAgo
      ).length 
    },
    { 
      key: 'recently-rejected', 
      label: 'Recently Rejected', 
      count: nonFeaturedChangeRequests.filter(
        req => req.status === 'rejected' && 
        req.decided_at && 
        new Date(req.decided_at) > thirtyDaysAgo
      ).length 
    },
    { 
      key: 'pending-requests', 
      label: 'Pending Requests', 
      count: nonFeaturedChangeRequests.filter(req => req.status === 'pending').length 
    }
  ] as const
}

