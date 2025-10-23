import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  User, 
  Briefcase, 
  Calendar, 
  Heart, 
  CalendarDays, 
  FileText, 
  Shield, 
  Trash2,
  X
} from 'lucide-react'
import { type CalendarEvent } from './Calendar'

// Dashboard section types
type DashboardSection = 
  | 'account' 
  | 'business' 
  | 'bookings' 
  | 'saved-businesses' 
  | 'my-events' 
  | 'applications' 
  | 'security' 
  | 'delete'

interface SidebarItem {
  id: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'business', label: 'Business Management', icon: Briefcase },
  { id: 'bookings', label: 'My Bookings', icon: Calendar },
  { id: 'saved-businesses', label: 'Saved Businesses', icon: Heart },
  { id: 'my-events', label: 'My Events', icon: CalendarDays },
  { id: 'applications', label: 'Pending Applications', icon: FileText },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'delete', label: 'Delete Account', icon: Trash2 },
]

export default function AccountPage() {
  const auth = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('account')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingApps, setPendingApps] = useState<{ id: string; business_name: string | null; created_at: string }[]>([])
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
  const [communityLoading, setCommunityLoading] = useState(false)
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>([])
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)

  /**
   * ACCOUNT DATA INITIALIZATION
   */
  useEffect(() => {
    console.log('[Account] Auth state changed:', { email: auth.email, name: auth.name, userId: auth.userId })
    
    setEmail(auth.email || '')
    setName(auth.name || '')
    
    async function loadUserData() {
      if (!auth.userId) { 
        setPendingApps([])
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
        console.log('[Account] Loaded role:', userRole)
        
      } catch (error) {
        console.error('[Account] Error loading user data:', error)
      }
    }
    
    loadUserData()
  }, [auth.userId, auth.email, auth.name])

  // Load community data (bookings, saved businesses, saved coupons, my events)
  useEffect(() => {
    async function loadCommunityData() {
      if (!auth.userId) return
      
      try {
      setCommunityLoading(true)
        
        // Load bookings (try with error handling)
        try {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              status,
              created_at,
              customer_name,
              customer_email,
              booking_duration_minutes,
              booking_notes,
              provider_id,
              providers (
                id,
                name,
                category_key,
                address,
                phone
              )
            `)
            .eq('customer_user_id', auth.userId)
            .order('created_at', { ascending: false })
          
          if (!bookingsError) {
            setBookings((bookingsData || []).map((b: any) => ({
              id: b.id,
              provider_id: b.provider_id || b.providers?.id,
              provider_name: b.providers?.name,
              time: null, // time column doesn't exist in bookings table
              status: b.status,
              created_at: b.created_at,
              customer_name: b.customer_name,
              customer_email: b.customer_email,
              booking_duration_minutes: b.booking_duration_minutes,
              booking_notes: b.booking_notes,
              provider_category: b.providers?.category_key,
              provider_address: b.providers?.address,
              provider_phone: b.providers?.phone,
            })))
          } else {
            console.log('[Account] Error loading bookings:', bookingsError)
            setBookings([])
          }
        } catch (err) {
          console.log('[Account] Error in bookings query:', err)
          setBookings([])
        }
        
        // Load saved businesses
        const { data: savedData } = await supabase
            .from('saved_providers')
          .select(`
            id,
            provider_id,
            created_at,
            providers (
              name,
              category_key,
              address,
              phone,
              tags
            )
          `)
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
        
        setSavedBusinesses((savedData || []).map((s: any) => ({
          id: s.id,
          provider_id: s.provider_id,
          created_at: s.created_at,
          provider_name: s.providers?.name,
          provider_category: s.providers?.category_key,
          provider_address: s.providers?.address,
          provider_phone: s.providers?.phone,
          provider_tags: s.providers?.tags,
        })))
        
        // Load my events - calendar_events table doesn't filter by user
        // Just show empty for now since there's no user association column
        setMyEvents([])
        
      } catch (error) {
        console.error('[Account] Error loading community data:', error)
      } finally {
        setCommunityLoading(false)
      }
    }
    
    loadCommunityData()
  }, [auth.userId])

  // Update profile
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!auth.userId) {
      setMessage('Not authenticated')
      return
    }
    
    setBusy(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', auth.userId)
      
      if (error) throw error
      
      // Refresh the auth context by reloading user data
      setMessage('Profile updated successfully!')
      
      // Optional: Force a page reload to refresh auth state
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  // Cancel booking
  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    
    setCancellingBookingId(bookingId)
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
      
      if (error) throw error
      
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ))
      
      setMessage('Booking cancelled successfully')
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setCancellingBookingId(null)
    }
  }

  // Unsave business
  async function handleUnsaveBusiness(savedId: string) {
    try {
      const { error } = await supabase
        .from('saved_providers')
        .delete()
        .eq('id', savedId)

      if (error) throw error

      setSavedBusinesses(prev => prev.filter(s => s.id !== savedId))
      setMessage('Business removed from saved')
    } catch (error: any) {
      setMessage(error.message)
    }
  }


  // Delete event
  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      setMyEvents(prev => prev.filter(e => e.id !== eventId))
      setMessage('Event deleted successfully')
    } catch (error: any) {
      setMessage(error.message)
    }
  }

  // Update event
  async function handleUpdateEvent() {
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
        })
        .eq('id', editingEventId)

      if (error) throw error

      setMyEvents(prev => prev.map(e => 
        e.id === editingEventId ? editingEvent : e
      ))
      
      setEditingEventId(null)
      setEditingEvent(null)
      setMessage('Event updated successfully')
    } catch (error: any) {
      setMessage(error.message)
    }
  }

  // Delete account
  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return
    
    try {
      // Note: This requires a Supabase function to properly delete user data
      const { error } = await supabase.rpc('delete_user_account')

      if (error) throw error

      await auth.signOut()
    } catch (error: any) {
      setMessage(error.message || 'Failed to delete account. Please contact support.')
    }
  }

  if (!auth.isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p className="text-neutral-600 mb-6">You need to be signed in to access your account.</p>
          <Link to="/signin" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile Horizontal Navigation */}
      <div className="lg:hidden sticky top-16 z-40 bg-white border-b border-neutral-200 overflow-x-auto">
        <div className="flex gap-2 p-4">
          {SIDEBAR_ITEMS.map((item) => {
            const IconComponent = item.icon
            const isActive = activeSection === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
            </div>
            </div>
      
      <div className="flex">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-200 fixed left-0 top-16 bottom-0 flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <h1 className="text-2xl font-bold text-neutral-900">Account</h1>
            <p className="text-sm text-neutral-600 mt-1 truncate">{email}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {SIDEBAR_ITEMS.map((item) => {
              const IconComponent = item.icon
              const isActive = activeSection === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-6 border-t border-neutral-200">
            <button
              onClick={() => auth.signOut()}
              className="w-full px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Sign Out
            </button>
                    </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8">
        {/* Message Banner */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
            <p className="text-sm text-blue-800">{message}</p>
            <button onClick={() => setMessage(null)} className="text-blue-600 hover:text-blue-700">
              <X className="w-4 h-4" />
            </button>
            </div>
          )}
        
        {/* Sign Out Button (Mobile Only) */}
        <div className="lg:hidden mb-6">
              <button
            onClick={() => auth.signOut()}
            className="w-full px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Sign Out
              </button>
              </div>
        
        {/* Section Content */}
        <div className="max-w-4xl">
          {activeSection === 'account' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Account Settings</h2>
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
                    />
              </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
            </div>
                          
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
                              </div>
                            </div>
                          )}
                          
          {activeSection === 'business' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Business Management</h2>
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <p className="text-neutral-600 mb-4">Manage your business listings and information.</p>
                <Link
                  to="/owner"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Go to Business Dashboard
                </Link>
                              </div>
                            </div>
                          )}
                          
          {activeSection === 'bookings' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Bookings</h2>
              {communityLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                  <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No bookings yet</p>
                                  </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                            {booking.provider_name || 'Unknown Business'}
                          </h3>
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
                        {booking.status !== 'cancelled' && (
                            <button
                            onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancellingBookingId === booking.id}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
          )}
          
          {activeSection === 'saved-businesses' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Saved Businesses</h2>
              {communityLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              ) : savedBusinesses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                  <Heart className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No saved businesses yet</p>
            </div>
              ) : (
                <div className="space-y-4">
                  {savedBusinesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                            {business.provider_name || 'Unknown Business'}
                          </h3>
                        {business.provider_category && (
                            <p className="text-sm text-neutral-600 mb-1">
                              🏢 {business.provider_category}
                            </p>
                        )}
                        {business.provider_address && (
                            <p className="text-sm text-neutral-600 mb-1">📍 {business.provider_address}</p>
                        )}
                        {business.provider_tags && business.provider_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {business.provider_tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                          onClick={() => business.id && handleUnsaveBusiness(business.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                          Remove
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              )}
                            </div>
          )}
          
          {activeSection === 'my-events' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Events</h2>
              {communityLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
              ) : myEvents.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                  <CalendarDays className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4">No events created yet</p>
              <Link 
                to="/calendar" 
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                    Create Event
              </Link>
            </div>
              ) : (
                <div className="space-y-4">
                {myEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                      {editingEventId === event.id ? (
                        <div className="space-y-4">
                        <input
                          type="text"
                            value={editingEvent?.title || ''}
                            onChange={(e) => setEditingEvent(prev => prev ? { ...prev, title: e.target.value } : null)}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                          placeholder="Event title"
                        />
                        <textarea
                            value={editingEvent?.description || ''}
                            onChange={(e) => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                            rows={3}
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <button
                              onClick={handleUpdateEvent}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                              onClick={() => {
                                setEditingEventId(null)
                                setEditingEvent(null)
                              }}
                              className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-neutral-600 mb-2">{event.description}</p>
                            )}
                            <p className="text-sm text-neutral-600 mb-1">
                              📅 {new Date(event.date).toLocaleDateString()}
                            </p>
                            {event.time && (
                              <p className="text-sm text-neutral-600 mb-1">🕐 {event.time}</p>
                            )}
                            {event.location && (
                              <p className="text-sm text-neutral-600 mb-1">📍 {event.location}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEventId(event.id)
                                setEditingEvent(event)
                              }}
                              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
          
          {activeSection === 'applications' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Pending Applications</h2>
              {pendingApps.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                  <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No pending applications</p>
              </div>
              ) : (
                <div className="space-y-4">
                  {pendingApps.map((app) => (
                    <div key={app.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                      <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                        {app.business_name || 'Untitled Application'}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        Submitted: {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium mt-2">
                        Pending Review
                      </span>
                    </div>
                  ))}
            </div>
          )}
          </div>
          )}
          
          {activeSection === 'security' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Security</h2>
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <h3 className="font-semibold text-lg text-neutral-900 mb-4">Change Password</h3>
                <p className="text-neutral-600 mb-4">
                  To change your password, sign out and use the "Forgot Password" link on the sign-in page.
                </p>
                <button
                  onClick={() => auth.signOut()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
                  </div>
          )}

          {activeSection === 'delete' && (
                  <div>
              <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-6">Delete Account</h2>
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                      Permanently Delete Account
                    </h3>
                    <p className="text-neutral-600 mb-4">
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </p>
                    <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1 mb-6">
                      <li>All your bookings will be cancelled</li>
                      <li>Your saved businesses and coupons will be lost</li>
                      <li>Your events will be deleted</li>
                      <li>Your applications will be removed</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}
          </div>
        </main>
        </div>
    </div>
  )
}
