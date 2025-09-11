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
  is_member: boolean | null  // This indicates if the provider is featured (admin-approved)
  published: boolean | null
  created_at: string
  updated_at: string
  // Additional fields for enhanced business management
  description: string | null
  social_links: Record<string, string> | null
  google_maps_url: string | null
  booking_enabled: boolean | null
  business_hours: Record<string, string> | null
  service_areas: string[] | null
  specialties: string[] | null
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

// Type definition for job posts in the provider_job_posts table
type JobPost = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description: string | null
  apply_url: string | null
  salary_range: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  decided_at: string | null
}

export default function MyBusinessPage() {
  const auth = useAuth()
  const [listings, setListings] = useState<BusinessListing[]>([])
  const [applications, setApplications] = useState<BusinessApplication[]>([])
  const [jobPosts, setJobPosts] = useState<JobPost[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'listings' | 'applications' | 'jobs' | 'analytics'>('listings')
  const [editingListing, setEditingListing] = useState<BusinessListing | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)

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
   * Fetches comprehensive business data for the business user:
   * 1. Active Listings - From 'providers' table where owner_user_id matches current user
   * 2. Applications - From 'business_applications' table where email matches current user
   * 3. Job Posts - From 'provider_job_posts' table where owner_user_id matches current user
   * 
   * This comprehensive data allows businesses to:
   * - Manage their business listings (create, edit, update)
   * - Track applications they've submitted
   * - Manage job postings for their business
   * - Request upgrades from free to featured tier
   */
  const loadBusinessData = async () => {
    if (!auth.userId) {
      console.log('[MyBusiness] No userId, cannot load data')
      return
    }
    
    setLoading(true)
    try {
      console.log('[MyBusiness] Loading comprehensive business data for userId:', auth.userId, 'email:', auth.email)
      
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

      // Load job posts for all user's providers
      const providerIds = [
        ...(listingsData || []).map(l => l.id),
        ...(emailListingsData || []).map(l => l.id)
      ]
      
      let jobPostsData: JobPost[] = []
      if (providerIds.length > 0) {
        const { data: jobsData, error: jobsError } = await supabase
          .from('provider_job_posts')
          .select('*')
          .in('provider_id', providerIds)
          .order('created_at', { ascending: false })

        console.log('[MyBusiness] Job posts query result:', {
          error: jobsError,
          count: jobsData?.length || 0,
          data: jobsData
        })

        if (jobsError) {
          console.warn('[MyBusiness] Job posts error (non-critical):', jobsError)
        } else {
          jobPostsData = (jobsData as JobPost[]) || []
        }
      }

      // Combine listings from both queries (owned and by email)
      const allListings = [
        ...(listingsData || []),
        ...(emailListingsData || []).filter(item => 
          !listingsData?.some(owned => owned.id === item.id)
        )
      ]

      setListings((allListings as BusinessListing[]) || [])
      setApplications((appsData as BusinessApplication[]) || [])
      setJobPosts(jobPostsData)
      
      console.log('[MyBusiness] Final comprehensive state:', {
        listings: allListings.length,
        applications: appsData?.length || 0,
        jobPosts: jobPostsData.length
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
   * Featured tier pricing:
   * - $1/day billed annually ($365/year)
   * - $1.50/day billed monthly ($45/month)
   * 
   * Featured tier benefits:
   * - Priority placement in search results (appears at top)
   * - Enhanced business description
   * - Multiple images support
   * - Social media links integration
   * - Google Maps integration
   * - Booking system integration
   * - Analytics and insights
   * - Premium customer support
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
            upgrade_reason: 'User requested featured upgrade',
            pricing_options: {
              annual: '$1/day ($365/year)',
              monthly: '$1.50/day ($45/month)'
            },
            benefits: [
              'Priority placement in search results',
              'Enhanced business description',
              'Multiple images support',
              'Social media links integration',
              'Google Maps integration',
              'Booking system integration',
              'Analytics and insights',
              'Premium customer support'
            ]
          },
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. Featured pricing: $1/day annually or $1.50/day monthly.')
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  /**
   * CREATE NEW BUSINESS LISTING
   * 
   * This function allows business owners to create new business listings directly.
   * It creates a provider entry in the database with the user as the owner.
   * 
   * Fields included:
   * - Basic info: name, category, phone, email, website, address
   * - Business details: description, tags, specialties
   * - Social media: social_links object
   * - Service areas and business hours
   * - Images and booking settings
   */
  const createBusinessListing = async (listingData: Partial<BusinessListing>) => {
    try {
      setMessage('Creating business listing...')
      
      const { error } = await supabase
        .from('providers')
        .insert([{
          name: listingData.name,
          category_key: listingData.category_key,
          phone: listingData.phone,
          email: listingData.email || auth.email,
          website: listingData.website,
          address: listingData.address,
          description: listingData.description,
          tags: listingData.tags || [],
          specialties: listingData.specialties || [],
          social_links: listingData.social_links || {},
          business_hours: listingData.business_hours || {},
          service_areas: listingData.service_areas || [],
          images: listingData.images || [],
          booking_enabled: listingData.booking_enabled || false,
          google_maps_url: listingData.google_maps_url,
          owner_user_id: auth.userId,
          published: false, // Requires admin approval
          is_member: false  // Free tier by default
        }])

      if (error) throw error

      setMessage('Business listing created! It will be reviewed by our admin team.')
      loadBusinessData() // Refresh data to show new listing
      setShowCreateForm(false)
    } catch (error: any) {
      setMessage(`Error creating listing: ${error.message}`)
    }
  }

  /**
   * UPDATE BUSINESS LISTING
   * 
   * This function allows business owners to update their existing business listings.
   * It updates the provider entry in the database with new information.
   * 
   * Note: Some changes may require admin approval depending on the field.
   */
  const updateBusinessListing = async (listingId: string, updates: Partial<BusinessListing>) => {
    try {
      setMessage('Updating business listing...')
      
      const { error } = await supabase
        .from('providers')
        .update({
          name: updates.name,
          category_key: updates.category_key,
          phone: updates.phone,
          email: updates.email,
          website: updates.website,
          address: updates.address,
          description: updates.description,
          tags: updates.tags,
          specialties: updates.specialties,
          social_links: updates.social_links,
          business_hours: updates.business_hours,
          service_areas: updates.service_areas,
          images: updates.images,
          booking_enabled: updates.booking_enabled,
          google_maps_url: updates.google_maps_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId)
        .eq('owner_user_id', auth.userId) // Ensure user owns this listing

      if (error) throw error

      setMessage('Business listing updated successfully!')
      loadBusinessData() // Refresh data to show updates
      setEditingListing(null)
    } catch (error: any) {
      setMessage(`Error updating listing: ${error.message}`)
    }
  }

  /**
   * CREATE JOB POST
   * 
   * This function allows business owners to create job postings for their business.
   * It creates an entry in the provider_job_posts table for admin review.
   */
  const createJobPost = async (providerId: string, jobData: {
    title: string
    description?: string
    apply_url?: string
    salary_range?: string
  }) => {
    try {
      setMessage('Creating job post...')
      
      const { error } = await supabase
        .from('provider_job_posts')
        .insert([{
          provider_id: providerId,
          owner_user_id: auth.userId,
          title: jobData.title,
          description: jobData.description,
          apply_url: jobData.apply_url,
          salary_range: jobData.salary_range,
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Job post created! It will be reviewed by our admin team.')
      loadBusinessData() // Refresh data to show new job post
    } catch (error: any) {
      setMessage(`Error creating job post: ${error.message}`)
    }
  }

  /**
   * DELETE BUSINESS LISTING
   * 
   * This function allows business owners to delete their business listings.
   * It removes the provider entry from the database.
   */
  const deleteBusinessListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this business listing? This action cannot be undone.')) {
      return
    }

    try {
      setMessage('Deleting business listing...')
      
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', listingId)
        .eq('owner_user_id', auth.userId) // Ensure user owns this listing

      if (error) throw error

      setMessage('Business listing deleted successfully!')
      loadBusinessData() // Refresh data to remove deleted listing
    } catch (error: any) {
      setMessage(`Error deleting listing: ${error.message}`)
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
              { key: 'listings', label: 'Business Listings', count: listings.length },
              { key: 'applications', label: 'Applications', count: applications.length },
              { key: 'jobs', label: 'Job Posts', count: jobPosts.length },
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

        {/* Business Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your Business Listings</h2>
                <p className="text-sm text-neutral-600">Manage your business listings and details</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
              >
                + Create New Listing
              </button>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Business Listings</h3>
                <p className="mt-2 text-neutral-600">You don't have any business listings yet. Create your first one to get started!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-neutral-100 p-6 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{listing.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          listing.is_member 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {listing.is_member ? '⭐ Featured' : '📋 Free'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          listing.published 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {listing.published ? 'Published' : 'Pending Review'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-sm text-neutral-600"><strong>Category:</strong> {listing.category_key}</p>
                          <p className="text-sm text-neutral-600"><strong>Email:</strong> {listing.email}</p>
                          <p className="text-sm text-neutral-600"><strong>Phone:</strong> {listing.phone}</p>
                          {listing.website && (
                            <p className="text-sm text-neutral-600"><strong>Website:</strong> 
                              <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                {listing.website}
                              </a>
                            </p>
                          )}
                        </div>
                        <div>
                          {listing.address && (
                            <p className="text-sm text-neutral-600"><strong>Address:</strong> {listing.address}</p>
                          )}
                          {listing.description && (
                            <p className="text-sm text-neutral-600"><strong>Description:</strong> {listing.description}</p>
                          )}
                          {listing.tags && listing.tags.length > 0 && (
                            <p className="text-sm text-neutral-600"><strong>Tags:</strong> {listing.tags.join(', ')}</p>
                          )}
                        </div>
                      </div>

                      {/* Social Links */}
                      {listing.social_links && Object.keys(listing.social_links).length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-neutral-700 mb-1">Social Media:</p>
                          <div className="flex gap-2">
                            {Object.entries(listing.social_links).map(([platform, url]) => (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {platform}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Community Visibility Info */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">What Community Users See:</h4>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p>• <strong>Basic Info:</strong> {listing.name}, {listing.category_key}, {listing.phone}</p>
                          <p>• <strong>Contact:</strong> {listing.email} {listing.website && `• ${listing.website}`}</p>
                          {listing.address && <p>• <strong>Location:</strong> {listing.address}</p>}
                          {listing.description && <p>• <strong>Description:</strong> {listing.description.substring(0, 100)}{listing.description.length > 100 ? '...' : ''}</p>}
                          {listing.tags && listing.tags.length > 0 && <p>• <strong>Tags:</strong> {listing.tags.join(', ')}</p>}
                          {listing.is_member && <p>• <strong>Featured:</strong> Appears at top of search results</p>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {/* Featured Status and Pricing Info */}
                      {listing.is_member ? (
                        <div className="text-center">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                            ⭐ Featured Listing
                          </span>
                          <p className="text-xs text-neutral-500">Priority placement in search results</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <button
                            onClick={() => upgradeToFeatured(listing.id)}
                            className="rounded-full bg-yellow-50 text-yellow-700 px-3 py-1.5 text-xs border border-yellow-200 hover:bg-yellow-100 mb-2"
                          >
                            Upgrade to Featured
                          </button>
                          <p className="text-xs text-neutral-500">
                            $1/day annually or $1.50/day monthly
                          </p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <button
                        onClick={() => {
                          console.log('[MyBusiness] Edit button clicked for listing:', listing.id, listing.name)
                          setEditingListing(listing)
                        }}
                        className="rounded-full bg-neutral-100 text-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-200"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => deleteBusinessListing(listing.id)}
                        className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs border border-red-200 hover:bg-red-100"
                      >
                        Delete
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

        {/* Job Posts Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Job Posts</h2>
                <p className="text-sm text-neutral-600">Manage job postings for your business</p>
              </div>
              {listings.length > 0 && (
                <button
                  onClick={() => setShowJobForm(true)}
                  className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                >
                  + Create Job Post
                </button>
              )}
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">Create a Business Listing First</h3>
                <p className="mt-2 text-neutral-600">You need to create a business listing before you can post jobs.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
                >
                  Create Business Listing
                </button>
              </div>
            ) : jobPosts.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Job Posts</h3>
                <p className="mt-2 text-neutral-600">You haven't created any job posts yet.</p>
                <button
                  onClick={() => setShowJobForm(true)}
                  className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
                >
                  Create Your First Job Post
                </button>
              </div>
            ) : (
              jobPosts.map((job) => (
                <div key={job.id} className="rounded-2xl border border-neutral-100 p-6 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          job.status === 'approved' 
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : job.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      
                      {job.description && (
                        <p className="text-sm text-neutral-600 mb-2">{job.description}</p>
                      )}
                      
                      <div className="flex gap-4 text-sm text-neutral-600">
                        {job.salary_range && (
                          <span><strong>Salary:</strong> {job.salary_range}</span>
                        )}
                        <span><strong>Posted:</strong> {new Date(job.created_at).toLocaleDateString()}</span>
                        {job.decided_at && (
                          <span><strong>Decided:</strong> {new Date(job.decided_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      {job.apply_url && (
                        <div className="mt-2">
                          <a
                            href={job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Apply Here →
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button className="rounded-full bg-neutral-100 text-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-200">
                        Edit
                      </button>
                      <button className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs border border-red-200 hover:bg-red-100">
                        Delete
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

        {/* Business Listing Creation/Edit Modal */}
        {(showCreateForm || editingListing) && (
          <BusinessListingForm
            listing={editingListing}
            onSave={editingListing ? 
              (updates) => {
                console.log('[MyBusiness] Updating listing:', editingListing.id, updates)
                updateBusinessListing(editingListing.id, updates)
              } :
              (data) => {
                console.log('[MyBusiness] Creating listing:', data)
                createBusinessListing(data)
              }
            }
            onCancel={() => {
              console.log('[MyBusiness] Form cancelled')
              setShowCreateForm(false)
              setEditingListing(null)
            }}
          />
        )}

        {/* Job Post Creation Modal */}
        {showJobForm && (
          <JobPostForm
            listings={listings}
            onSave={(providerId, jobData) => {
              createJobPost(providerId, jobData)
              setShowJobForm(false)
            }}
            onCancel={() => setShowJobForm(false)}
          />
        )}
      </div>
    </section>
  )
}

/**
 * BUSINESS LISTING FORM COMPONENT
 * 
 * This component provides a comprehensive form for creating and editing business listings.
 * It includes all the fields needed for both free and featured business listings.
 * 
 * Features:
 * - Basic business information (name, category, contact details)
 * - Business description and tags
 * - Social media links
 * - Service areas and specialties
 * - Business hours
 * - Image management
 * - Google Maps integration
 * - Booking system settings (for featured listings)
 */
function BusinessListingForm({ 
  listing, 
  onSave, 
  onCancel 
}: { 
  listing: BusinessListing | null
  onSave: (data: Partial<BusinessListing>) => void
  onCancel: () => void 
}) {
  console.log('[BusinessListingForm] Rendering with listing:', listing?.id, listing?.name)
  
  const [formData, setFormData] = useState<Partial<BusinessListing>>({
    name: listing?.name || '',
    category_key: listing?.category_key || '',
    phone: listing?.phone || '',
    email: listing?.email || '',
    website: listing?.website || '',
    address: listing?.address || '',
    description: listing?.description || '',
    tags: listing?.tags || [],
    specialties: listing?.specialties || [],
    social_links: listing?.social_links || {},
    business_hours: listing?.business_hours || {},
    service_areas: listing?.service_areas || [],
    images: listing?.images || [],
    booking_enabled: listing?.booking_enabled || false,
    google_maps_url: listing?.google_maps_url || ''
  })

  const [newTag, setNewTag] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newServiceArea, setNewServiceArea] = useState('')
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUrl, setNewSocialUrl] = useState('')

  const categories = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[BusinessListingForm] Form submitted with data:', formData)
    onSave(formData)
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties?.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialtyToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties?.filter(specialty => specialty !== specialtyToRemove) || []
    }))
  }

  const addServiceArea = () => {
    if (newServiceArea.trim() && !formData.service_areas?.includes(newServiceArea.trim())) {
      setFormData(prev => ({
        ...prev,
        service_areas: [...(prev.service_areas || []), newServiceArea.trim()]
      }))
      setNewServiceArea('')
    }
  }

  const removeServiceArea = (areaToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas?.filter(area => area !== areaToRemove) || []
    }))
  }

  const addSocialLink = () => {
    if (newSocialPlatform.trim() && newSocialUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [newSocialPlatform.trim()]: newSocialUrl.trim()
        }
      }))
      setNewSocialPlatform('')
      setNewSocialUrl('')
    }
  }

  const removeSocialLink = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: Object.fromEntries(
        Object.entries(prev.social_links || {}).filter(([key]) => key !== platform)
      )
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {listing ? 'Edit Business Listing' : 'Create New Business Listing'}
            </h2>
            <button
              onClick={onCancel}
              className="text-neutral-500 hover:text-neutral-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category_key || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_key: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="123 Main St, Bonita, CA"
                />
              </div>
            </div>

            {/* Business Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Business Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="Tell customers about your business..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Specialties
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Add a specialty..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specialties?.map(specialty => (
                  <span
                    key={specialty}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Service Areas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newServiceArea}
                  onChange={(e) => setNewServiceArea(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Add a service area..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                />
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.service_areas?.map(area => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => removeServiceArea(area)}
                      className="text-green-500 hover:text-green-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Social Media Links */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Social Media Links
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={newSocialPlatform}
                  onChange={(e) => setNewSocialPlatform(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Platform (e.g., Facebook)"
                />
                <input
                  type="url"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="URL"
                />
                <button
                  type="button"
                  onClick={addSocialLink}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {Object.entries(formData.social_links || {}).map(([platform, url]) => (
                  <div key={platform} className="flex items-center justify-between bg-neutral-50 p-2 rounded">
                    <span className="text-sm">
                      <strong>{platform}:</strong> {url}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSocialLink(platform)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Community Visibility Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Community User Visibility</h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>Free Listing (Always Visible):</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Business name, category, phone, email</li>
                  <li>• Website and address</li>
                  <li>• Basic business description (up to 200 characters)</li>
                  <li>• Basic tags and specialties</li>
                </ul>
                <p className="mt-2"><strong>Featured Listing (Additional Benefits):</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Priority placement</strong> - appears at top of search results</li>
                  <li>• <strong>Enhanced description</strong> - up to 500 characters</li>
                  <li>• <strong>Social media links</strong> - Facebook, Instagram, etc.</li>
                  <li>• <strong>Google Maps integration</strong> - interactive location</li>
                  <li>• <strong>Multiple images</strong> - showcase your business</li>
                  <li>• <strong>Booking system</strong> - direct appointment scheduling</li>
                  <li>• <strong>Analytics</strong> - view customer interactions</li>
                </ul>
                <p className="mt-2 text-blue-600"><strong>Featured Pricing:</strong> $1/day annually ($365/year) or $1.50/day monthly ($45/month)</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-neutral-900 text-white px-6 py-2 rounded-lg hover:bg-neutral-800"
              >
                {listing ? 'Update Listing' : 'Create Listing'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * JOB POST FORM COMPONENT
 * 
 * This component provides a form for creating job posts for business listings.
 * It allows business owners to create job postings that will be reviewed by admin.
 * 
 * Features:
 * - Select business listing to post job for
 * - Job title and description
 * - Application URL and salary range
 * - Admin approval workflow
 */
function JobPostForm({ 
  listings, 
  onSave, 
  onCancel 
}: { 
  listings: BusinessListing[]
  onSave: (providerId: string, jobData: {
    title: string
    description?: string
    apply_url?: string
    salary_range?: string
  }) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState({
    provider_id: '',
    title: '',
    description: '',
    apply_url: '',
    salary_range: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.provider_id || !formData.title) return
    
    onSave(formData.provider_id, {
      title: formData.title,
      description: formData.description || undefined,
      apply_url: formData.apply_url || undefined,
      salary_range: formData.salary_range || undefined
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create Job Post</h2>
            <button
              onClick={onCancel}
              className="text-neutral-500 hover:text-neutral-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Listing Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Business Listing *
              </label>
              <select
                value={formData.provider_id}
                onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                required
              >
                <option value="">Select a business listing</option>
                {listings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name} ({listing.category_key})
                  </option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="e.g., Marketing Manager, Sales Associate"
                required
              />
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Job Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="Describe the role, responsibilities, and requirements..."
              />
            </div>

            {/* Application URL */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Application URL
              </label>
              <input
                type="url"
                value={formData.apply_url}
                onChange={(e) => setFormData(prev => ({ ...prev, apply_url: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="https://example.com/apply"
              />
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Salary Range
              </label>
              <input
                type="text"
                value={formData.salary_range}
                onChange={(e) => setFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="e.g., $50,000 - $70,000, Competitive, Negotiable"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-neutral-900 text-white px-6 py-2 rounded-lg hover:bg-neutral-800"
              >
                Create Job Post
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
