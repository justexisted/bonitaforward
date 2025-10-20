import React from 'react'

interface CustomerUsersSectionProps {
  customerUsers: string[]
  funnels: any[]
  bookings: any[]
  bookingEvents: any[]
  profiles: any[]
  businessEmails: Set<string>
  deletingCustomerEmail: string | null
  onSetDeletingCustomerEmail: (email: string | null) => void
  onDeleteCustomerUser: (email: string) => Promise<void>
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
  onDeleteCustomerUser
}) => {
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
      
      <ul className="mt-2 text-sm">
        {customerUsers.length === 0 && (
          <li className="text-neutral-500">
            No customer users found. Users are identified from funnel responses, bookings, booking events, and profiles (excluding business owners).
          </li>
        )}
        {customerUsers.map((u) => (
          <li key={u} className="py-1 border-b border-neutral-100 last:border-0 flex items-center justify-between">
            <span>{u}</span>
            {deletingCustomerEmail === u ? (
              <span className="flex items-center gap-2">
                <button 
                  onClick={() => onDeleteCustomerUser(u)} 
                  className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => onSetDeletingCustomerEmail(null)} 
                  className="text-xs underline"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button 
                onClick={() => onSetDeletingCustomerEmail(u)} 
                className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

