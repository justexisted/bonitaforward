/**
 * USER ACTIVITY TAB COMPONENT
 * 
 * Displays customer interactions with business listings:
 * - Profile views
 * - Discount copies
 * - Booking requests
 * - Questions asked
 * - Booking updates
 * 
 * Features:
 * - Empty state when no activity exists
 * - Activity type icons and colors
 * - Timestamp formatting
 * - Activity details display
 */

import { type UserActivity } from '../types'

interface UserActivityTabProps {
  userActivity: UserActivity[]
}

export function UserActivityTab({ userActivity }: UserActivityTabProps) {
  // Get activity icon component
  const getActivityIcon = (activity: UserActivity) => {
    if (activity.activity_type === 'profile_view') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    }
    if (activity.activity_type === 'discount_copy') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    }
    if (activity.activity_type === 'booking_request') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
    if (activity.activity_type === 'question_asked') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (activity.type === 'booking_received') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (activity.type === 'booking_updated') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
    return null
  }

  // Get activity icon container classes
  const getIconContainerClasses = (activity: UserActivity): string => {
    if (activity.activity_type === 'profile_view') return 'bg-blue-100 text-blue-600'
    if (activity.activity_type === 'discount_copy') return 'bg-green-100 text-green-600'
    if (activity.activity_type === 'booking_request') return 'bg-purple-100 text-purple-600'
    if (activity.type === 'booking_received') return 'bg-emerald-100 text-emerald-600'
    if (activity.type === 'booking_updated') return 'bg-amber-100 text-amber-600'
    return 'bg-orange-100 text-orange-600'
  }

  // Get activity description
  const getActivityDescription = (activity: UserActivity) => {
    if (activity.type === 'booking_received') {
      return (
        <div>
          <span className="font-medium">New Booking Received</span>
          <div className="text-xs text-neutral-500 mt-1">
            {activity.message || `Booking from ${activity.user_name || activity.user_email || 'Customer'}`}
          </div>
        </div>
      )
    }
    if (activity.type === 'booking_updated') {
      return (
        <div>
          <span className="font-medium">Booking Details Updated</span>
          <div className="text-xs text-neutral-500 mt-1">
            {activity.message || 'Booking details have been updated.'}
          </div>
        </div>
      )
    }
    return (
      <>
        <span className="font-medium">
          {activity.activity_type === 'profile_view' && 'Viewed profile'}
          {activity.activity_type === 'discount_copy' && 'Copied discount code'}
          {activity.activity_type === 'booking_request' && 'Requested booking'}
          {activity.activity_type === 'question_asked' && 'Asked a question'}
        </span>
        {' for '}
        <span className="font-medium text-blue-600">{activity.provider_name}</span>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-100 p-2 sm:p-3 md:p-4 lg:p-6 bg-white">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Customer Interactions</h3>
        <p className="text-sm text-neutral-600 mb-6">
          Track how customers interact with your business listings - profile views, discount copies, booking requests, and questions.
        </p>
        
        {userActivity.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-neutral-900 mb-2">No Activity Yet</h4>
            <p className="text-neutral-600">
              Customer interactions will appear here once people start viewing your listings and engaging with your business.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconContainerClasses(activity)}`}>
                    {getActivityIcon(activity)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-neutral-900">
                      {activity.user_name || activity.user_email || 'Anonymous User'}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="text-sm text-neutral-600 mb-1">
                    {getActivityDescription(activity)}
                  </div>
                  
                  {activity.activity_details && activity.type !== 'booking_received' && activity.type !== 'booking_updated' && (
                    <div className="text-sm text-neutral-500 bg-neutral-50 p-2 rounded border-l-2 border-neutral-200">
                      {activity.activity_details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

