import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
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
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Bookings</h2>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Business name - clickable if provider_id exists */}
                {booking.provider_id ? (
                  <Link 
                    to={`/providers/${booking.provider_id}`}
                    className="font-semibold text-lg text-blue-600 hover:text-blue-700 hover:underline mb-2 inline-block"
                  >
                    {booking.provider_name || 'Unknown Business'}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                    {booking.provider_name || 'Unknown Business'}
                  </h3>
                )}
                
                {booking.created_at && (
                  <p className="text-sm text-neutral-600 mb-1">
                    📅 Booked: {new Date(booking.created_at).toLocaleString()}
                  </p>
                )}
                {booking.provider_address && (
                  <p className="text-sm text-neutral-600 mb-1">📍 {booking.provider_address}</p>
                )}
                {booking.booking_notes && (
                  <p className="text-sm text-neutral-600 mb-1">📝 {booking.booking_notes}</p>
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
                {booking.status !== 'cancelled' && (
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

