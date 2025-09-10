/**
 * MY BUSINESS PAGE
 * 
 * This is the dedicated business management dashboard for business account holders.
 * It provides three main sections:
 * 1. Active Listings - View and manage approved business listings
 * 2. Applications - Track submitted business applications
 * 3. Analytics - View business performance metrics (coming soon)
 * 
 * Key Features:
 * - Request free listings from submitted applications
 * - Upgrade existing listings from free to featured tier
 * - View application status and listing approval status
 * - Protected route - only accessible to users with role 'business'
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Link } from 'react-router-dom'

// Type definition for business listings in the providers table
type BusinessListing = {
  id: string
  name: string
  category_key: string
  tags: string[] | null
  badges: string[] | null
  rating: number | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  images: string[] | null
  owner_user_id: string | null
  is_featured: boolean | null
  tier: 'free' | 'featured' | null
  status: 'pending' | 'approved' | 'rejected' | null
  description: string | null
  social_links: Record<string, string> | null
  google_maps_url: string | null
  booking_enabled: boolean | null
  created_at: string
  updated_at: string
}

// Type definition for business applications in the business_applications table
type BusinessApplication = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  tier_requested: 'free' | 'featured' | null
  status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
}

export default function MyBusinessPage() {
  const auth = useAuth()
  const [listings, setListings] = useState<BusinessListing[]>([])
  const [applications, setApplications] = useState<BusinessApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'listings' | 'applications' | 'analytics'>('listings')

  /**
   * AUTHENTICATION & ROLE CHECK
   * 
   * This effect runs when the component mounts and when auth state changes.
   * It ensures only authenticated business users can access this page.
   * 
   * Debug logging helps troubleshoot role assignment issues.
   */
  useEffect(() => {
    console.log('MyBusiness: Auth state:', { role: auth.role, email: auth.email, userId: auth.userId, isAuthed: auth.isAuthed })
    
    if (!auth.isAuthed) {
      setMessage('Please sign in to access this page.')
      setLoading(false)
      return
    }

    if (auth.role !== 'business') {
      setMessage(`This page is only available for business accounts. Your current role: ${auth.role || 'none'}`)
      setLoading(false)
      return
    }
    loadBusinessData()
  }, [auth.userId, auth.role, auth.isAuthed])

  /**
   * LOAD BUSINESS DATA
   * 
   * Fetches two types of data for the business user:
   * 1. Active Listings - From 'providers' table where owner_user_id matches current user
   * 2. Applications - From 'business_applications' table where email matches current user
   * 
   * This separation allows businesses to:
   * - Track applications they've submitted (even before account creation)
   * - Manage listings they own (after admin approval)
   * - Request free listings from existing applications
   */
  /**
   * CRITICAL DEBUG: Load business data with extensive logging
   * 
   * The issue is that approved business applications aren't showing as listings.
   * This happens because:
   * 1. Admin approves application but doesn't create provider with owner_user_id
   * 2. My Business page only shows providers where owner_user_id = current user
   * 3. The link between application approval and provider creation is broken
   * 
   * This function adds debug logging to see exactly what's in the database.
   */
  const loadBusinessData = async () => {
    if (!auth.userId) {
      console.log('[MyBusiness] No userId, cannot load data')
      return
    }
    
    setLoading(true)
    try {
      console.log('[MyBusiness] Loading data for userId:', auth.userId, 'email:', auth.email)
      
      // Load business listings owned by user from providers table
      const { data: listingsData, error: listingsError } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Providers query result:', {
        error: listingsError,
        count: listingsData?.length || 0,
        data: listingsData
      })

      if (listingsError) throw listingsError

      // ALSO check for providers by email (in case admin didn't set owner_user_id)
      const { data: emailListingsData, error: emailListingsError } = await supabase
        .from('providers')
        .select('*')
        .eq('email', auth.email)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Providers by email query result:', {
        error: emailListingsError,
        count: emailListingsData?.length || 0,
        data: emailListingsData
      })

      // Load business applications by email from business_applications table
      const { data: appsData, error: appsError } = await supabase
        .from('business_applications')
        .select('*')
        .eq('email', auth.email)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Applications query result:', {
        error: appsError,
        count: appsData?.length || 0,
        data: appsData
      })

      if (appsError) throw appsError

      // Combine listings from both queries (owned and by email)
      const allListings = [
        ...(listingsData || []),
        ...(emailListingsData || []).filter(item => 
          !listingsData?.some(owned => owned.id === item.id)
        )
      ]

      setListings((allListings as BusinessListing[]) || [])
      setApplications((appsData as BusinessApplication[]) || [])
      
      console.log('[MyBusiness] Final state:', {
        listings: allListings.length,
        applications: appsData?.length || 0
      })
      
    } catch (error: any) {
      console.error('[MyBusiness] Error loading business data:', error)
      setMessage(`Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * REQUEST FREE LISTING FROM APPLICATION
   * 
   * This function allows business users to convert their submitted applications
   * into free listing requests. It creates an entry in 'provider_change_requests'
   * table with type 'create_free_listing' for admin review.
   * 
   * Flow:
   * 1. User submits business application (via /business page)
   * 2. User creates account and goes to My Business page
   * 3. User sees their applications and clicks "Request Free Listing"
   * 4. This creates a change request for admin to review
   * 5. Admin can approve and create the actual provider listing
   */
  const requestFreeListingFromApp = async (appId: string) => {
    try {
      setMessage('Creating free listing request...')
      
      const app = applications.find(a => a.id === appId)
      if (!app) throw new Error('Application not found')

      // Create a provider change request for admin to review
      // This uses the existing admin workflow for approving new listings
      const { error } = await supabase
        .from('provider_change_requests')
        .insert([{
          provider_id: null, // Will be created by admin
          owner_user_id: auth.userId,
          type: 'create_free_listing',
          changes: {
            business_name: app.business_name,
            category: app.category,
            phone: app.phone,
            email: app.email,
            tier: 'free',
            source_application_id: appId
          },
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Free listing request submitted! We\'ll review and approve it shortly.')
      loadBusinessData() // Refresh data to show updated state
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  /**
   * UPGRADE TO FEATURED TIER
   * 
   * This function allows business owners to request an upgrade from free to featured tier.
   * It creates a change request for admin review and payment processing.
   * 
   * Featured tier includes:
   * - Multiple images
   * - Social media links  
   * - Google Maps integration
   * - Booking system
   * - Priority placement
   * - Enhanced description
   */
  const upgradeToFeatured = async (listingId: string) => {
    try {
      setMessage('Requesting featured upgrade...')
      
      // Create upgrade request for admin to review and process payment
      const { error } = await supabase
        .from('provider_change_requests')
        .insert([{
          provider_id: listingId,
          owner_user_id: auth.userId,
          type: 'feature_request',
          changes: {
            tier: 'featured',
            upgrade_reason: 'User requested featured upgrade'
          },
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Featured upgrade request submitted! We\'ll contact you about payment and setup.')
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  if (auth.role !== 'business') {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-4xl">
          <div className="rounded-2xl border border-neutral-100 p-6 bg-white">
            <h1 className="text-xl font-semibold">Access Restricted</h1>
            <p className="mt-2 text-neutral-600">This page is only available for business accounts.</p>
            <Link to="/account" className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-4 py-2">
              Back to Account
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-4xl">
          <div className="rounded-2xl border border-neutral-100 p-6 bg-white">
            <div className="animate-pulse">
              <div className="h-6 bg-neutral-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">My Business</h1>
          <p className="text-neutral-600">Manage your business listings and applications</p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* DEBUG INFO - Remove after fixing */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs">
          <div className="font-semibold mb-2">Debug Info:</div>
          <div>Auth State: isAuthed={String(auth.isAuthed)}, loading={String(auth.loading)}</div>
          <div>User: {auth.email} (Role: {auth.role || 'none'})</div>
          <div>User ID: {auth.userId}</div>
          <div>Listings Found: {listings.length}</div>
          <div>Applications Found: {applications.length}</div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 rounded-xl bg-neutral-100 p-1">
            {[
              { key: 'listings', label: 'Active Listings', count: listings.length },
              { key: 'applications', label: 'Applications', count: applications.length },
              { key: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
                {('count' in tab) && tab.count! > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Active Listings</h3>
                <p className="mt-2 text-neutral-600">You don't have any active business listings yet.</p>
                <Link 
                  to="/business#apply" 
                  className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
                >
                  Apply for Business Listing
                </Link>
              </div>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-neutral-100 p-6 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{listing.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          listing.tier === 'featured' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {listing.tier === 'featured' ? '⭐ Featured' : '📋 Free'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          listing.status === 'approved' 
                            ? 'bg-green-100 text-green-800'
                            : listing.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {listing.status || 'pending'}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">{listing.category_key}</p>
                      <p className="text-sm text-neutral-600">{listing.email} • {listing.phone}</p>
                      {listing.address && (
                        <p className="text-sm text-neutral-600">{listing.address}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {listing.tier !== 'featured' && (
                        <button
                          onClick={() => upgradeToFeatured(listing.id)}
                          className="rounded-full bg-yellow-50 text-yellow-700 px-3 py-1.5 text-xs border border-yellow-200 hover:bg-yellow-100"
                        >
                          Upgrade to Featured
                        </button>
                      )}
                      <button className="rounded-full bg-neutral-100 text-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-200">
                        Edit Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Applications</h3>
                <p className="mt-2 text-neutral-600">You haven't submitted any business applications yet.</p>
                <Link 
                  to="/business#apply" 
                  className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
                >
                  Apply for Business Listing
                </Link>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-neutral-100 p-6 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{app.business_name}</h3>
                      <p className="text-sm text-neutral-600 mt-1">{app.category}</p>
                      <p className="text-sm text-neutral-600">{app.email} • {app.phone}</p>
                      <p className="text-sm text-neutral-500 mt-2">
                        Applied: {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => requestFreeListingFromApp(app.id)}
                        className="rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-xs border border-green-200 hover:bg-green-100"
                      >
                        Request Free Listing
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
            <h3 className="text-lg font-medium text-neutral-900">Analytics Coming Soon</h3>
            <p className="mt-2 text-neutral-600">
              View your business listing performance, customer inquiries, and booking statistics.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
