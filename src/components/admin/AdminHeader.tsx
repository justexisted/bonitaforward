import type { AdminSection } from '../../types/admin'
import type { CustomerUser } from '../../utils/adminHelpers'

// ============================================================================
// ADMIN HEADER COMPONENT
// ============================================================================

/**
 * AdminHeader - Header section for the admin panel
 * 
 * Displays:
 * - Page title ("Admin" or "Your Data")
 * - Admin verification status badge (server-verified or client-side)
 * - User filter dropdown (for viewing specific user's data)
 * - Section selector dropdown (for navigating between admin sections)
 * - Refresh button
 * 
 * Features:
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 * - Admin-only controls (user selector and section dropdown)
 * - Visual feedback for admin verification status
 * - All users can refresh the page
 * 
 * @param isAdmin - Whether the current user is an admin
 * @param adminStatus - Admin verification status details
 * @param selectedUser - Currently selected user filter (null = all users)
 * @param section - Currently active admin section
 * @param customerUsers - List of customer user objects for filtering
 * @param onUserChange - Callback when user filter changes
 * @param onSectionChange - Callback when section changes
 */

export interface AdminHeaderProps {
  isAdmin: boolean
  adminStatus: {
    verified: boolean
    error?: string
  }
  selectedUser: string | null
  section: AdminSection
  customerUsers: CustomerUser[]
  onUserChange: (user: string | null) => void
  onSectionChange: (section: AdminSection) => void
}

export function AdminHeader({
  isAdmin,
  adminStatus,
  selectedUser,
  section,
  customerUsers,
  onUserChange,
  onSectionChange
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col lg:items-start md:flex-row md:items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAdmin ? 'Admin' : 'Your Data'}
        </h1>
        {isAdmin && (
          <div className="text-xs text-neutral-500 mt-1">
            {adminStatus.verified 
              ? '🔒 Server-verified admin' 
              : '⚠️ Client-side admin (less secure)'}
            {adminStatus.error && ` • ${adminStatus.error}`}
          </div>
        )}
      </div>
      
      <div className="flex flex-col lg:items-start md:flex-row md:items-center gap-2">
        {isAdmin && (
          <>
            {/* User Filter Dropdown */}
            <select 
              value={selectedUser || ''} 
              onChange={(e) => onUserChange(e.target.value || null)} 
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white"
              aria-label="Filter by user"
            >
              <option value="">All users</option>
              {customerUsers.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </option>
              ))}
            </select>
            
            {/* Section Selector Dropdown */}
            <select 
              value={section} 
              onChange={(e) => onSectionChange(e.target.value as AdminSection)} 
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white"
              aria-label="Select admin section"
            >
              <option value="providers">Providers</option>
              <option value="restaurant-tagging">Category Tagging</option>
              <option value="contact-leads">Contact / Get Featured</option>
              <option value="customer-users">Customer Users</option>
              <option value="business-accounts">Business Accounts</option>
              <option value="users">Users</option>
              <option value="resident-verification">Resident Verification</option>
              <option value="business-applications">Business Applications</option>
              <option value="owner-change-requests">Owner Change Requests</option>
              <option value="job-posts">Job Posts</option>
              <option value="funnel-responses">Funnel Responses</option>
              <option value="bookings">Bookings</option>
              <option value="booking-events">Calendar Bookings</option>
              <option value="blog">Blog Manager</option>
              <option value="calendar-events">Calendar Events</option>
              <option value="flagged-events">Flagged Events</option>
            </select>
          </>
        )}
        
        {/* Refresh Button */}
        <button 
          onClick={() => window.location.reload()} 
          className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200 text-sm transition-colors"
          aria-label="Refresh page"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

