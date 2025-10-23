import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, FileText, CalendarDays, Trash2, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { SIDEBAR_ITEMS } from './account/constants'
import type { DashboardSection, AccountData } from './account/types'
import { 
  loadBookings, 
  loadSavedBusinesses, 
  loadMyEvents, 
  loadPendingApplications 
} from './account/dataLoader'
import { AccountSettings, MyBookings, SavedBusinesses } from './account/components'

export default function AccountPage() {
  const auth = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('account')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AccountData>({
    bookings: [],
    savedBusinesses: [],
    myEvents: [],
    pendingApps: [],
  })

  // Load data when component mounts
  useEffect(() => {
    async function loadData() {
      if (!auth.userId || !auth.email) return
      
      setLoading(true)
      
      const [bookings, savedBusinesses, myEvents, pendingApps] = await Promise.all([
        loadBookings(auth.email || ''),
        loadSavedBusinesses(auth.userId),
        loadMyEvents(auth.userId),
        loadPendingApplications(auth.email || ''),
      ])
      
      setData({ bookings, savedBusinesses, myEvents, pendingApps })
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
            <p className="text-sm text-neutral-600 mt-1 truncate">{auth.email}</p>
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
              </div>
            )}
            
            {activeSection === 'applications' && (
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Pending Applications</h2>
                {data.pendingApps.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.pendingApps.map((app) => (
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
