import React, { useState } from 'react'
import type { CustomerUser } from '../../../utils/adminHelpers'

interface CustomerUsersSectionProps {
  customerUsers: CustomerUser[]
  funnels: any[]
  bookings: any[]
  bookingEvents: any[]
  profiles: any[]
  businessEmails: Set<string>
  deletingCustomerEmail: string | null
  onSetDeletingCustomerEmail: (email: string | null) => void
  onDeleteCustomerUser: (userId: string) => Promise<void>
  deleteCustomerUserByEmail: (email: string) => Promise<void>
}

export const CustomerUsersSection: React.FC<CustomerUsersSectionProps> = ({
  customerUsers,
  funnels,
  bookings,
  bookingEvents,
  profiles,
  businessEmails,
  deletingCustomerEmail,
  onSetDeletingCustomerEmail,
  deleteCustomerUserByEmail
}) => {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  const toggleExpanded = (email: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(email)) {
        newSet.delete(email)
      } else {
        newSet.add(email)
      }
      return newSet
    })
  }

  const getUserDetails = (user: CustomerUser) => {
    const normalizedEmail = user.email.toLowerCase()
    
    // Find profile if available
    const profile = profiles.find(p => 
      p.email && p.email.toLowerCase() === normalizedEmail
    )
    
    // Count related data
    const funnelCount = funnels.filter(f => 
      f.user_email && f.user_email.toLowerCase() === normalizedEmail
    ).length
    
    const bookingCount = bookings.filter(b => 
      b.user_email && b.user_email.toLowerCase() === normalizedEmail
    ).length
    
    const bookingEventCount = bookingEvents.filter(be => 
      be.customer_email && be.customer_email.toLowerCase() === normalizedEmail
    ).length
    
    return {
      profile,
      funnelCount,
      bookingCount,
      bookingEventCount
    }
  }
  const getAccountTypeBadge = (accountType: string, role: string | null) => {
    if (accountType === 'business' || role === 'business') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          Business Account
        </span>
      )
    } else if (accountType === 'customer' || role === 'community') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          Customer Account
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
          Unknown
        </span>
      )
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="font-medium">Customer Users</div>
        <div className="text-sm text-neutral-500">
          {customerUsers.length} users found
        </div>
      </div>
      
      {/* Debug information */}
      <div className="mb-4 p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600">
        <div><strong>Data Sources:</strong></div>
        <div>• Funnel responses: {funnels.length} entries</div>
        <div>• Bookings: {bookings.length} entries</div>
        <div>• Booking events: {bookingEvents.length} entries</div>
        <div>• Profiles: {profiles.length} entries</div>
        <div>• Business emails excluded: {businessEmails.size} emails</div>
      </div>
      
      <div className="space-y-3">
        {customerUsers.length === 0 && (
          <div className="text-neutral-500 text-center py-8">
            No customer users found. Users are identified from funnel responses, bookings, booking events, and profiles (excluding business owners).
          </div>
        )}
        {customerUsers.map((user) => {
          // Handle case where user might be a string (legacy format)
          const userObj: CustomerUser = typeof user === 'string' 
            ? {
                email: user,
                name: null,
                role: null,
                accountType: 'unknown',
                dataSources: [],
                profileId: null
              }
            : user
          
          const isExpanded = expandedUsers.has(userObj.email)
          const details = getUserDetails(userObj)
          const { profile, funnelCount, bookingCount, bookingEventCount } = details
          
          return (
            <div key={userObj.email} className="border border-neutral-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-medium text-neutral-900">
                      {userObj.name || 'No name provided'}
                    </div>
                    {getAccountTypeBadge(userObj.accountType, userObj.role)}
                  </div>
                  <div className="text-sm text-neutral-600 mb-2">
                    <div><strong>Email:</strong> {userObj.email}</div>
                    {userObj.role && (
                      <div><strong>Role:</strong> {userObj.role}</div>
                    )}
                    {userObj.profileId && (
                      <div><strong>Profile ID:</strong> {userObj.profileId}</div>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-2">
                    <div><strong>Found in:</strong> {userObj.dataSources?.join(', ') || 'unknown'}</div>
                    {userObj.role === 'business' && (
                      <div className="mt-1 text-orange-600 font-medium">
                        ⚠️ Warning: This user has role='business' but appears in customer users list. Check their profile.
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {/* See More / Back button */}
                  {isExpanded ? (
                    <button 
                      onClick={() => toggleExpanded(userObj.email)} 
                      className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs hover:bg-red-100"
                    >
                      Back
                    </button>
                  ) : (
                    <button 
                      onClick={() => toggleExpanded(userObj.email)} 
                      className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 border border-blue-200 text-xs hover:bg-blue-100"
                    >
                      See More
                    </button>
                  )}
                  {deletingCustomerEmail === userObj.email ? (
                    <div className="flex flex-col items-end gap-2">
                      <button 
                        onClick={() => deleteCustomerUserByEmail(userObj.email)} 
                        className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                      >
                        Confirm Delete
                      </button>
                      <button 
                        onClick={() => onSetDeletingCustomerEmail(null)} 
                        className="text-xs underline text-neutral-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onSetDeletingCustomerEmail(userObj.email)} 
                      className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs hover:bg-neutral-200"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
                  <div className="text-sm font-medium text-neutral-900 mb-3">User Details</div>
                  
                  {/* Profile Information */}
                  {profile ? (
                    <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-medium text-neutral-700">Profile Information</div>
                      <div className="text-sm text-neutral-600 space-y-1">
                        <div><strong>Profile ID:</strong> {profile.id}</div>
                        {profile.name && (
                          <div><strong>Name:</strong> {profile.name}</div>
                        )}
                        {profile.email && (
                          <div><strong>Email:</strong> {profile.email}</div>
                        )}
                        {profile.role && (
                          <div><strong>Role:</strong> {profile.role}</div>
                        )}
                        {(profile as any).created_at && (
                          <div><strong>Created:</strong> {new Date((profile as any).created_at).toLocaleString()}</div>
                        )}
                        {/* Resident Verification */}
                        {(profile as any).is_bonita_resident && (
                          <div className="mt-2 pt-2 border-t border-neutral-200">
                            <div className="text-xs font-medium text-neutral-700 mb-1">Resident Verification</div>
                            <div><strong>Status:</strong> {(profile as any).is_bonita_resident ? 'Yes' : 'No'}</div>
                            {(profile as any).resident_verification_method && (
                              <div><strong>Method:</strong> {(profile as any).resident_verification_method}</div>
                            )}
                            {(profile as any).resident_zip_code && (
                              <div><strong>ZIP Code:</strong> {(profile as any).resident_zip_code}</div>
                            )}
                            {(profile as any).resident_verified_at && (
                              <div><strong>Verified At:</strong> {new Date((profile as any).resident_verified_at).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
                      ⚠️ No profile found - User only exists in funnels/bookings/booking_events
                    </div>
                  )}
                  
                  {/* Activity Summary */}
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium text-neutral-700">Activity Summary</div>
                    <div className="text-sm text-neutral-600 grid grid-cols-3 gap-2">
                      <div>
                        <div className="font-medium">{funnelCount}</div>
                        <div className="text-xs text-neutral-500">Funnel Responses</div>
                      </div>
                      <div>
                        <div className="font-medium">{bookingCount}</div>
                        <div className="text-xs text-neutral-500">Bookings</div>
                      </div>
                      <div>
                        <div className="font-medium">{bookingEventCount}</div>
                        <div className="text-xs text-neutral-500">Booking Events</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Type Info */}
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium text-neutral-700">Account Information</div>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <div><strong>Account Type:</strong> {userObj.accountType}</div>
                      <div><strong>Data Sources:</strong> {userObj.dataSources?.join(', ') || 'unknown'}</div>
                      {userObj.role === 'business' && (
                        <div className="mt-2 text-orange-600 font-medium">
                          ⚠️ This user selected business account but appears in customer users list.
                          This may happen if:
                          <ul className="list-disc list-inside mt-1 text-xs">
                            <li>They appeared in funnels/bookings before their profile role was set</li>
                            <li>Their profile role wasn't saved correctly during signup</li>
                            <li>Their email isn't in the business emails exclusion list</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

