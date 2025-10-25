import React from 'react'
import { supabase } from '../../../lib/supabase'

interface BookingEvent {
  id: string
  provider_id: string
  customer_email: string
  customer_name: string | null
  booking_date: string
  booking_duration_minutes: number | null
  booking_notes: string | null
  status: string | null
  created_at: string
  providers?: {
    name: string
    category_key: string
    address: string | null
    phone: string | null
  }
}

interface BookingEventsSectionProps {
  bookingEvents: BookingEvent[]
  loading: boolean
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
  onBookingEventsUpdate: (bookingEvents: BookingEvent[]) => void
  onLoadBookingEvents: () => Promise<void>
}

export const BookingEventsSection: React.FC<BookingEventsSectionProps> = ({
  bookingEvents,
  loading,
  onMessage,
  onError,
  onBookingEventsUpdate,
  onLoadBookingEvents
}) => {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deletingBooking, setDeletingBooking] = React.useState<BookingEvent | null>(null)

  const handleToggleStatus = async (booking: BookingEvent) => {
    const newStatus = booking.status === 'confirmed' ? 'cancelled' : 'confirmed'
    try {
      const { error } = await supabase
        .from('booking_events')
        .update({ status: newStatus })
        .eq('id', booking.id)
      
      if (error) {
        onError(error.message)
      } else {
        onBookingEventsUpdate(
          bookingEvents.map(b => b.id === booking.id ? { ...b, status: newStatus } : b)
        )
        onMessage(`Booking ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'}`)
      }
    } catch (err: any) {
      onError(err.message)
    }
  }

  const handleDeleteBooking = async (booking: BookingEvent) => {
    setDeletingBooking(booking)
    setShowDeleteModal(true)
  }

  const confirmDeleteBooking = async () => {
    if (!deletingBooking) return

    try {
      const { error } = await supabase
        .from('booking_events')
        .delete()
        .eq('id', deletingBooking.id)
      
      if (error) {
        onError(error.message)
        setShowDeleteModal(false)
        setDeletingBooking(null)
      } else {
        onBookingEventsUpdate(bookingEvents.filter(b => b.id !== deletingBooking.id))
        onMessage('Booking deleted')
        setShowDeleteModal(false)
        setDeletingBooking(null)
      }
    } catch (err: any) {
      onError(err.message)
      setShowDeleteModal(false)
      setDeletingBooking(null)
    }
  }

  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="flex items-center justify-between mb-4">
        <div className="font-medium">Calendar Bookings (All Users)</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {bookingEvents.length} total bookings
          </span>
          <button
            onClick={onLoadBookingEvents}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {bookingEvents.length === 0 ? (
        <div className="text-neutral-500 text-center py-8">
          No calendar bookings found.
        </div>
      ) : (
        <div className="space-y-4">
          {bookingEvents.map((booking) => (
            <div key={booking.id} className="rounded-xl border border-neutral-200 p-4 bg-white shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Customer Information */}
                <div className="space-y-2">
                  <h4 className="font-medium text-neutral-900">Customer</h4>
                  <div className="text-sm text-neutral-600">
                    <div><strong>Name:</strong> {booking.customer_name || 'Not provided'}</div>
                    <div><strong>Email:</strong> {booking.customer_email}</div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-neutral-900">Booking Details</h4>
                  <div className="text-sm text-neutral-600">
                    <div><strong>Date:</strong> {new Date(booking.booking_date).toLocaleString()}</div>
                    <div><strong>Duration:</strong> {booking.booking_duration_minutes ? `${booking.booking_duration_minutes} minutes` : 'Not specified'}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                        {booking.status || 'Unknown'}
                      </span>
                    </div>
                    <div><strong>Created:</strong> {new Date(booking.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* Provider Information */}
                <div className="space-y-2">
                  <h4 className="font-medium text-neutral-900">Business</h4>
                  <div className="text-sm text-neutral-600">
                    <div><strong>Name:</strong> {booking.providers?.name || 'Unknown Business'}</div>
                    <div><strong>Category:</strong> {booking.providers?.category_key || 'Unknown'}</div>
                    <div><strong>Phone:</strong> {booking.providers?.phone || 'Not provided'}</div>
                    <div><strong>Address:</strong> {booking.providers?.address || 'Not provided'}</div>
                  </div>
                </div>
              </div>

              {/* Booking Notes */}
              {booking.booking_notes && (
                <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h5 className="font-medium text-neutral-900 mb-2">Booking Notes:</h5>
                  <p className="text-sm text-neutral-600">{booking.booking_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(booking)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    booking.status === 'confirmed' 
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  }`}
                >
                  {booking.status === 'confirmed' ? 'Cancel Booking' : 'Confirm Booking'}
                </button>
                
                <button
                  onClick={() => handleDeleteBooking(booking)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                >
                  Delete Booking
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Booking</h3>
            
            <p className="text-sm text-neutral-600 mb-2">
              Are you sure you want to delete this booking?
            </p>
            <div className="bg-neutral-50 p-3 rounded-lg mb-6 text-sm">
              <p className="font-medium">{deletingBooking.customer_name || 'Unknown'}</p>
              <p className="text-neutral-600">{deletingBooking.customer_email}</p>
              <p className="text-neutral-600">Date: {new Date(deletingBooking.booking_date).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-neutral-600 mb-6">This action cannot be undone.</p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteBooking}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Booking
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingBooking(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

