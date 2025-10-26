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
  loadMyEvents, 
  loadPendingApplications,
  loadMyBusinesses,
  requestApplicationUpdate
} from './account/dataLoader'
import { AccountSettings, MyBookings, SavedBusinesses } from './account/components'

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
    myEvents: [],
    pendingApps: [],
    myBusinesses: [],
  })

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
      
      const [bookings, savedBusinesses, myEvents, pendingApps, myBusinesses] = await Promise.all([
        loadBookings(auth.email || ''),
        loadSavedBusinesses(auth.userId),
        loadMyEvents(auth.userId),
        loadPendingApplications(auth.email || ''),
        loadMyBusinesses(auth.userId),
      ])
      
      setData({ bookings, savedBusinesses, myEvents, pendingApps, myBusinesses })
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
              className="mb-6 flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
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
                                {business.address && <p>📍 {business.address}</p>}
                                {business.phone && <p>📞 {business.phone}</p>}
                                {business.email && <p>✉️ {business.email}</p>}
                                {business.website && (
                                  <p>
                                    🌐 <a 
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
                            {business.published && (
                              <Link
                                to={`/providers/${business.id}`}
                                className="ml-auto px-3 py-1.5 text-xs bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Listing in {business.category_key?.replace('-', ' ') || 'Category'}
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
              <SavedBusinesses
                businesses={data.savedBusinesses}
                loading={loading}
                onBusinessRemoved={handleBusinessRemoved}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'my-events' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Events</h2>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : data.myEvents.length === 0 ? (
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
                    {data.myEvents.map((event) => (
                      <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                            <div className="space-y-1 text-sm text-neutral-600">
                              <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                              {event.time && <p>🕐 {event.time}</p>}
                              {event.location && <p>📍 {event.location}</p>}
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
            )}
            
            {activeSection === 'applications' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Business Applications</h2>
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
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {app.tier_requested === 'featured' ? '⭐ Featured' : '🆓 Free'}
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
                                {business.address && <p>📍 {business.address}</p>}
                                {business.phone && <p>📞 {business.phone}</p>}
                                {business.email && <p>✉️ {business.email}</p>}
                                {business.website && (
                                  <p>
                                    🌐 <a 
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
                            {business.published && (
                              <Link
                                to={`/providers/${business.id}`}
                                className="ml-auto px-3 py-1.5 text-xs bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Listing in {business.category_key?.replace('-', ' ') || 'Category'}
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
              <SavedBusinesses
                businesses={data.savedBusinesses}
                loading={loading}
                onBusinessRemoved={handleBusinessRemoved}
                onMessage={setMessage}
              />
            )}
            
            {activeSection === 'my-events' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">My Events</h2>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : data.myEvents.length === 0 ? (
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
                    {data.myEvents.map((event) => (
                      <div key={event.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
                            <div className="space-y-1 text-sm text-neutral-600">
                              <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                              {event.time && <p>🕐 {event.time}</p>}
                              {event.location && <p>📍 {event.location}</p>}
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
            )}
            
            {activeSection === 'applications' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Pending Applications</h2>
                {data.pendingApps.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 text-center">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.pendingApps.map((app) => (
                      <div key={app.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
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
                          <button
                            onClick={() => cancelApplication(app.id, app.business_name || 'Untitled Application')}
                            className="flex-shrink-0 ml-4 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                            title="Cancel application"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
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
    </div>
  )
}
