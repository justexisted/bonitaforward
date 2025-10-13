import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Link } from 'react-router-dom'
import { type CalendarEvent } from './Calendar'

export default function AccountPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingApps, setPendingApps] = useState<{ id: string; business_name: string | null; created_at: string }[]>([])
  const [role, setRole] = useState<string>('')
  const [bookings, setBookings] = useState<Array<{ 
    id: string; 
    provider_id?: string | null; 
    provider_name?: string | null; 
    time?: string | null; 
    status?: string | null; 
    created_at?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    booking_duration_minutes?: number | null;
    booking_notes?: string | null;
    provider_category?: string | null;
    provider_address?: string | null;
    provider_phone?: string | null;
  }>>([])
  const [savedBusinesses, setSavedBusinesses] = useState<Array<{ 
    id?: string
    provider_id: string
    created_at?: string | null
    provider_name?: string | null
    provider_category?: string | null
    provider_address?: string | null
    provider_phone?: string | null
    provider_tags?: string[] | null
  }>>([])
  const [discounts, setDiscounts] = useState<Array<{ id: string; provider_id?: string | null; code?: string | null; created_at?: string | null; provider_name?: string | null }>>([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>([])
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [bookingsExpanded, setBookingsExpanded] = useState<boolean>(true) // Default to expanded

  /**
   * ACCOUNT DATA INITIALIZATION
   * 
   * This effect runs when auth state changes (email, name, userId).
   * It loads user-specific data including role and business applications.
   * 
   * CRITICAL: This must run whenever auth.userId changes to ensure
   * data is reloaded after refresh/sign-in.
   */
  useEffect(() => {
    console.log('[Account] Auth state changed:', { email: auth.email, name: auth.name, userId: auth.userId })
    
    setEmail(auth.email || '')
    setName(auth.name || '')
    
    async function loadUserData() {
      if (!auth.userId) { 
        setPendingApps([])
        setRole('')
        return 
      }
      
      try {
        console.log('[Account] Loading user data for userId:', auth.userId)
        
        // Load pending business applications for this email
        if (auth.email) {
          const { data: apps } = await supabase
            .from('business_applications')
            .select('id,business_name,created_at,email')
            .eq('email', auth.email)
            .order('created_at', { ascending: false })
            .limit(10)
          setPendingApps(((apps as any[]) || []).map((r) => ({ id: r.id, business_name: r.business_name, created_at: r.created_at })))
          console.log('[Account] Loaded applications:', apps?.length || 0)
        } else {
          setPendingApps([])
        }
        
        // Load profile role for account type display
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.userId).maybeSingle()
        const userRole = String((prof as any)?.role || '')
        setRole(userRole)
        console.log('[Account] Loaded role:', userRole)
        
      } catch (error) {
        console.error('[Account] Error loading user data:', error)
        setPendingApps([])
        setRole('')
      }
    }
    
    void loadUserData()
  }, [auth.email, auth.name, auth.userId]) // CRITICAL: Added auth.userId dependency

  /**
   * COMMUNITY DATA LOADING
   * 
   * This effect loads community-specific data (bookings, saved businesses, discounts).
   * It runs whenever auth.userId changes to ensure data is refreshed after
   * page refresh or sign-in/sign-out.
   * 
   * CRITICAL FIX: Added auth.userId as dependency to ensure data reloads
   * when user auth state changes (was missing before, causing data loss on refresh).
   */
  useEffect(() => {
    async function loadCommunityData() {
      if (!auth.userId) { 
        console.log('[Account] No userId, clearing community data')
        setBookings([])
        setSavedBusinesses([])
        setDiscounts([])
        setCommunityLoading(false)
        return 
      }
      
      setCommunityLoading(true)
      console.log('[Account] Loading community data for user', auth.userId)
      try {
        // My Events
        try {
          const { data: eventsData, error: eventsError } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('created_by_user_id', auth.userId)
            .order('date', { ascending: true })
          
          if (eventsError) {
            console.warn('[Account] Error loading events:', eventsError)
            setMyEvents([])
          } else {
            setMyEvents(eventsData || [])
            console.log('[Account] Loaded events:', eventsData?.length || 0)
          }
        } catch (err) {
          console.error('[Account] Error loading events:', err)
          setMyEvents([])
        }

        // BOOKING EVENTS LOADING
        // Load user's booking history from the booking_events table with full provider details
        // This includes appointments made through the Google Calendar booking system
        console.log('[Account] Loading booking events for user:', auth.email)
        try {
          const { data, error } = await supabase
            .from('booking_events')
            .select(`
              id,
              provider_id,
              customer_email,
              customer_name,
              booking_date,
              booking_duration_minutes,
              booking_notes,
              status,
              created_at,
              providers!inner(name, category_key, address, phone)
            `)
            .eq('customer_email', auth.email)
            .order('booking_date', { ascending: false })
            .limit(50)
          
          console.log('[Account] Booking events query result:', { data: data?.length || 0, error })
          
          if (error) {
            console.error('[Account] booking_events select error:', error)
            setBookings([])
          } else {
            const rows = (data as any[]) || []
            console.log('[Account] Processing booking events:', rows.length, 'bookings found')
            
            const processedBookings = rows.map((r) => ({
              id: r.id,
              provider_id: r.provider_id ?? null,
              provider_name: r.providers?.name ?? null,
              time: r.booking_date ?? null,
              status: r.status ?? null,
              created_at: r.created_at ?? null,
              customer_name: r.customer_name ?? null,
              customer_email: r.customer_email ?? null,
              booking_duration_minutes: r.booking_duration_minutes ?? null,
              booking_notes: r.booking_notes ?? null,
              provider_category: r.providers?.category_key ?? null,
              provider_address: r.providers?.address ?? null,
              provider_phone: r.providers?.phone ?? null,
            }))
            
            console.log('[Account] Setting bookings state:', processedBookings.length, 'processed bookings')
            setBookings(processedBookings)
          }
        } catch (e) {
          console.error('[Account] booking_events load failed:', e)
          setBookings([])
        }

        // Saved Businesses - Load with provider details
        try {
          const { data, error } = await supabase
            .from('saved_providers')
            .select('id, provider_id, created_at, providers(id, name, category_key, address, phone, tags)')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) {
            console.warn('[Account] saved_providers select error', error)
            setSavedBusinesses([])
          } else {
            const rows = (data as any[]) || []
            setSavedBusinesses(rows.map((r: any) => ({
              id: r.id,
              provider_id: r.provider_id,
              provider_name: r.providers?.name ?? 'Business',
              provider_category: r.providers?.category_key ?? null,
              provider_address: r.providers?.address ?? null,
              provider_phone: r.providers?.phone ?? null,
              provider_tags: r.providers?.tags ?? null,
              created_at: r.created_at ?? null,
            })))
          }
        } catch (e) {
          console.warn('[Account] saved_providers load failed', e)
          setSavedBusinesses([])
        }

        // Discounts Redeemed
        try {
          const { data, error } = await supabase
            .from('coupon_redemptions')
            .select('*')
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) {
            console.warn('[Account] coupon_redemptions select error', error)
            setDiscounts([])
          } else {
            const rows = (data as any[]) || []
            setDiscounts(rows.map((r) => ({
              id: r.id,
              provider_id: r.provider_id ?? null,
              provider_name: (r as any).provider_name ?? null,
              code: (r as any).code ?? null,
              created_at: r.created_at ?? null,
            })))
          }
        } catch (e) {
          console.warn('[Account] coupon_redemptions load failed', e)
          setDiscounts([])
        }
      } finally {
        setCommunityLoading(false)
      }
    }
    
    /**
     * CONDITIONAL DATA LOADING
     * 
     * Load community data for all users (not just community role).
     * This ensures bookings and saved businesses are shown for all account types.
     * 
     * CRITICAL FIX: Removed role-based filtering that was preventing
     * data from loading for business accounts.
     */
    void loadCommunityData()
  }, [auth.userId]) // CRITICAL FIX: Simplified dependencies and removed role check

  async function saveProfile() {
    setBusy(true)
    setMessage(null)
    try {
      if (!auth.userId) return
      // Update email (triggers confirmation email from Supabase)
      if (email && email !== auth.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) {
          setMessage(error.message)
          setBusy(false)
          return
        }
      }
      // Update display name in user metadata
      if (name && name !== auth.name) {
        const { error } = await supabase.auth.updateUser({ data: { name } })
        if (error) {
          setMessage(error.message)
          setBusy(false)
          return
        }
      }
      setMessage('Saved. You may need to verify email if it was changed.')
    } finally {
      setBusy(false)
    }
  }


  async function updatePassword() {
    const pw = prompt('Enter a new password (min 8 characters):') || ''
    if (!pw || pw.length < 8) return
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) setMessage(error.message)
      else setMessage('Password updated.')
    } finally {
      setBusy(false)
    }
  }

  // Remove saved business
  const handleRemoveSavedBusiness = async (savedId: string | undefined, providerName: string | null) => {
    if (!confirm(`Remove "${providerName || 'this business'}" from saved list?`)) return

    try {
      const { error } = await supabase
        .from('saved_providers')
        .delete()
        .eq('id', savedId || '')
        .eq('user_id', auth.userId || '')

      if (error) throw error

      // Update local state
      setSavedBusinesses(prev => prev.filter(b => b.id !== savedId))
      setMessage('Business removed from saved list')
    } catch (error: any) {
      console.error('Error removing saved business:', error)
      alert('Failed to remove business: ' + error.message)
    }
  }

  // Event management functions
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id)
    setEditingEvent({ ...event })
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setEditingEvent(null)
  }

  const handleSaveEvent = async () => {
    if (!editingEvent || !editingEventId) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          time: editingEvent.time,
          location: editingEvent.location,
          address: editingEvent.address,
          category: editingEvent.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEventId)

      if (error) throw error

      // Update local state
      setMyEvents(prev => prev.map(e => e.id === editingEventId ? editingEvent : e))
      setEditingEventId(null)
      setEditingEvent(null)
      alert('Event updated successfully!')
    } catch (error: any) {
      console.error('Error updating event:', error)
      alert('Failed to update event: ' + error.message)
    }
  }

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Delete event "${eventTitle}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      // Update local state
      setMyEvents(prev => prev.filter(e => e.id !== eventId))
      alert('Event deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event: ' + error.message)
    }
  }

  /**
   * MANAGE BOOKING FUNCTION
   * 
   * Handles various booking operations (cancel, delete, edit, confirm) using the Netlify function
   * for proper authorization and data validation. Supports both customer and business owner actions.
   * 
   * @param action - The action to perform ('cancel', 'delete', 'edit', 'confirm')
   * @param bookingId - The UUID of the booking to modify
   * @param updates - Optional updates for edit action
   */
  const manageBooking = async (action: 'cancel' | 'delete' | 'edit' | 'confirm', bookingId: string, updates?: any) => {
    // Show confirmation dialog for destructive actions
    if (action === 'cancel' && !confirm('Are you sure you want to cancel this booking?')) return
    if (action === 'delete' && !confirm('Are you sure you want to permanently delete this booking?')) return

    // Set loading state for this specific booking
    setCancellingBookingId(bookingId)
    
    try {
      // Call the Netlify function for booking management
      const response = await fetch('/.netlify/functions/manage-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          bookingId,
          updates,
          userEmail: auth.email
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to manage booking')
      }

      // Handle different actions
      switch (action) {
        case 'cancel':
          setBookings(bookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'cancelled' }
              : booking
          ))
          setMessage('Booking cancelled successfully')
          break

        case 'delete':
          setBookings(bookings.filter(booking => booking.id !== bookingId))
          setMessage('Booking deleted successfully')
          break

        case 'confirm':
          setBookings(bookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'confirmed' }
              : booking
          ))
          setMessage('Booking confirmed successfully')
          break

        case 'edit':
          if (updates) {
            setBookings(bookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, ...updates }
                : booking
            ))
            setMessage('Booking updated successfully')
          }
          break
      }
    } catch (error) {
      console.error('Error managing booking:', error)
      setMessage(`Failed to ${action} booking`)
    } finally {
      // Clear loading state regardless of success or failure
      setCancellingBookingId(null)
    }
  }

  // State for edit booking modal
  const [editingBooking, setEditingBooking] = useState<any>(null)
  const [editBookingDate, setEditBookingDate] = useState('')
  const [editBookingTime, setEditBookingTime] = useState('')
  const [editBookingDuration, setEditBookingDuration] = useState('')
  const [editBookingNotes, setEditBookingNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)

  /**
   * EDIT BOOKING FUNCTION
   * 
   * Opens a modal to edit booking details. Focuses on date, time, duration, and notes.
   * Allows business owners to send notifications to customers about changes.
   * 
   * @param booking - The booking object to edit
   */
  const editBooking = (booking: any) => {
    setEditingBooking(booking)
    
    // Pre-populate form with current booking data
    if (booking.time) {
      const date = new Date(booking.time)
      setEditBookingDate(date.toISOString().split('T')[0])
      setEditBookingTime(date.toTimeString().slice(0, 5))
    }
    setEditBookingDuration(booking.booking_duration_minutes?.toString() || '60')
    setEditBookingNotes(booking.booking_notes || '')
    setSendNotification(true)
  }

  /**
   * SAVE EDITED BOOKING FUNCTION
   * 
   * Saves the edited booking details and optionally sends notification to customer.
   */
  const saveEditedBooking = async () => {
    if (!editingBooking) return

    try {
      // Combine date and time into a single datetime
      const bookingDateTime = new Date(`${editBookingDate}T${editBookingTime}`).toISOString()
      
      const updates: any = {
        booking_date: bookingDateTime,
        booking_duration_minutes: parseInt(editBookingDuration) || 60,
        booking_notes: editBookingNotes
      }

      // Include party size in notes if it's a restaurant booking
      if (editingBooking.provider_category === 'restaurants-cafes' && editBookingNotes) {
        // Extract party size from notes or add it
        const partySizeMatch = editBookingNotes.match(/Party size: (\d+)/)
        if (!partySizeMatch) {
          updates.booking_notes = `${editBookingNotes}\nParty size: 1`
        }
      }

      // Call the manage booking function with notification option
      await manageBooking('edit', editingBooking.id, {
        ...updates,
        sendNotification
      })

      // Close the modal
      setEditingBooking(null)
    } catch (error) {
      console.error('Error saving booking edit:', error)
    }
  }

  /**
   * CANCEL EDIT BOOKING FUNCTION
   * 
   * Closes the edit booking modal without saving changes.
   */
  const cancelEditBooking = () => {
    setEditingBooking(null)
    setEditBookingDate('')
    setEditBookingTime('')
    setEditBookingDuration('')
    setEditBookingNotes('')
    setSendNotification(true)
  }

  /**
   * TOGGLE BOOKINGS SECTION
   * 
   * Expands or collapses the bookings section to improve page organization
   * and allow users to hide/show their booking history as needed.
   */
  const toggleBookingsExpanded = () => {
    setBookingsExpanded(!bookingsExpanded)
  }

  async function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation !== 'DELETE') return

    const doubleConfirmation = confirm(
      'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.'
    )
    if (!doubleConfirmation) return

    setBusy(true)
    setMessage('Deleting account...')

    try {
      // Get current session token for authentication
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        throw new Error('No authentication token found. Please sign in again.')
      }

      // Call Netlify function to delete user account
      // Use the current site's URL to ensure we're calling the right endpoint
      let url: string
      if (window.location.hostname === 'localhost') {
        url = 'http://localhost:8888/.netlify/functions/user-delete'
      } else {
        // Use the current site's origin to ensure we call the right deployment
        url = `${window.location.origin}/.netlify/functions/user-delete`
      }
      
      console.log('Calling delete function at:', url)
      console.log('Using token:', token ? 'Token present' : 'No token')
      
      // First, test if the function endpoint exists
      try {
        const testResponse = await fetch(url.replace('user-delete', 'ping'), { method: 'GET' })
        console.log('Test ping response:', testResponse.status)
      } catch (e) {
        console.log('Test ping failed:', e)
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      })

      console.log('Delete response status:', response.status)
      console.log('Delete response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.text()
        console.log('Delete error response:', errorData)
        throw new Error(errorData || `Delete failed: ${response.status}`)
      }

      const successData = await response.text()
      console.log('Delete success response:', successData)

      // Account deleted successfully - clear local state
      try { localStorage.clear() } catch {}
      setMessage('Your account has been deleted. You can now create a new account with the same email.')
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)

    } catch (error: any) {
      console.error('Account deletion error:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred'
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Network error: Unable to reach the server. Please check your internet connection and try again.'
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Server configuration error. Please contact support.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setMessage(`Error deleting account: ${errorMessage}`)
    } finally {
      setBusy(false)
    }
  }

  if (!auth.isAuthed) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">Please sign in to manage your account.</div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-xl font-semibold tracking-tight">Account</h1>
          {role && <div className="mt-1 text-xs text-neutral-500">Type: {String(role).toLowerCase() === 'business' ? 'Business account' : 'Community account'}</div>}
          {message && <div className="mt-2 text-sm text-neutral-700">{message}</div>}

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-neutral-600">Display Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="you@example.com" />
            </div>
            <div className="flex gap-3">
              <button disabled={busy} onClick={saveProfile} className="flex-1 rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Save Changes'}</button>
              <button disabled={busy} onClick={updatePassword} className="rounded-full bg-neutral-100 text-neutral-900 px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50">Change Password</button>
            </div>
          </div>

          {/* BUSINESS ACCOUNT MANAGEMENT SECTION
              
              For business users, show their pending applications status
              and provide link to full My Business page for complete management.
          */}
          {auth.role === 'business' && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium mb-3">Business Management</div>
              
              {/* Show pending business applications with status */}
              {pendingApps.length > 0 && (
                <div className="space-y-3 mb-4">
                  {pendingApps.map((app) => (
                    <div key={app.id} className="rounded-xl border border-neutral-200 p-4 bg-neutral-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{app.business_name || 'Business Listing'}</h3>
                          <p className="text-xs text-neutral-600 mt-1">
                            Submitted: {new Date(app.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending Review
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 mt-3">
                        Your business listing is under review. We'll notify you once it's approved and live on Bonita Forward.
                      </p>
                      <a 
                        href="mailto:support@bonitaforward.com?subject=Business Listing Support"
                        className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Contact Support
                      </a>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3">
                <p className="text-sm text-neutral-600 mb-3">
                  Manage your business listings, applications, and analytics.
                </p>
                <Link 
                  to="/my-business" 
                  className="inline-block rounded-full bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800"
                >
                  Go to My Business →
                </Link>
              </div>
            </div>
          )}
          {/* BOOKINGS SECTION - Available to all users */}
          {/* Display user's appointment bookings made through the booking system */}
            <div className="mt-6 border-t border-neutral-100 pt-4">
            {/* BOOKINGS HEADER - Clickable toggle with expand/collapse functionality */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={toggleBookingsExpanded}
                className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 transition-colors"
              >
                <span>My Bookings</span>
                {/* Expand/collapse chevron icon */}
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${bookingsExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="text-xs text-neutral-500">
                {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
              </div>
            </div>
            {/* COLLAPSIBLE BOOKINGS CONTENT */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              bookingsExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {/* Collapsed state hint - only show when collapsed and has bookings */}
              {!bookingsExpanded && bookings.length > 0 && (
                <div className="mt-2 text-xs text-neutral-500 italic">
                  Click to view {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                </div>
              )}
              <div className="mt-2 text-sm">
                {/* Loading state indicator */}
                {communityLoading && <div className="text-neutral-500">Loading…</div>}
                
                {/* Empty state - shown when no bookings exist */}
                {!communityLoading && bookings.length === 0 && (
                  <div className="text-neutral-600 p-4 text-center border border-neutral-200 rounded-lg">
                    No bookings found. Book appointments with local businesses to see them here.
              </div>
                )}
                
                {/* BOOKINGS LIST - Display each booking as a card with full details */}
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between">
                        {/* LEFT SIDE - Booking details and information */}
                        <div className="flex-1">
                          {/* Business name and status badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-neutral-900">
                              {booking.provider_name || 'Business'}
                            </h4>
                            {/* Status badge with color coding */}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status || 'Unknown'}
                            </span>
            </div>
                          
                          {booking.time && (
                            <div className="text-sm text-neutral-600 mb-2">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(booking.time).toLocaleDateString()} at {new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {booking.booking_duration_minutes && (
                                  <span className="text-neutral-500">({booking.booking_duration_minutes} min)</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {booking.provider_address && (
                            <div className="text-sm text-neutral-600 mb-1">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {booking.provider_address}
                              </div>
                            </div>
                          )}
                          
                          {booking.booking_notes && (
                            <div className="text-sm text-neutral-600 mb-2">
                              <div className="flex items-start gap-1">
                                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <span>{booking.booking_notes}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-neutral-500">
                            Booked on {new Date(booking.created_at || '').toLocaleDateString()}
                          </div>
                        </div>
                        
                        {/* RIGHT SIDE - Action buttons for booking management */}
                        <div className="flex flex-col gap-2 ml-4">
                          {/* Call business button - only show if phone number exists */}
                          {booking.provider_phone && (
                            <a 
                              href={`tel:${booking.provider_phone}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Call
                            </a>
                          )}
                          
                          {/* Booking management buttons */}
                          <div className="flex flex-col gap-1">
                            {/* Edit booking button - available for all bookings */}
                            <button
                              onClick={() => editBooking(booking)}
                              disabled={cancellingBookingId === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>

                            {/* Confirm booking button - only for pending bookings */}
                            {booking.status === 'pending' && (
                              <button
                                onClick={() => manageBooking('confirm', booking.id)}
                                disabled={cancellingBookingId === booking.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirm
                              </button>
                            )}

                            {/* Cancel booking button - available for confirmed and pending bookings */}
                            {(booking.status === 'confirmed' || booking.status === 'pending') && (
                              <button
                                onClick={() => manageBooking('cancel', booking.id)}
                                disabled={cancellingBookingId === booking.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingBookingId === booking.id ? (
                                  <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                  </>
                                )}
                              </button>
                            )}

                            {/* Delete booking button - available for cancelled bookings or as business owner */}
                            {(booking.status === 'cancelled' || auth.role === 'business') && (
                              <button
                                onClick={() => manageBooking('delete', booking.id)}
                                disabled={cancellingBookingId === booking.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div> {/* End of collapsible bookings content */}
          
          {/* Saved Businesses - Available to all users */}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Saved Businesses</div>
              <div className="text-xs text-neutral-500">
                {savedBusinesses.length} saved
              </div>
            </div>
            <div className="mt-2">
              {communityLoading && <div className="text-sm text-neutral-500">Loading…</div>}
              {!communityLoading && savedBusinesses.length === 0 && (
                <div className="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-4 text-center">
                  No saved businesses yet. <br/>
                  <span className="text-xs text-neutral-500 mt-1">Click "Save Business" on any provider page to save for later!</span>
                </div>
              )}
              <div className="space-y-2">
                {savedBusinesses.map((business, idx) => (
                  <div 
                    key={`${business.id || business.provider_id}-${idx}`}
                    className="border border-neutral-200 rounded-lg p-3 hover:border-blue-300 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/provider/${business.provider_id}`}
                          className="font-medium text-neutral-900 hover:text-blue-600 transition-colors text-sm block truncate"
                        >
                          {business.provider_name || 'Business'}
                        </Link>
                        {business.provider_category && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {business.provider_category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        )}
                        {business.provider_address && (
                          <div className="text-xs text-neutral-600 mt-1 flex items-start">
                            <span className="mr-1">📍</span>
                            <span className="line-clamp-1">{business.provider_address}</span>
                          </div>
                        )}
                        {business.provider_phone && (
                          <div className="text-xs text-neutral-600 mt-1">
                            <a href={`tel:${business.provider_phone}`} className="hover:text-blue-600">
                              📞 {business.provider_phone}
                            </a>
                          </div>
                        )}
                        {business.provider_tags && business.provider_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {business.provider_tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-neutral-400 mt-2">
                          Saved {business.created_at ? new Date(business.created_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSavedBusiness(business.id, business.provider_name || null)}
                        className="flex-shrink-0 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove from saved"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {String(auth.role || role || '').toLowerCase() === 'community' && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">Discounts Redeemed</div>
              <div className="mt-2 text-sm">
                {communityLoading && <div className="text-neutral-500">Loading…</div>}
                {!communityLoading && discounts.length === 0 && <div className="text-neutral-600">No discounts redeemed yet.</div>}
                <ul className="space-y-1">
                  {discounts.map((d) => (
                    <li key={d.id} className="flex items-center justify-between">
                      <span>{d.provider_name || d.provider_id || 'Business'}{d.code ? ` • ${d.code}` : ''}</span>
                      <span className="text-xs text-neutral-500">{d.created_at ? new Date(d.created_at).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* My Events Section - Available to all users */}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">My Events</div>
              <Link 
                to="/calendar" 
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + Create Event
              </Link>
            </div>
            <div className="mt-2 text-sm">
              {communityLoading && <div className="text-neutral-500">Loading…</div>}
              {!communityLoading && myEvents.length === 0 && (
                <div className="text-neutral-600">
                  No events created yet. <Link to="/calendar" className="text-blue-600 hover:underline">Create your first event!</Link>
                </div>
              )}
              <div className="space-y-3">
                {myEvents.map((event) => (
                  <div key={event.id} className="border border-neutral-200 rounded-lg p-3">
                    {editingEventId === event.id && editingEvent ? (
                      // Edit Mode
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingEvent.title}
                          onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                          placeholder="Event title"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={editingEvent.date.split('T')[0]}
                            onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value + 'T12:00:00' })}
                            className="px-2 py-1 border border-neutral-300 rounded text-xs"
                          />
                          <input
                            type="time"
                            value={editingEvent.time || ''}
                            onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                            className="px-2 py-1 border border-neutral-300 rounded text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingEvent.location || ''}
                          onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                          placeholder="Location"
                        />
                        <input
                          type="text"
                          value={editingEvent.address || ''}
                          onChange={(e) => setEditingEvent({ ...editingEvent, address: e.target.value })}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                          placeholder="Address"
                        />
                        <textarea
                          value={editingEvent.description || ''}
                          onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                          placeholder="Description"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEvent}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-neutral-200 text-neutral-800 text-xs rounded hover:bg-neutral-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-neutral-900">{event.title}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                              📅 {new Date(event.date).toLocaleDateString()} {event.time && `• ${event.time}`}
                            </div>
                            {event.location && (
                              <div className="text-xs text-neutral-600 mt-1">📍 {event.location}</div>
                            )}
                            {event.description && (
                              <div className="text-xs text-neutral-600 mt-2 line-clamp-2">{event.description}</div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit event"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                              title="Delete event"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                          <span className="px-2 py-0.5 bg-neutral-100 rounded-full">{event.category}</span>
                          <span>👍 {event.upvotes}</span>
                          <span>👎 {event.downvotes}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {auth.role === 'business' && pendingApps.length > 0 && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="text-sm font-medium">Pending Applications</div>
              <div className="mt-2 text-sm">
                <ul className="space-y-1">
                  {pendingApps.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{a.business_name || 'Unnamed Business'}</span>
                      <span className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="text-sm text-neutral-700 font-medium">Security</div>
            <button disabled={busy} onClick={updatePassword} className="mt-2 rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Change Password</button>
          </div>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="text-sm text-neutral-700 font-medium">Delete Account</div>
            <p className="text-xs text-neutral-500 mt-1">This will permanently remove your account and access. For compliance, final deletion will be confirmed via email.</p>
            <button disabled={busy} onClick={deleteAccount} className="mt-2 rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete Account</button>
          </div>
        </div>
      </div>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Edit Booking Details
                </h3>
                <button
                  onClick={cancelEditBooking}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Business Info */}
                <div className="bg-neutral-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-900">
                    {editingBooking.provider_name || 'Business'}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {editingBooking.customer_name} • {editingBooking.customer_email}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editBookingDate}
                      onChange={(e) => setEditBookingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={editBookingTime}
                      onChange={(e) => setEditBookingTime(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={editBookingDuration}
                    onChange={(e) => setEditBookingDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="60"
                  />
                </div>

                {/* Party Size for Restaurants */}
                {editingBooking.provider_category === 'restaurants-cafes' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Party Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editBookingNotes.match(/Party size: (\d+)/)?.[1] || '1'}
                      onChange={(e) => {
                        const partySize = e.target.value
                        const notesWithoutPartySize = editBookingNotes.replace(/Party size: \d+/g, '').trim()
                        setEditBookingNotes(`${notesWithoutPartySize}\nParty size: ${partySize}`.trim())
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editBookingNotes.replace(/Party size: \d+/g, '').trim()}
                    onChange={(e) => {
                      const partySizeMatch = editBookingNotes.match(/Party size: (\d+)/)
                      const partySize = partySizeMatch ? partySizeMatch[0] : ''
                      setEditBookingNotes(`${e.target.value}${partySize ? `\n${partySize}` : ''}`.trim())
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Notification Option */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendNotification"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="sendNotification" className="text-sm text-neutral-700">
                    Send notification to customer about changes
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelEditBooking}
                  className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedBooking}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}



