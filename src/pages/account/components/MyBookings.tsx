import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { generateSlug } from '../../../utils/helpers'
import type { Booking } from '../types'
import { cancelBooking } from '../dataLoader'

interface MyBookingsProps {
  bookings: Booking[]
  loading: boolean
  onBookingCancelled: (bookingId: string) => void
  onMessage: (message: string) => void
}

export function MyBookings({ bookings, loading, onBookingCancelled, onMessage }: MyBookingsProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showPastBookings, setShowPastBookings] = useState(false)

  async function handleCancel(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    
    setCancellingId(bookingId)
    const result = await cancelBooking(bookingId)
    
    if (result.success) {
      onBookingCancelled(bookingId)
      onMessage('Booking cancelled successfully')
    } else {
      onMessage(result.error || 'Failed to cancel booking')
    }
    
    setCancellingId(null)
  }

  // Filter bookings: active vs archived
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const activeBookings = bookings.filter(booking => {
    const bookingDate = (booking as any).booking_date ? new Date((booking as any).booking_date) : null
    const isCancelled = booking.status === 'cancelled'
    
    // If no booking date, consider it active if not cancelled
    if (!bookingDate) {
      return !isCancelled
    }
    
    // Active: not cancelled AND booking date is within 3 days or in the future
    const isWithinThreeDaysOrFuture = bookingDate >= threeDaysAgo
    return !isCancelled && isWithinThreeDaysOrFuture
  })

  const archivedBookings = bookings.filter(booking => {
    const bookingDate = (booking as any).booking_date ? new Date((booking as any).booking_date) : null
    const isCancelled = booking.status === 'cancelled'
    const isPastThreeDays = bookingDate && bookingDate < threeDaysAgo
    
    // Archived: cancelled OR more than 3 days old
    return isCancelled || isPastThreeDays
  })

  const displayedBookings = showPastBookings 
    ? [...activeBookings, ...archivedBookings]
    : activeBookings

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Bookings</h2>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600">No bookings yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">My Bookings</h2>
        {archivedBookings.length > 0 && (
          <button
            onClick={() => setShowPastBookings(!showPastBookings)}
            className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            {showPastBookings ? 'Hide Past Bookings' : `Show Past Bookings (${archivedBookings.length})`}
          </button>
        )}
      </div>
      
      {displayedBookings.length === 0 && !showPastBookings && archivedBookings.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600 mb-4">No active bookings</p>
          <button
            onClick={() => setShowPastBookings(true)}
            className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Show Past Bookings ({archivedBookings.length})
          </button>
        </div>
      ) : (
        <div className="space-y-4">
        {displayedBookings.map((booking) => {
          const bookingDate = (booking as any).booking_date ? new Date((booking as any).booking_date) : null
          const isCancelled = booking.status === 'cancelled'
          const isPastThreeDays = bookingDate && bookingDate < threeDaysAgo
          const isArchived = isCancelled || isPastThreeDays
          
          return (
          <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Business name - clickable if provider_id exists */}
                {booking.provider_id && booking.provider_name ? (
                  <Link 
                    to={`/provider/${encodeURIComponent(generateSlug(booking.provider_name))}`}
                    className="font-semibold text-lg text-blue-600 hover:text-blue-700 hover:underline mb-2 inline-block"
                  >
                    {booking.provider_name}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                    {booking.provider_name || 'Unknown Business'}
                  </h3>
                )}
                
                {(booking as any).booking_date && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>For: {new Date((booking as any).booking_date).toLocaleString()}</span>
                  </p>
                )}
                {!(booking as any).booking_date && booking.created_at && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>For: {new Date(booking.created_at).toLocaleString()}</span>
                  </p>
                )}
                {booking.provider_address && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{booking.provider_address}</span>
                  </p>
                )}
                {booking.booking_notes && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>{booking.booking_notes}</span>
                  </p>
                )}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {booking.status || 'pending'}
                </span>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {!isArchived && booking.status !== 'cancelled' && (
                  <>
                    <button
                      onClick={() => {
                        alert('To request a change to your booking date/time, please contact the business directly or email us at hello@bonitaforward.com')
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      Request Change
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </>
                )}
                {isArchived && (
                  <span className="px-3 py-2 text-xs text-neutral-500 text-center">Archived</span>
                )}
              </div>
            </div>
          </div>
          )
        })}
        </div>
      )}
    </div>
  )
}

