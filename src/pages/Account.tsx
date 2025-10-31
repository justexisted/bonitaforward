import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { X, FileText, CalendarDays, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { SIDEBAR_ITEMS } from './account/constants'
import type { DashboardSection, AccountData } from './account/types'
import { 
  loadBookings, 
  loadSavedBusinesses,
  loadSavedCoupons,
  loadMyEvents,
  loadSavedEvents,
  loadPendingApplications,
  loadMyBusinesses,
  requestApplicationUpdate,
  updateEvent,
  deleteEvent
} from './account/dataLoader'
import { AccountSettings, MyBookings, SavedBusinesses, SavedCoupons } from './account/components'

export default function AccountPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // Default to 'account' on desktop (lg+), 'dashboard' on mobile
  const [activeSection, setActiveSection] = useState<DashboardSection>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'account' : 'dashboard'
    }
    return 'dashboard'
  })
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AccountData>({
    bookings: [],
    savedBusinesses: [],
    savedCoupons: [],
    myEvents: [],
    savedEvents: [],
    pendingApps: [],
    myBusinesses: [],
  })
  const [editingEvent, setEditingEvent] = useState<null | {
    id: string
    title: string
    description: string
    date: string
    time: string
    location: string
    address: string
  }>(null)
  const [submittingEventEdit, setSubmittingEventEdit] = useState(false)

  // Handle navigation from notifications
  useEffect(() => {
    const state = location.state as { section?: string } | null
    if (state?.section) {
      setActiveSection(state.section as DashboardSection)
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Load data when component mounts
  useEffect(() => {
    async function loadData() {
      if (!auth.userId || !auth.email) return
      
      setLoading(true)
      
      const [bookings, savedBusinesses, savedCoupons, myEvents, savedEvents, pendingApps, myBusinesses] = await Promise.all([
        loadBookings(auth.email || ''),
        loadSavedBusinesses(auth.userId),
        loadSavedCoupons(auth.userId),
        loadMyEvents(auth.userId),
        loadSavedEvents(auth.userId),
        loadPendingApplications(auth.email || ''),
        loadMyBusinesses(auth.userId, auth.email || ''),
      ])
      
      setData({ bookings, savedBusinesses, savedCoupons, myEvents, savedEvents, pendingApps, myBusinesses })
      setLoading(false)
    }
    
    loadData()
  }, [auth.userId, auth.email])

  // Update booking status locally
  function handleBookingCancelled(bookingId: string) {
    setData(prev => ({
      ...prev,
      bookings: prev.bookings.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      )
    }))
  }

  // Remove business locally
  function handleBusinessRemoved(savedId: string) {
    setData(prev => ({
      ...prev,
      savedBusinesses: prev.savedBusinesses.filter(b => b.id !== savedId)
    }))
  }

  // Remove coupon locally
  function handleCouponRemoved(couponId: string) {
    setData(prev => ({
      ...prev,
      savedCoupons: prev.savedCoupons.filter(c => c.id !== couponId)
    }))
  }

  // Cancel pending application
  async function cancelApplication(appId: string, businessName: string) {
    const confirmed = confirm(`Cancel your application for "${businessName}"?\n\nThis action cannot be undone.`)
    if (!confirmed) return
    
    try {
      const { error } = await supabase
        .from('business_applications')
        .delete()
        .eq('id', appId)
      
      if (error) {
        setMessage(`Failed to cancel application: ${error.message}`)
      } else {
        // Remove from local state
        setData(prev => ({
          ...prev,
          pendingApps: prev.pendingApps.filter(app => app.id !== appId)
        }))
        setMessage(`Application for "${businessName}" has been cancelled`)
      }
    } catch (err: any) {
      setMessage(`Error cancelling application: ${err.message}`)
    }
  }

  // Helper: remove event locally
  function handleEventDeleted(eventId: string) {
    setData(prev => ({
      ...prev,
      myEvents: prev.myEvents.filter(ev => ev.id !== eventId)
    }))
  }
  // Helper: update event locally
  function handleEventUpdated(updated: any) {
    setData(prev => ({
      ...prev,
      myEvents: prev.myEvents.map(ev => ev.id === updated.id ? { ...ev, ...updated } : ev)
    }))
  }

  // Filter sidebar items based on user type
  // Show Business Management and Pending Applications if user has:
  // 1. Any businesses (featured or free) in providers table, OR
  // 2. Any pending/approved/rejected applications
  // This ensures business account holders always see these sections,
  // but community members without businesses don't see them
  const visibleSidebarItems = SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'business' || item.id === 'applications') {
      // Show if user has businesses OR has submitted any applications
      const hasBusinesses = data.myBusinesses.length > 0
      const hasApplications = data.pendingApps.length > 0
      
      // Debug logging to help diagnose visibility issues
      if (!hasBusinesses && !hasApplications && auth.role === 'business') {
        console.log('[Account] Business account but no data:', {
          myBusinesses: data.myBusinesses,
          pendingApps: data.pendingApps,
          userId: auth.userId,
          email: auth.email
        })
      }
      
      return hasBusinesses || hasApplications
    }
    return true
  })

  if (!auth.isAuthed) {
    return (
      <div className="flex items-center justify-center bg-neutral-50 py-20">
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
    <div className="bg-neutral-50">
      {/* Mobile 4x2 Icon Grid Navigation */}
      <div className="lg:hidden">
        <main className="container-px mx-auto max-w-6xl px-4 pt-3 pb-4">
          {/* Header */}
          <div className="mb-3">
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">My Account</h1>
            <p className="text-sm text-neutral-600">Hi, {auth.name || 'User'}</p>
          </div>

          {/* Message Banner */}
          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
              <p className="text-sm text-blue-800">{message}</p>
              <button onClick={() => setMessage(null)} className="text-blue-600 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4x2 Icon Grid (Mobile Only) */}
          {activeSection === 'dashboard' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {visibleSidebarItems.map((item) => {
                const IconComponent = item.icon
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl border-2 border-neutral-200 hover:border-blue-500 hover:shadow-md transition-all group"
                  >
                    <IconComponent className="w-8 h-8 text-neutral-600 group-hover:text-blue-600 transition-colors" />
                    <span className="text-sm font-medium text-neutral-900 text-center">{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
          
          {/* Back Button (when not on main view) */}
          {activeSection !== 'dashboard' && (
            <button
              onClick={() => setActiveSection('dashboard')}
              className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>←</span>
              <span>Back to Account</span>
            </button>
          )}

          {/* Section Content (Mobile) */}
          <div className="max-w-4xl pb-4">
            {activeSection === 'account' && (
              <AccountSettings
                userId={auth.userId!}
                initialEmail={auth.email || ''}
                initialName={auth.name || ''}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'business' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Business Management</h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : data.myBusinesses.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                    <p className="text-neutral-600 mb-4">You don't have any businesses yet. Create your first listing!</p>
                    <Link 
                      to="/business"
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Add Your Business
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {data.myBusinesses.map((business) => (
                        <div
                          key={business.id}
                          onClick={() => navigate('/my-business')}
                          className="block bg-white rounded-xl shadow-sm border border-neutral-200 p-6 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors">{business.name}</h3>
                                {business.published ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Published
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    Draft
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-neutral-600">
                                <p className="capitalize">{business.category_key?.replace('-', ' ')}</p>
                                {business.address && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{business.address}</span>
                                  </p>
                                )}
                                {business.phone && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{business.phone}</span>
                                  </p>
                                )}
                                {business.email && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>{business.email}</span>
                                  </p>
                                )}
                                {business.website && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <a 
                                      href={business.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {business.website}
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                            <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                              Manage Business →
                            </span>
                            {business.published && business.slug && (
                              <Link
                                to={`/provider/${encodeURIComponent(business.slug)}`}
                                className="ml-auto px-3 py-1.5 text-xs bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Listing
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6">
                      <p className="text-neutral-600 mb-4">Need more control? Access the full business dashboard.</p>
                      <Link 
                        to="/my-business"
                        className="inline-block px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
                      >
                        Go to Business Dashboard
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {activeSection === 'bookings' && (
              <MyBookings
                bookings={data.bookings}
                loading={loading}
                onBookingCancelled={handleBookingCancelled}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'saved-businesses' && (
              <div className="space-y-8">
                <SavedBusinesses
                  businesses={data.savedBusinesses}
                  loading={loading}
                  onBusinessRemoved={handleBusinessRemoved}
                  onMessage={setMessage}
                />
                <SavedCoupons
                  coupons={data.savedCoupons}
                  loading={loading}
                  onCouponRemoved={handleCouponRemoved}
                  onMessage={setMessage}
                />
              </div>
            )}
            
            {activeSection === 'my-events' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Events</h2>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Created Events Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Events I Created</h3>
                      {data.myEvents.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
                          <CalendarDays className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-600 mb-3">No events created yet</p>
                          <Link 
                            to="/calendar" 
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Create Event
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {data.myEvents.map((event) => (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                                  <div className="space-y-1 text-sm text-neutral-600">
                                    <p className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </p>
                                    {event.time && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{event.time}</span>
                                      </p>
                                    )}
                                    {event.location && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{event.location}</span>
                                      </p>
                                    )}
                                    {event.category && (
                                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mt-2">
                                        {event.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-4">
                                  <Link
                                    to="/calendar"
                                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => setEditingEvent({
                                      id: event.id,
                                      title: (event as any).title || '',
                                      description: (event as any).description || '',
                                      date: (event as any).date || new Date().toISOString().split('T')[0],
                                      time: (event as any).time || '',
                                      location: (event as any).location || '',
                                      address: (event as any).address || ''
                                    })}
                                    className="px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Delete this event? This cannot be undone.')) return
                                      const res = await deleteEvent(event.id)
                                      if (res.success) {
                                        handleEventDeleted(event.id)
                                        setMessage('Event deleted')
                                      } else {
                                        setMessage(res.error || 'Failed to delete event')
                                      }
                                    }}
                                    className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 whitespace-nowrap"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Saved Events Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Saved Events</h3>
                      {data.savedEvents.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
                          <CalendarDays className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-600 mb-3">No saved events yet</p>
                          <p className="text-sm text-neutral-500 mb-3">
                            Browse the calendar and save events you're interested in attending
                          </p>
                          <Link 
                            to="/calendar" 
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Browse Calendar
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {data.savedEvents.map((event) => (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                                  <div className="space-y-1 text-sm text-neutral-600">
                                    <p className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </p>
                                    {event.time && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{event.time}</span>
                                      </p>
                                    )}
                                    {event.location && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{event.location}</span>
                                      </p>
                                    )}
                                    {event.category && (
                                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mt-2">
                                        {event.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Link
                                  to="/calendar"
                                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeSection === 'applications' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Pending Applications</h2>
                {data.pendingApps.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 text-center">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.pendingApps.map((app) => (
                      <div key={app.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-xl text-neutral-900 mb-2">
                              {app.business_name || 'Untitled Application'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {app.status === 'approved' ? '✓ Approved' :
                                 app.status === 'rejected' ? '✗ Rejected' :
                                 '⏳ Pending Review'}
                              </span>
                              {app.tier_requested && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {app.tier_requested === 'featured' ? (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      Featured
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Free
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {app.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const message = prompt('What would you like to ask the admin about your application?')
                                    if (message) {
                                      const result = await requestApplicationUpdate(app.id, message)
                                      if (result.success) {
                                        setMessage('Update request sent to admin')
                                        // Reload data
                                        const pendingApps = await loadPendingApplications(auth.email || '')
                                        setData(prev => ({ ...prev, pendingApps }))
                                      } else {
                                        setMessage('Failed to send update request: ' + (result.error || 'Unknown error'))
                                      }
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                  Request Update
                                </button>
                                <button
                                  onClick={() => cancelApplication(app.id, app.business_name || 'Untitled Application')}
                                  className="flex-shrink-0 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                  title="Cancel application"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Application Details */}
                        <div className="border-t border-neutral-100 pt-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {app.full_name && (
                              <div>
                                <span className="font-medium text-neutral-700">Contact Name:</span>
                                <p className="text-neutral-600">{app.full_name}</p>
                              </div>
                            )}
                            {app.email && (
                              <div>
                                <span className="font-medium text-neutral-700">Email:</span>
                                <p className="text-neutral-600">{app.email}</p>
                              </div>
                            )}
                            {app.phone && (
                              <div>
                                <span className="font-medium text-neutral-700">Phone:</span>
                                <p className="text-neutral-600">{app.phone}</p>
                              </div>
                            )}
                            {app.category && (
                              <div>
                                <span className="font-medium text-neutral-700">Category:</span>
                                <p className="text-neutral-600 capitalize">{app.category.replace('-', ' ')}</p>
                              </div>
                            )}
                          </div>

                          {app.challenge && (
                            <div className="text-sm">
                              <span className="font-medium text-neutral-700">Message/Notes:</span>
                              <p className="text-neutral-600 mt-1 bg-neutral-50 p-3 rounded-lg">{app.challenge}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                            <span>Submitted: {new Date(app.created_at).toLocaleString()}</span>
                            {app.updated_at && (
                              <span>Updated: {new Date(app.updated_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
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
                        <li>Your saved businesses will be lost</li>
                        <li>Your events will be deleted</li>
                        <li>Your applications will be removed</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
                      if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return
                      alert('Account deletion requires contacting support. Please email hello@bonitaforward.com')
                    }}
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

      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Left Sidebar */}
        <aside className="w-64 bg-white border-r border-neutral-200 fixed left-0 top-16 bottom-0 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <h1 className="text-2xl font-bold text-neutral-900">Account</h1>
            <p className="text-sm text-neutral-600 mt-1 truncate">Hi, {auth.name || 'User'}</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {visibleSidebarItems.map((item) => {
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

        {/* Main Content (Desktop) */}
        <main className="flex-1 ml-64 p-8 pt-20 pb-6">
          {/* Message Banner */}
          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
              <p className="text-sm text-blue-800">{message}</p>
              <button onClick={() => setMessage(null)} className="text-blue-600 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Section Content (Desktop) */}
          <div className="max-w-4xl">
            {activeSection === 'account' && (
              <AccountSettings
                userId={auth.userId!}
                initialEmail={auth.email || ''}
                initialName={auth.name || ''}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'business' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Business Management</h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : data.myBusinesses.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                    <p className="text-neutral-600 mb-4">You don't have any businesses yet. Create your first listing!</p>
                    <Link 
                      to="/business"
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Add Your Business
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {data.myBusinesses.map((business) => (
                        <div
                          key={business.id}
                          onClick={() => navigate('/my-business')}
                          className="block bg-white rounded-xl shadow-sm border border-neutral-200 p-6 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors">{business.name}</h3>
                                {business.published ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Published
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    Draft
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-neutral-600">
                                <p className="capitalize">{business.category_key?.replace('-', ' ')}</p>
                                {business.address && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{business.address}</span>
                                  </p>
                                )}
                                {business.phone && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{business.phone}</span>
                                  </p>
                                )}
                                {business.email && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>{business.email}</span>
                                  </p>
                                )}
                                {business.website && (
                                  <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <a 
                                      href={business.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {business.website}
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                            <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                              Manage Business →
                            </span>
                            {business.published && business.slug && (
                              <Link
                                to={`/provider/${encodeURIComponent(business.slug)}`}
                                className="ml-auto px-3 py-1.5 text-xs bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Listing
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6">
                      <p className="text-neutral-600 mb-4">Need more control? Access the full business dashboard.</p>
                      <Link 
                        to="/my-business"
                        className="inline-block px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
                      >
                        Go to Business Dashboard
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {activeSection === 'bookings' && (
              <MyBookings
                bookings={data.bookings}
                loading={loading}
                onBookingCancelled={handleBookingCancelled}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'saved-businesses' && (
              <div className="space-y-8">
                <SavedBusinesses
                  businesses={data.savedBusinesses}
                  loading={loading}
                  onBusinessRemoved={handleBusinessRemoved}
                  onMessage={setMessage}
                />
                <SavedCoupons
                  coupons={data.savedCoupons}
                  loading={loading}
                  onCouponRemoved={handleCouponRemoved}
                  onMessage={setMessage}
                />
              </div>
            )}
            
            {activeSection === 'my-events' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Events</h2>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Created Events Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Events I Created</h3>
                      {data.myEvents.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
                          <CalendarDays className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-600 mb-3">No events created yet</p>
                          <Link 
                            to="/calendar" 
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Create Event
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {data.myEvents.map((event) => (
                      <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                            <div className="space-y-1 text-sm text-neutral-600">
                              <p className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                              </p>
                              {event.time && (
                                <p className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{event.time}</span>
                                </p>
                              )}
                              {event.location && (
                                <p className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>{event.location}</span>
                                </p>
                              )}
                              {event.category && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mt-2">
                                  {event.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-4">
                            <Link
                              to="/calendar"
                              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => setEditingEvent({
                                id: event.id,
                                title: (event as any).title || '',
                                description: (event as any).description || '',
                                date: (event as any).date || new Date().toISOString().split('T')[0],
                                time: (event as any).time || '',
                                location: (event as any).location || '',
                                address: (event as any).address || ''
                              })}
                              className="px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 whitespace-nowrap"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this event? This cannot be undone.')) return
                                const res = await deleteEvent(event.id)
                                if (res.success) {
                                  handleEventDeleted(event.id)
                                  setMessage('Event deleted')
                                } else {
                                  setMessage(res.error || 'Failed to delete event')
                                }
                              }}
                              className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                    {/* Saved Events Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Saved Events</h3>
                      {data.savedEvents.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
                          <CalendarDays className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-600 mb-3">No saved events yet</p>
                          <p className="text-sm text-neutral-500 mb-3">
                            Browse the calendar and save events you're interested in attending
                          </p>
                          <Link 
                            to="/calendar" 
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Browse Calendar
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {data.savedEvents.map((event) => (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                                  <div className="space-y-1 text-sm text-neutral-600">
                                    <p className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </p>
                                    {event.time && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{event.time}</span>
                                      </p>
                                    )}
                                    {event.location && (
                                      <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{event.location}</span>
                                      </p>
                                    )}
                                    {event.category && (
                                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mt-2">
                                        {event.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Link
                                  to="/calendar"
                                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeSection === 'applications' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Pending Applications</h2>
                {data.pendingApps.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 text-center">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.pendingApps.map((app) => (
                      <div key={app.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-xl text-neutral-900 mb-2">
                              {app.business_name || 'Untitled Application'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {app.status === 'approved' ? '✓ Approved' :
                                 app.status === 'rejected' ? '✗ Rejected' :
                                 '⏳ Pending Review'}
                              </span>
                              {app.tier_requested && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {app.tier_requested === 'featured' ? (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      Featured
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Free
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {app.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const message = prompt('What would you like to ask the admin about your application?')
                                    if (message) {
                                      const result = await requestApplicationUpdate(app.id, message)
                                      if (result.success) {
                                        setMessage('Update request sent to admin')
                                        // Reload data
                                        const pendingApps = await loadPendingApplications(auth.email || '')
                                        setData(prev => ({ ...prev, pendingApps }))
                                      } else {
                                        setMessage('Failed to send update request: ' + (result.error || 'Unknown error'))
                                      }
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                  Request Update
                                </button>
                                <button
                                  onClick={() => cancelApplication(app.id, app.business_name || 'Untitled Application')}
                                  className="flex-shrink-0 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                  title="Cancel application"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Application Details */}
                        <div className="border-t border-neutral-100 pt-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {app.full_name && (
                              <div>
                                <span className="font-medium text-neutral-700">Contact Name:</span>
                                <p className="text-neutral-600">{app.full_name}</p>
                              </div>
                            )}
                            {app.email && (
                              <div>
                                <span className="font-medium text-neutral-700">Email:</span>
                                <p className="text-neutral-600">{app.email}</p>
                              </div>
                            )}
                            {app.phone && (
                              <div>
                                <span className="font-medium text-neutral-700">Phone:</span>
                                <p className="text-neutral-600">{app.phone}</p>
                              </div>
                            )}
                            {app.category && (
                              <div>
                                <span className="font-medium text-neutral-700">Category:</span>
                                <p className="text-neutral-600 capitalize">{app.category.replace('-', ' ')}</p>
                              </div>
                            )}
                          </div>

                          {app.challenge && (
                            <div className="text-sm">
                              <span className="font-medium text-neutral-700">Message/Notes:</span>
                              <p className="text-neutral-600 mt-1 bg-neutral-50 p-3 rounded-lg">{app.challenge}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                            <span>Submitted: {new Date(app.created_at).toLocaleString()}</span>
                            {app.updated_at && (
                              <span>Updated: {new Date(app.updated_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
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
                        <li>Your saved businesses will be lost</li>
                        <li>Your events will be deleted</li>
                        <li>Your applications will be removed</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
                      if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return
                      alert('Account deletion requires contacting support. Please email hello@bonitaforward.com')
                    }}
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

      {/* Edit Event Modal - Shared between mobile and desktop */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Edit Event</h3>
              <button onClick={() => setEditingEvent(null)} className="text-neutral-500 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="block text-sm">
                <span className="text-neutral-700">Title</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, title: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Date</span>
                <input
                  type="date"
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.date?.toString().split('T')[0] || ''}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, date: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Time</span>
                <input
                  type="time"
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.time || ''}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, time: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Location</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.location}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, location: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Address</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.address}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, address: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Description</span>
                <textarea
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  rows={4}
                  value={editingEvent.description}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : prev)}
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                disabled={submittingEventEdit}
                onClick={async () => {
                  if (!editingEvent) return
                  setSubmittingEventEdit(true)
                  const payload = {
                    title: editingEvent.title,
                    description: editingEvent.description,
                    date: editingEvent.date,
                    time: editingEvent.time,
                    location: editingEvent.location,
                    address: editingEvent.address,
                  }
                  const res = await updateEvent(editingEvent.id, payload)
                  setSubmittingEventEdit(false)
                  if (res.success) {
                    handleEventUpdated({ id: editingEvent.id, ...payload })
                    setEditingEvent(null)
                    setMessage('Event updated successfully')
                  } else {
                    setMessage(res.error || 'Failed to update event')
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingEventEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
