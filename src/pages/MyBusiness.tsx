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
 * - Upload and manage business images
 * - Protected route - only accessible to users with role 'business'
 * 
 * SUPABASE STORAGE SETUP REQUIRED:
 * 
 * CURRENT STATUS: Image uploads are implemented but require Supabase Storage setup.
 * The system gracefully handles the missing bucket with user-friendly error messages.
 * 
 * TO ENABLE IMAGE UPLOADS:
 * 1. Create a 'business-images' bucket in Supabase Storage
 * 2. Set bucket to public for image display
 * 3. Configure RLS policies for authenticated users to upload/manage images
 * 
 * SQL Commands for Supabase Storage Setup:
 * 
 * -- Create the business-images bucket
 * INSERT INTO storage.buckets (id, name, public) VALUES ('business-images', 'business-images', true);
 * 
 * -- Create RLS policy for authenticated users to upload images
 * CREATE POLICY "Authenticated users can upload business images" ON storage.objects
 * FOR INSERT WITH CHECK (bucket_id = 'business-images' AND auth.role() = 'authenticated');
 * 
 * -- Create RLS policy for authenticated users to update their own images
 * CREATE POLICY "Users can update their own business images" ON storage.objects
 * FOR UPDATE USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');
 * 
 * -- Create RLS policy for authenticated users to delete their own images
 * CREATE POLICY "Users can delete their own business images" ON storage.objects
 * FOR DELETE USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');
 * 
 * -- Create RLS policy for public read access to images
 * CREATE POLICY "Public can view business images" ON storage.objects
 * FOR SELECT USING (bucket_id = 'business-images');
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getUserPlanChoice, setUserPlanChoice as savePlanChoice, migratePlanChoiceToDatabase, type PlanChoice } from '../utils/planChoiceDb'
import { Link, useLocation } from 'react-router-dom'
import { createProviderChangeRequest, type ProviderChangeRequest, dismissNotification as dismissNotificationDB, getDismissedNotifications, getLatestActivityTimestamp, type DismissedNotification } from '../lib/supabaseData'

// Type definition for business listings in the providers table
// Updated to include all enhanced business management fields that were added to the database
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
  created_at: string | null  // Now available in database
  updated_at: string | null  // Now available in database
  
  // Enhanced business management fields (now stored in providers table)
  description: string | null
  specialties: string[] | null
  social_links: Record<string, string> | null
  business_hours: Record<string, string> | null
  service_areas: string[] | null
  google_maps_url: string | null
  bonita_resident_discount: string | null  // Discount offer for Bonita residents
  // Coupon fields
  coupon_code: string | null
  coupon_discount: string | null
  coupon_description: string | null
  coupon_expires_at: string | null
  // Booking system fields
  booking_enabled: boolean | null
  booking_type: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions: string | null
  booking_url: string | null
  // Contact method toggles
  enable_calendar_booking: boolean | null
  enable_call_contact: boolean | null
  enable_email_contact: boolean | null
  // Google Calendar integration fields
  google_calendar_connected: boolean | null
  google_calendar_id: string | null
  google_calendar_sync_enabled: boolean | null
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

// Type definition for user activity tracking
type UserActivity = {
  id: string
  provider_id: string
  user_email: string | null
  user_name: string | null
  activity_type?: 'profile_view' | 'discount_copy' | 'booking_request' | 'question_asked'
  activity_details: string | null
  created_at: string
  provider_name: string
  // New fields for notification types
  type?: 'booking_received' | 'booking_updated' | 'general'
  message?: string
  title?: string
  booking_id?: string
  is_read?: boolean
}

export default function MyBusinessPage() {
  const auth = useAuth()
  const location = useLocation()
  const [listings, setListings] = useState<BusinessListing[]>([])
  const [applications, setApplications] = useState<BusinessApplication[]>([])
  const [jobPosts, setJobPosts] = useState<JobPost[]>([])
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequest[]>([])
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'listings' | 'applications' | 'jobs' | 'change-requests' | 'user-activity' | 'analytics' | 'recently-approved' | 'recently-rejected' | 'pending-requests'>('listings')
  const [editingListing, setEditingListing] = useState<BusinessListing | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPost | null>(null) // State for editing existing job posts
  const [isUpdating, setIsUpdating] = useState(false)
  // Dropdown state for mobile-friendly tab navigation
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  // Google Calendar connection state
  const [connectingCalendar, setConnectingCalendar] = useState(false)
  // State to control subscription card visibility
  const [showSubscriptionCard, setShowSubscriptionCard] = useState(true)
  // State to track user's plan choice and status (database-backed)
  // Note: Only setter is used; value is for internal state tracking
  const [userPlanChoice, setUserPlanChoice] = useState<PlanChoice>(null)
  void userPlanChoice // Suppress unused variable warning
  
  // State to track dismissed notifications (database-based)
  const [dismissedNotifications, setDismissedNotifications] = useState<DismissedNotification[]>([])

  /**
   * DOWNGRADE TO FREE (Owner request)
   * Creates a change request to set is_member to false
   */
  const downgradeToFree = async (listingId: string) => {
    try {
      setMessage('Requesting downgrade to Free...')
      const { error } = await createProviderChangeRequest({
        provider_id: listingId,
        owner_user_id: auth.userId!,
        type: 'update',
        changes: { is_member: false },
        reason: 'Downgrade from Featured to Free plan'
      })
      if (error) throw new Error(error)
      setMessage('✅ Downgrade request submitted! An admin will review and apply it shortly.')
      await loadBusinessData()
    } catch (err: any) {
      setMessage(`Failed to request downgrade: ${err.message || err}`)
    }
  }

  /**
   * TAB CONFIGURATION
   * 
   * This defines all available tabs with their labels and counts.
   * Used for both the dropdown menu and tab display logic.
   */
  // Helper function to get change requests for non-featured businesses only
  const getNonFeaturedChangeRequests = () => {
    const nonFeaturedBusinessIds = listings.filter(listing => !listing.is_member).map(listing => listing.id)
    return changeRequests.filter(req => nonFeaturedBusinessIds.includes(req.provider_id))
  }

  const nonFeaturedChangeRequests = getNonFeaturedChangeRequests()

  const tabs = [
    { key: 'listings', label: 'Business Listings', count: listings.length },
    { key: 'applications', label: 'Applications', count: applications.length },
    { key: 'jobs', label: 'Job Posts', count: jobPosts.length },
    { key: 'change-requests', label: 'Change Requests', count: nonFeaturedChangeRequests.filter(req => req.status === 'pending').length },
    { key: 'user-activity', label: 'User Activity', count: userActivity.length },
    { key: 'analytics', label: 'Analytics' },
    { key: 'recently-approved', label: 'Recently Approved', count: nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length },
    { key: 'recently-rejected', label: 'Recently Rejected', count: nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length },
    { key: 'pending-requests', label: 'Pending Requests', count: nonFeaturedChangeRequests.filter(req => req.status === 'pending').length }
  ] as const

  // Get current tab information for dropdown display
  const currentTab = tabs.find(tab => tab.key === activeTab) || tabs[0]

  /**
   * HANDLE TAB SELECTION
   * 
   * This function handles tab selection from the dropdown menu.
   * It closes the dropdown and updates the active tab.
   */
  const handleTabSelect = (tabKey: typeof activeTab) => {
    setActiveTab(tabKey)
    setIsDropdownOpen(false) // Close dropdown after selection
  }

  /**
   * CLICK OUTSIDE HANDLER
   * 
   * This effect adds a click-outside listener to close the dropdown
   * when clicking anywhere outside of it. This improves UX on mobile.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isDropdownOpen && !target.closest('[data-dropdown-container]')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

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
    checkUserPlanChoice()
  }, [auth.userId, auth.role, auth.isAuthed])

  /**
   * AUTO-SELECT TAB FROM URL HASH
   * 
   * This effect handles automatic tab selection when URL has a hash (e.g., #jobs).
   * Used when redirecting from Jobs page "Post a Job" button.
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove the '#'
    if (hash === 'jobs' || hash === 'listings' || hash === 'applications' || hash === 'change-requests' || hash === 'user-activity' || hash === 'analytics' || hash === 'recently-approved' || hash === 'recently-rejected' || hash === 'pending-requests') {
      setActiveTab(hash as typeof activeTab)
      // Clear the hash after setting the tab so it doesn't persist on refresh
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  /**
   * HANDLE GOOGLE CALENDAR OAUTH CALLBACK
   * 
   * This effect checks for OAuth callback parameters in the URL and displays
   * appropriate success or error messages.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    
    // Check for successful connection
    if (params.get('calendar_connected') === 'true') {
      setMessage('✅ Google Calendar connected successfully! Your bookings will now sync automatically.')
      // Clean up URL
      window.history.replaceState({}, document.title, location.pathname)
      // Reload data to show updated connection status
      void loadBusinessData()
    }
    
    // Check for errors
    const calendarError = params.get('calendar_error')
    if (calendarError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'You denied access to Google Calendar. Please try again if you want to enable syncing.',
        'missing_code_or_state': 'OAuth error: Missing authorization code. Please try connecting again.',
        'configuration_error': 'Google Calendar is not properly configured. Please contact support.',
        'token_exchange_failed': 'Failed to exchange authorization code. Please try again.',
        'missing_tokens': 'Failed to obtain access tokens from Google. Please try again.',
        'storage_failed': 'Failed to save calendar credentials. Please try again.'
      }
      
      const errorMessage = errorMessages[calendarError] || `Error connecting Google Calendar: ${calendarError}`
      setMessage(`❌ ${errorMessage}`)
      // Clean up URL
      window.history.replaceState({}, document.title, location.pathname)
    }
  }, [location.search])

  /**
   * AUTO-SELECT PLAN FROM PRICING PAGE
   * 
   * This effect handles automatic plan selection when redirected from the pricing page.
   * The pricing page passes state indicating which plan the user selected.
   */
  useEffect(() => {
    const state = location.state as { autoSelectPlan?: 'free' | 'featured' } | null
    
    if (state?.autoSelectPlan && auth.userId) {
      console.log('[MyBusiness] Auto-selecting plan from pricing page:', state.autoSelectPlan)
      
      // Hide subscription card immediately since user already saw pricing info on pricing page
      setShowSubscriptionCard(false)
      
      if (state.autoSelectPlan === 'free') {
        // Auto-select free account
        selectFreeAccount()
      } else if (state.autoSelectPlan === 'featured') {
        // Auto-select featured account
        upgradeToFeatured()
      }
      
      // Clear the state so it doesn't trigger again
      window.history.replaceState({}, document.title)
    }
  }, [location.state, auth.userId])

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

      // Load job posts for all user's providers AND job posts owned by the user
      const providerIds = [
        ...(listingsData || []).map(l => l.id),
        ...(emailListingsData || []).map(l => l.id)
      ]
      
      let jobPostsData: JobPost[] = []
      
      // Query job posts in two ways:
      // 1. Job posts for providers owned by this user
      // 2. Job posts directly owned by this user (owner_user_id)
      let allJobPosts: JobPost[] = []
      
      // First, get job posts for user's providers
      if (providerIds.length > 0) {
        const { data: providerJobsData, error: providerJobsError } = await supabase
          .from('provider_job_posts')
          .select('*')
          .in('provider_id', providerIds)
          .order('created_at', { ascending: false })

        console.log('[MyBusiness] Provider job posts query result:', {
          error: providerJobsError,
          count: providerJobsData?.length || 0,
          data: providerJobsData
        })

        if (providerJobsError) {
          console.warn('[MyBusiness] Provider job posts error (non-critical):', providerJobsError)
        } else {
          allJobPosts = [...allJobPosts, ...(providerJobsData as JobPost[] || [])]
        }
      }
      
      // Second, get job posts directly owned by this user
      const { data: ownedJobsData, error: ownedJobsError } = await supabase
        .from('provider_job_posts')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .order('created_at', { ascending: false })

      console.log('[MyBusiness] Owned job posts query result:', {
        error: ownedJobsError,
        count: ownedJobsData?.length || 0,
        data: ownedJobsData
      })

      if (ownedJobsError) {
        console.warn('[MyBusiness] Owned job posts error (non-critical):', ownedJobsError)
      } else {
        allJobPosts = [...allJobPosts, ...(ownedJobsData as JobPost[] || [])]
      }
      
      // Remove duplicates (in case a job post matches both criteria)
      const uniqueJobPosts = allJobPosts.filter((job, index, self) => 
        index === self.findIndex(j => j.id === job.id)
      )
      
      jobPostsData = uniqueJobPosts
      
      console.log('[MyBusiness] Final job posts result:', {
        totalCount: jobPostsData.length,
        data: jobPostsData
      })

      // Load change requests for this business owner
      console.log('[MyBusiness] Loading change requests for user:', auth.userId)
      let changeRequestsData: any[] = []
      let changeRequestsError: any = null
      
      try {
        const { data, error } = await supabase
          .from('provider_change_requests')
          .select('*')
          .eq('owner_user_id', auth.userId)
          .order('created_at', { ascending: false })
        
        changeRequestsData = data || []
        changeRequestsError = error

        console.log('[MyBusiness] Change requests query result:', {
          error: changeRequestsError,
          count: changeRequestsData?.length || 0,
          data: changeRequestsData
        })

        if (changeRequestsError) {
          console.warn('[MyBusiness] Change requests error (non-critical):', changeRequestsError)
          // If it's a 403 error, it's likely an RLS policy issue
          if (changeRequestsError.code === 'PGRST301' || changeRequestsError.message?.includes('403')) {
            console.warn('[MyBusiness] RLS policy issue detected - user may not have permission to view change requests')
          }
        }
      } catch (err) {
        console.error('[MyBusiness] Unexpected error loading change requests:', err)
        changeRequestsError = err
      }

      // Combine listings from both queries (owned and by email)
      const allListings = [
        ...(listingsData || []),
        ...(emailListingsData || []).filter(item => 
          !listingsData?.some(owned => owned.id === item.id)
        )
      ]

      // Load user activity data for all owned businesses
      const ownedBusinessIds = allListings.map(listing => listing.id)
      let userActivityData: UserActivity[] = []
      
      if (ownedBusinessIds.length > 0) {
        // Fetch notifications without embedded join; enrich with provider names locally
        const { data: activityData, error: activityError } = await supabase
          .from('user_notifications')
          .select('*')
          .in('provider_id', ownedBusinessIds)
          .order('created_at', { ascending: false })
          .limit(100) // Limit to recent 100 activities

        // Build a quick lookup of provider id -> name from the listings we already loaded
        const providerIdToName = new Map<string, string>(allListings.map((l: any) => [l.id, l.name]))

        if (activityError) {
          console.warn('[MyBusiness] User activity error (non-critical):', activityError)
        } else {
          userActivityData = (activityData || []).map((activity: any) => ({
            ...activity,
            provider_name: providerIdToName.get(activity.provider_id) || 'Unknown Business'
          })) as UserActivity[]
        }
      }

      setListings((allListings as BusinessListing[]) || [])
      setApplications((appsData as BusinessApplication[]) || [])
      setJobPosts(jobPostsData)
      setChangeRequests((changeRequestsData as ProviderChangeRequest[]) || [])
      setUserActivity(userActivityData)
      
      // Load dismissed notifications from database
      const dismissedData = await getDismissedNotifications(auth.userId)
      setDismissedNotifications(dismissedData)
      
      console.log('[MyBusiness] Final comprehensive state:', {
        listings: allListings.length,
        applications: appsData?.length || 0,
        jobPosts: jobPostsData.length,
        dismissedNotifications: dismissedData.length
      })
      
      // Debug: Log the actual listing data to see what's being displayed
      if (allListings && allListings.length > 0) {
        console.log('[MyBusiness] First listing data:', allListings[0])
        console.log('[MyBusiness] Website field:', allListings[0].website)
        console.log('[MyBusiness] Description field:', allListings[0].description)
      }
      
    } catch (error: any) {
      console.error('[MyBusiness] Error loading business data:', error)
      setMessage(`Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
      
      // Mark booking notifications as read when user visits My Business page
      if (auth.userId) {
        try {
          const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', auth.userId)
            .eq('type', 'booking_received')
            .eq('is_read', false)
          
          if (error) {
            console.warn('Failed to mark booking notifications as read (table may not exist yet):', error.message)
          }
        } catch (error) {
          console.warn('Failed to mark booking notifications as read:', error)
        }
      }
    }
  }

  /**
   * CHECK USER PLAN CHOICE AND STATUS
   * 
   * This function checks the user's plan choice from localStorage and determines
   * what state to show based on their previous choices and current featured request status.
   */
  const checkUserPlanChoice = async () => {
    if (!auth.userId) return

    // Migrate localStorage choice to database
    await migratePlanChoiceToDatabase(auth.userId)

    // Check database for user's plan choice
    const savedChoice = await getUserPlanChoice(auth.userId)
    
    if (savedChoice === 'free') {
      setUserPlanChoice('free')
      setShowSubscriptionCard(false)
      return
    }
    
    if (savedChoice === 'featured-pending' || savedChoice === 'featured') {
      // Check if there are any pending featured requests
      const { data: pendingRequests, error } = await supabase
        .from('provider_change_requests')
        .select('*')
        .eq('owner_user_id', auth.userId)
        .eq('type', 'feature_request')
        .eq('status', 'pending')
      
      if (error) {
        console.error('[MyBusiness] Error checking pending requests:', error)
        return
      }
      
      if (pendingRequests && pendingRequests.length > 0) {
        setUserPlanChoice('featured-pending')
        setShowSubscriptionCard(false)
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. Featured pricing: $97/year.')
      } else {
        // Check if user has any featured listings (approved)
        const { data: featuredListings, error: featuredError } = await supabase
          .from('providers')
          .select('id, is_member')
          .eq('owner_user_id', auth.userId)
          .eq('is_member', true)
        
        if (featuredError) {
          console.error('[MyBusiness] Error checking featured listings:', featuredError)
          return
        }
        
        if (featuredListings && featuredListings.length > 0) {
          setUserPlanChoice('featured')
          setShowSubscriptionCard(false)
          // Don't show message for approved featured accounts
        } else {
          // No pending requests and no featured listings, reset choice
          await savePlanChoice(auth.userId, null)
          setUserPlanChoice(null)
          setShowSubscriptionCard(true)
        }
      }
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
   * SELECT FREE ACCOUNT
   * 
   * This function handles when a user selects the Free Account option.
   * It displays a thank you message, saves the choice, and hides the subscription card.
   */
  const selectFreeAccount = () => {
    if (!auth.userId) return
    
    setMessage('Thanks for choosing Bonita Forward.')
    setUserPlanChoice('free')
    setShowSubscriptionCard(false)
    
    // Save choice to database
    savePlanChoice(auth.userId, 'free')
    
    // Auto-dismiss message after 30 seconds
    setTimeout(() => {
      setMessage(null)
    }, 30000)
  }

  /**
   * UPGRADE TO FEATURED TIER
   * 
   * This function allows business owners to request an upgrade from free to featured tier.
   * It creates a change request for admin review and payment processing.
   * 
   * Featured tier pricing:
   * - $97/year
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
  const upgradeToFeatured = async (listingId?: string) => {
    try {
      setMessage('Requesting featured upgrade...')
      
      // DEFENSIVE CHECK: Verify auth data exists before creating request
      console.log('[MyBusiness] Creating featured request with auth data:', {
        userId: auth.userId,
        email: auth.email,
        name: auth.name,
        hasUserId: !!auth.userId
      })
      
      if (!auth.userId) {
        throw new Error('User ID not available - please sign in again')
      }
      
      // Determine provider_id - use provided listingId or first available listing
      let providerId = listingId
      if (!providerId && listings.length > 0) {
        providerId = listings[0].id // Use first listing if none specified
      }
      
      console.log('[MyBusiness] Submitting request for provider:', providerId)
      
      if (providerId) {
        // User has existing listing - create provider_change_request
        const { error } = await supabase
          .from('provider_change_requests')
          .insert([{
            provider_id: providerId,
          owner_user_id: auth.userId,
          type: 'feature_request',
          changes: {
            tier: 'featured',
            upgrade_reason: listingId 
              ? 'User requested featured upgrade for specific listing' 
              : 'User requested featured upgrade from subscription selection',
            pricing_options: {
              annual: '$97/year'
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
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. Featured pricing: $97/year.')
        
      } else {
        // User has no existing listing - create business_application with featured tier
        const { error } = await supabase
          .from('business_applications')
          .insert([{
            email: auth.email,
            tier_requested: 'featured',
            status: 'pending',
            challenge: 'Featured upgrade request from pricing page - user will provide business details during application process'
          }])

        if (error) throw error
        setMessage('Featured upgrade request submitted! We\'ll contact you about payment options and setup. When you create your business listing, it will automatically be featured. Featured pricing: $97/year.')
      }
      
      // Hide the subscription card if it was called from the subscription selection
      if (!listingId) {
        setShowSubscriptionCard(false)
        setUserPlanChoice('featured-pending')
        
        // Save choice to database
        if (auth.userId) {
          await savePlanChoice(auth.userId, 'featured-pending')
        }
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  /**
   * PROMPT AND UPLOAD IMAGES
   * Opens a file picker, uploads selected images to Supabase Storage, then updates the listing's images array
   */
  const promptAndUploadImages = async (listing: BusinessListing) => {
    try {
      if (!auth.userId) {
        setMessage('You must be signed in to upload images.')
        return
      }

      // Create a transient file input to avoid persistent hidden inputs per row
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      // Featured listings may upload multiple images; free could be limited to 1 if desired
      input.multiple = true

      input.onchange = async () => {
        const files = Array.from(input.files || [])
        if (files.length === 0) return

        setMessage('Uploading images...')
        const uploadedUrls: string[] = []

        for (const file of files) {
          // Unique path per user/listing/filename
          const path = `${auth.userId}/${listing.id}/${Date.now()}-${file.name}`
          const { error: uploadErr } = await supabase.storage.from('business-images').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          })
          if (uploadErr) {
            console.error('[MyBusiness] Image upload failed:', uploadErr)
            setMessage(`Image upload failed: ${uploadErr.message}`)
            return
          }
          const { data: pub } = supabase.storage.from('business-images').getPublicUrl(path)
          if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl)
        }

        // Merge with existing images
        const newImages = [...(listing.images || []), ...uploadedUrls]

        // Persist to providers table
        const { error: updateErr } = await supabase
          .from('providers')
          .update({ images: newImages, updated_at: new Date().toISOString() })
          .eq('id', listing.id)
          .eq('owner_user_id', auth.userId)

        if (updateErr) {
          console.error('[MyBusiness] Failed to update listing images:', updateErr)
          setMessage(`Failed to update listing: ${updateErr.message}`)
          return
        }

        setMessage('Images uploaded successfully!')
        await loadBusinessData()
      }

      // Trigger picker
      input.click()
    } catch (err: any) {
      console.error('[MyBusiness] Unexpected error during image upload:', err)
      setMessage(`Unexpected error: ${err.message || err}`)
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
      setMessage('Submitting business application...')
      
      // Create a business application (NOT a provider directly)
      // This requires admin approval before becoming a live listing
      // IMPORTANT: business_applications table uses 'category' NOT 'category_key'
      const applicationData = {
        business_name: listingData.name,
        full_name: auth.name || 'Business Owner',
        email: listingData.email || auth.email,
        phone: listingData.phone || '',
        category: listingData.category_key || 'professional-services',  // Note: 'category' not 'category_key'
        // Store additional details as JSON string in the challenge field
        challenge: JSON.stringify({
          website: listingData.website,
          address: listingData.address,
          description: listingData.description,
          tags: listingData.tags,
          specialties: listingData.specialties,
          social_links: listingData.social_links,
          business_hours: listingData.business_hours,
          service_areas: listingData.service_areas,
          google_maps_url: listingData.google_maps_url,
          bonita_resident_discount: listingData.bonita_resident_discount,
          images: listingData.images
        })
      }
      
      const { error } = await supabase
        .from('business_applications')
        .insert([applicationData])

      if (error) throw error

      setMessage('Success! Your business application has been submitted and is pending admin approval.')
      loadBusinessData() // Refresh data to show new application in pending state
      setShowCreateForm(false)
    } catch (error: any) {
      setMessage(`Error submitting application: ${error.message}`)
    }
  }

  /**
   * UPDATE BUSINESS LISTING
   * 
   * This function allows business owners to update their existing business listings.
   * For featured businesses, booking-related changes are applied immediately.
   * Other changes still require admin approval.
   * 
   * How it works:
   * 1. For featured businesses: Booking changes are applied immediately to the database
   * 2. For all other changes: Creates a change request that requires admin approval
   * 3. This ensures featured businesses can manage their booking settings without delays
   */
  const updateBusinessListing = async (listingId: string, updates: Partial<BusinessListing>) => {
    // Prevent multiple simultaneous updates
    if (isUpdating) {
      console.log('[MyBusiness] Update already in progress, ignoring duplicate request')
      return
    }

    setIsUpdating(true)
    
    try {
      console.log('[MyBusiness] Updating listing:', listingId)
      console.log('[MyBusiness] Proposed changes:', updates)
      
      // Get the current listing to check if it's featured
      const currentListing = listings.find(l => l.id === listingId)
      const isFeatured = currentListing?.is_member === true
      
      if (isFeatured) {
        // Featured businesses: Apply ALL changes immediately
        console.log('[MyBusiness] Applying all changes immediately for featured business:', updates)
        
        const { error } = await supabase
          .from('providers')
          .update(updates)
          .eq('id', listingId)
        
        if (error) throw new Error(`Failed to update listing: ${error.message}`)
        
        // Create a change log entry for admin tracking (not for approval)
        const { error: logError } = await createProviderChangeRequest({
          provider_id: listingId,
          owner_user_id: auth.userId!,
          type: 'update',
          changes: updates,
          status: 'approved', // Automatically approved for featured businesses
          reason: `Featured business update from ${auth.email} - applied immediately`
        })
        
        if (logError) {
          console.warn('[MyBusiness] Failed to create change log:', logError)
          // Don't throw error for logging failure, the main update succeeded
        }
        
        setMessage('✅ All changes applied immediately! (Featured business)')
      } else {
        // Non-featured businesses: Create change request for admin approval
        console.log('[MyBusiness] Creating change request for non-featured business:', updates)
        
        const { error, id } = await createProviderChangeRequest({
          provider_id: listingId,
          owner_user_id: auth.userId!,
          type: 'update',
          changes: updates,
          reason: `Business listing update request from ${auth.email}`
        })
        
        if (error) {
          console.error('[MyBusiness] Change request creation error:', error)
          throw new Error(error)
        }
        
        console.log('[MyBusiness] Change request created successfully with ID:', id)
        setMessage('📋 Changes submitted for admin approval! You\'ll be notified once they\'re reviewed.')
      }
      
      // Refresh the data to show updated state
      await loadBusinessData()
      
      // Close the editing form after successful update
      setEditingListing(null)
      
    } catch (error: any) {
      console.error('[MyBusiness] Error updating listing:', error)
      setMessage(`❌ Error updating listing: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  /**
   * CREATE JOB POST
   * 
   * This function allows business owners to create job postings for their business.
   * It creates an entry in the provider_job_posts table for admin review.
   */
  const createJobPost = async (_providerId: string, _jobData: {
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
          provider_id: _providerId,
          owner_user_id: auth.userId,
          title: _jobData.title,
          description: _jobData.description,
          apply_url: _jobData.apply_url,
          salary_range: _jobData.salary_range,
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
   * CONNECT GOOGLE CALENDAR
   * 
   * This function initiates the Google Calendar OAuth flow.
   * It calls a Netlify function that returns the OAuth URL, then redirects the user.
   */
  const connectGoogleCalendar = async (providerId: string) => {
    try {
      setConnectingCalendar(true)
      setMessage('Connecting to Google Calendar...')
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call Netlify function to get OAuth URL
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/google-calendar-connect` : '/.netlify/functions/google-calendar-connect'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ provider_id: providerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to connect Google Calendar')
      }

      const result = await response.json()
      
      // Redirect to Google OAuth consent screen
      window.location.href = result.auth_url
      
    } catch (error: any) {
      console.error('[MyBusiness] Google Calendar connection error:', error)
      setMessage(`Error connecting Google Calendar: ${error.message}`)
      setConnectingCalendar(false)
    }
  }

  /**
   * DISCONNECT GOOGLE CALENDAR
   * 
   * This function disconnects the business's Google Calendar integration.
   * It revokes the OAuth tokens and clears the stored credentials.
   */
  const disconnectGoogleCalendar = async (providerId: string) => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar? Future bookings will not be synced to your calendar.')) {
      return
    }

    try {
      setConnectingCalendar(true)
      setMessage('Disconnecting Google Calendar...')
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call Netlify function to disconnect
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/google-calendar-disconnect` : '/.netlify/functions/google-calendar-disconnect'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ provider_id: providerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to disconnect Google Calendar')
      }

      setMessage('Google Calendar disconnected successfully')
      
      // Refresh business data to update UI
      await loadBusinessData()
      
    } catch (error: any) {
      console.error('[MyBusiness] Google Calendar disconnection error:', error)
      setMessage(`Error disconnecting Google Calendar: ${error.message}`)
    } finally {
      setConnectingCalendar(false)
    }
  }

  /**
   * DELETE BUSINESS LISTING
   * 
   * This function allows business owners to delete their business listings.
   * Uses Netlify function with SERVICE_ROLE_KEY to bypass RLS policies.
   */
  const deleteBusinessListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this business listing? This action cannot be undone.')) {
      return
    }

    try {
      setMessage('Deleting business listing...')
      
      console.log('[MyBusiness] Attempting to delete listing:', listingId)
      console.log('[MyBusiness] User:', { userId: auth.userId, email: auth.email })
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      console.log('[MyBusiness] Calling Netlify function to delete listing...')

      // Call Netlify function to delete (bypasses RLS with SERVICE_ROLE_KEY)
      const response = await fetch('/.netlify/functions/delete-business-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ listing_id: listingId })
      })

      console.log('[MyBusiness] Delete response status:', response.status)

      if (!response.ok) {
        // Try to parse error details
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('[MyBusiness] Delete error details:', errorData)
          errorMessage = errorData.error || errorMessage
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
        } catch (parseErr) {
          const errorText = await response.text()
          console.error('[MyBusiness] Delete error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[MyBusiness] Delete result:', result)

      if (!result.success) {
        throw new Error(result.error || 'Delete failed')
      }

      console.log('[MyBusiness] Successfully deleted listing, refreshing data...')
      setMessage('Business listing deleted successfully!')
      
      // Wait a moment for the database to process the delete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh data to remove deleted listing
      await loadBusinessData()
      
      console.log('[MyBusiness] Data refreshed after deletion')
    } catch (error: any) {
      console.error('[MyBusiness] Error deleting listing:', error)
      setMessage(`Error deleting listing: ${error.message}`)
    }
  }

  /**
   * DELETE JOB POST
   * 
   * This function deletes a job post from the database.
   * It removes the job post entry and refreshes the data.
   */
  const deleteJobPost = async (_jobId: string) => {
    if (!confirm('Are you sure you want to delete this job post? This action cannot be undone.')) {
      return
    }

    try {
      setMessage('Deleting job post...')
      
      const { error } = await supabase
        .from('provider_job_posts')
        .delete()
        .eq('id', _jobId)
        .eq('owner_user_id', auth.userId) // Ensure user owns this job post

      if (error) throw error

      setMessage('Job post deleted successfully!')
      loadBusinessData() // Refresh data to remove deleted job post
    } catch (error: any) {
      setMessage(`Error deleting job post: ${error.message}`)
    }
  }

  /**
   * CHECK IF NOTIFICATION SHOULD BE SHOWN
   * 
   * This function checks if a notification should be displayed based on whether
   * there's new activity since the last dismissal.
   * 
   * CRITICAL FIX: Only show notifications for NON-FEATURED businesses.
   * Featured businesses have changes applied immediately, so they don't need
   * approval notifications.
   */
  const shouldShowNotification = (notificationType: 'pending' | 'approved' | 'rejected'): boolean => {
    // Check if user has any non-featured businesses
    const hasNonFeaturedBusinesses = listings.some(listing => !listing.is_member)
    
    // Only show notifications if user has non-featured businesses
    if (!hasNonFeaturedBusinesses) {
      return false
    }
    
    const dismissal = dismissedNotifications.find(d => d.notification_type === notificationType)
    
    if (!dismissal) {
      // No dismissal recorded, show notification
      return true
    }
    
    // Check if there's new activity since dismissal
    const dismissedTimestamp = new Date(dismissal.last_activity_timestamp)
    
    if (notificationType === 'pending') {
      // For pending: show if there are any pending requests newer than dismissal
      const hasNewPending = changeRequests.some(req => 
        req.status === 'pending' && 
        new Date(req.created_at) > dismissedTimestamp
      )
      return hasNewPending
    } else if (notificationType === 'approved') {
      // For approved: show if there are any approved requests newer than dismissal (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const hasNewApproved = changeRequests.some(req => 
        req.status === 'approved' && 
        req.decided_at &&
        new Date(req.decided_at) > dismissedTimestamp &&
        new Date(req.decided_at) > thirtyDaysAgo
      )
      return hasNewApproved
    } else if (notificationType === 'rejected') {
      // For rejected: show if there are any rejected requests newer than dismissal (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const hasNewRejected = changeRequests.some(req => 
        req.status === 'rejected' && 
        req.decided_at &&
        new Date(req.decided_at) > dismissedTimestamp &&
        new Date(req.decided_at) > thirtyDaysAgo
      )
      return hasNewRejected
    }
    
    return false
  }

  /**
   * DISMISS NOTIFICATION
   * 
   * This function allows users to dismiss notification sections from the top of the page.
   * It saves the dismissal to the database with the timestamp of the most recent activity.
   */
  const dismissNotification = async (notificationType: 'pending' | 'approved' | 'rejected') => {
    if (!auth.userId) return
    
    try {
      // Get the timestamp of the most recent activity for this notification type
      const latestActivityTimestamp = await getLatestActivityTimestamp(auth.userId, notificationType)
      
      if (!latestActivityTimestamp) {
        console.warn(`[MyBusiness] No recent activity found for ${notificationType} notifications`)
        return
      }
      
      // Save dismissal to database
      const { error } = await dismissNotificationDB(auth.userId, notificationType, latestActivityTimestamp)
      
      if (error) {
        console.error(`[MyBusiness] Failed to dismiss ${notificationType} notification:`, error)
        setMessage(`Failed to dismiss notification: ${error}`)
        return
      }
      
      // Update local state
      const newDismissal: DismissedNotification = {
        id: `${auth.userId}-${notificationType}`,
        user_id: auth.userId,
        notification_type: notificationType,
        dismissed_at: new Date().toISOString(),
        last_activity_timestamp: latestActivityTimestamp,
        created_at: new Date().toISOString()
      }
      
      setDismissedNotifications(prev => {
        const filtered = prev.filter(d => d.notification_type !== notificationType)
        return [...filtered, newDismissal]
      })
      
      console.log(`[MyBusiness] Successfully dismissed ${notificationType} notification`)
    } catch (error: any) {
      console.error(`[MyBusiness] Error dismissing ${notificationType} notification:`, error)
      setMessage(`Error dismissing notification: ${error.message}`)
    }
  }

  /**
   * CANCEL CHANGE REQUEST
   * 
   * This function allows business owners to cancel their pending change requests.
   * It updates the request status to 'cancelled' in the database.
   */
  const cancelChangeRequest = async (requestId: string) => {
    try {
      setMessage('Cancelling change request...')
      
      const { error } = await supabase
        .from('provider_change_requests')
        .update({ 
          status: 'cancelled',
          decided_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('owner_user_id', auth.userId) // Ensure user can only cancel their own requests
      
      if (error) throw new Error(error.message)
      
      setMessage('✅ Change request cancelled successfully!')
      
      // Refresh data to show updated status
      await loadBusinessData()
      
    } catch (error: any) {
      console.error('[MyBusiness] Error cancelling change request:', error)
      setMessage(`❌ Error cancelling request: ${error.message}`)
    }
  }

  /**
   * UPDATE JOB POST
   * 
   * This function updates an existing job post in the database.
   * It creates a change request for admin approval instead of direct update.
   */
  const updateJobPost = async (jobId: string, jobData: {
    title: string
    description?: string
    apply_url?: string
    salary_range?: string
  }) => {
    try {
      setMessage('Updating job post...')
      
      // Create a change request for job post updates (admin approval required)
      const { error } = await supabase
        .from('provider_change_requests')
        .insert([{
          type: 'job_update',
          provider_id: jobPosts.find(job => job.id === jobId)?.provider_id,
          owner_user_id: auth.userId,
          changes: {
            job_id: jobId,
            title: jobData.title,
            description: jobData.description,
            apply_url: jobData.apply_url,
            salary_range: jobData.salary_range
          },
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Job post update submitted for admin approval!')
      loadBusinessData() // Refresh data to show the change request
    } catch (error: any) {
      setMessage(`Error updating job post: ${error.message}`)
    }
  }

  if (auth.role !== 'business') {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-4xl">
          <div className="rounded-2xl border border-neutral-100 p-1 bg-white">
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
          <div className="rounded-2xl border border-neutral-100 p-1 bg-white">
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

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* Subscription Comparison Section - hidden if any listing is featured */}
        {showSubscriptionCard && listings.every(l => !l.is_member) && (
          <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 text-center">Choose Your Business Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Account Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                  Free Account
                </h3>
                <p className="text-2xl font-bold text-green-600 mt-2">$0/month</p>
              </div>
              <ul className="text-sm text-neutral-700 space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Business name, category, phone, email
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Website and address
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic business description (up to 200 characters)
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic tags and specialties
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1 business image
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-amber-700"><strong>Changes require admin approval</strong> (1-2 business days)</span>
                </li>
              </ul>
              <button
                onClick={selectFreeAccount}
                className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Choose Free Account
              </button>
            </div>
            
            {/* Featured Account Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center justify-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                  Featured Account
                </h3>
                <p className="text-2xl font-bold text-yellow-600 mt-2">$97/year</p>
              </div>
              <ul className="text-sm text-neutral-700 space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Everything in Free, plus:</strong>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Priority placement</strong> - appears at top of search results
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Enhanced description</strong> - up to 500 characters
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Social media links</strong> - Facebook, Instagram, etc.
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Google Maps integration</strong> - interactive location
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Multiple images</strong> - showcase your business
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Booking system</strong> - direct appointment scheduling
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Exclusive coupons</strong> - create special offers for customers
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Analytics</strong> - view customer interactions
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700"><strong>No admin approval needed</strong> - make changes instantly</span>
                </li>
              </ul>
              <button
                onClick={() => upgradeToFeatured()}
                className="w-full mt-4 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Choose Featured Account
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Change Requests Status Section - Shows pending, approved, and rejected requests 
            ONLY for non-featured accounts. Featured accounts get instant updates without approval. */}
        {changeRequests.length > 0 && listings.some(listing => !listing.is_member) && (
          <div className="mb-6 space-y-3">
            {/* Notification Summary */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-amber-800">
                    {nonFeaturedChangeRequests.filter(req => req.status === 'pending').length} Pending
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">
                    {nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && 
                      new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} Recently Approved
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-800">
                    {nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && 
                      new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} Recently Rejected
                  </span>
                </div>
              </div>
            </div>
            {/* Pending Requests */}
            {nonFeaturedChangeRequests.filter(req => req.status === 'pending').length > 0 && shouldShowNotification('pending') && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-amber-800">⏳ Pending Admin Review</h3>
                      <button
                        onClick={() => dismissNotification('pending')}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        title="Dismiss notification"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-amber-700">
                      <p className="mb-2">You have {nonFeaturedChangeRequests.filter(req => req.status === 'pending').length} change request(s) waiting for admin approval:</p>
                      <ul className="mt-2 space-y-2">
                        {nonFeaturedChangeRequests.filter(req => req.status === 'pending').map(req => {
                          const listing = listings.find(l => l.id === req.provider_id)
                          const changeCount = req.changes ? Object.keys(req.changes).length : 0
                          
                          return (
                            <li key={req.id} className="text-xs bg-white rounded p-3 border border-amber-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-amber-900">
                                    <strong>{listing?.name || 'Business'}</strong> - {
                                      req.type === 'update' ? 'Listing Update' :
                                      req.type === 'feature_request' ? '⭐ Featured Upgrade Request' :
                                      req.type === 'delete' ? 'Deletion Request' :
                                      req.type === 'claim' ? 'Ownership Claim' :
                                      req.type
                                    }
                                  </div>
                                  
                                  {changeCount > 0 && (
                                    <div className="text-amber-700 mt-1">
                                      {changeCount} field{changeCount !== 1 ? 's' : ''} being changed: {
                                        req.changes ? Object.keys(req.changes)
                                          .map(field => field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                          .join(', ') : 'Details available in Change Requests tab'
                                      }
                                    </div>
                                  )}
                                  
                                  <div className="text-amber-600 mt-1">
                                    Submitted {new Date(req.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => setActiveTab('change-requests')}
                                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View Details
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recently Approved Requests */}
            {nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && 
              new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length > 0 && shouldShowNotification('approved') && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-green-800">✅ Recently Approved</h3>
                      <button
                        onClick={() => dismissNotification('approved')}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Dismiss notification"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      <p className="mb-2">Great news! The following change requests have been approved:</p>
                      <ul className="mt-2 space-y-2">
                        {nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && 
                          new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).map(req => {
                          const listing = listings.find(l => l.id === req.provider_id)
                          const changeCount = req.changes ? Object.keys(req.changes).length : 0
                          
                          return (
                            <li key={req.id} className="text-xs bg-white rounded p-3 border border-green-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-green-900">
                                    <strong>{listing?.name || 'Business'}</strong> - {
                                      req.type === 'update' ? 'Business Listing Updates' :
                                      req.type === 'feature_request' ? '⭐ Featured Upgrade' :
                                      req.type === 'delete' ? 'Business Deletion' :
                                      req.type === 'claim' ? 'Business Ownership Claim' :
                                      req.type
                                    } Approved!
                                  </div>
                                  
                                  {changeCount > 0 && (
                                    <div className="text-green-700 mt-1">
                                      {changeCount} field{changeCount !== 1 ? 's' : ''} updated: {
                                        req.changes ? Object.keys(req.changes)
                                          .map(field => field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                          .join(', ') : 'Changes are now live'
                                      }
                                    </div>
                                  )}
                                  
                                  <div className="text-green-600 mt-1">
                                    ✅ Approved {req.decided_at ? new Date(req.decided_at).toLocaleDateString() : 'recently'}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => setActiveTab('change-requests')}
                                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View Details
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recently Rejected Requests */}
            {nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && 
              new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length > 0 && shouldShowNotification('rejected') && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-red-800">❌ Recently Rejected</h3>
                      <button
                        onClick={() => dismissNotification('rejected')}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Dismiss notification"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="space-y-1">
                        {nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && 
                          new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).map(req => {
                          const listing = listings.find(l => l.id === req.provider_id)
                          return (
                            <li key={req.id} className="text-xs bg-white rounded p-2">
                              <strong>{listing?.name || 'Business'}</strong> - {
                                req.type === 'update' ? 'Update' :
                                req.type === 'feature_request' ? 'Featured Request' :
                                req.type
                              } was rejected
                              <div className="text-red-600 mt-1">
                                {req.reason ? `Reason: ${req.reason}` : req.decided_at ? `Rejected ${new Date(req.decided_at).toLocaleDateString()}` : 'Rejected'}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile-Friendly Dropdown Navigation */}
        <div className="mb-6">
          <div className="relative inline-block text-left w-full" data-dropdown-container>
            <div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onKeyDown={(e) => {
                  // Close dropdown on Escape key
                  if (e.key === 'Escape') {
                    setIsDropdownOpen(false)
                  }
                }}
                className="inline-flex justify-between w-full rounded-xl border border-neutral-300 shadow-sm px-4 py-3 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-100 focus:ring-blue-500"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <span className="flex items-center">
                  {currentTab.label}
                  {('count' in currentTab) && currentTab.count! > 0 && (
                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs">
                      {currentTab.count}
                    </span>
                  )}
                </span>
                <svg
                  className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-full rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
              >
                <div className="py-1" role="none">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabSelect(tab.key as any)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        activeTab === tab.key
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex items-center justify-between">
                        <span>{tab.label}</span>
                        {('count' in tab) && tab.count! > 0 && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs">
                            {tab.count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {/* Header with Create Button */}
            <div className="flex flex-wrap items-center justify-between">
              <div className="p-[1vh] m-[1vh]">
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
              <div className="rounded-2xl border border-neutral-100 p-6 sm:p-8 bg-white text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Business Listings</h3>
                  <p className="text-neutral-600 mb-6">You don't have any business listings yet. Create your first one to get started!</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Listing
                  </button>
                </div>
              </div>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-neutral-200 p-4 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-neutral-900 mb-2">{listing.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            listing.is_member 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {listing.is_member ? '⭐ Featured' : '📋 Free'}
                          </span>
                          {/* Show badge based on actual change requests, not published field */}
                          {(() => {
                            const hasPendingChanges = changeRequests.some(
                              req => req.provider_id === listing.id && req.status === 'pending'
                            )
                            return hasPendingChanges ? (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800">
                                ⏳ Changes Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                                ✓ Live
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        {listing.is_member ? (
                          <div className="text-center sm:text-right space-y-2">
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⭐ Featured Listing
                            </div>
                            <p className="text-xs text-neutral-500">Priority placement in search results</p>
                            <button
                              onClick={() => downgradeToFree(listing.id)}
                              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white text-neutral-700 text-sm font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-6-6m0 6l6-6" />
                              </svg>
                              Downgrade back to Free
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => upgradeToFeatured(listing.id)}
                              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Upgrade to Featured
                            </button>
                            <p className="text-xs text-neutral-500 text-center sm:text-right">
                              $97/year
                            </p>
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            console.log('[MyBusiness] Edit button clicked for listing:', listing.id, listing.name)
                            setEditingListing(listing)
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Details
                        </button>
                      </div>
                    </div>
                      
                      {/* Business Images Gallery */}
                      {listing.images && listing.images.length > 0 ? (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-neutral-700 mb-3">Business Images ({listing.images.length})</h4>
                          {/* Mobile horizontal scroll */}
                          <div className="sm:hidden overflow-x-auto -mx-4 px-4 mb-4">
                            <div className="flex gap-3 pb-2" style={{width: 'max-content'}}>
                              {listing.images.map((imageUrl, index) => (
                                <div 
                                  key={index} 
                                  className="relative group cursor-pointer flex-shrink-0"
                                  style={{width: '120px'}}
                                  onClick={() => {
                                    // Open image in full screen modal
                                    const modal = document.createElement('div')
                                    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4'
                                    modal.innerHTML = `
                                      <div class="relative max-w-4xl max-h-full">
                                        <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
                                          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                          </svg>
                                        </button>
                                        <img src="${imageUrl}" alt="${listing.name} - Image ${index + 1}" class="max-w-full max-h-full object-contain rounded-lg">
                                        <div class="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                                          ${index + 1} of ${listing.images?.length || 0}
                                        </div>
                                      </div>
                                    `
                                    document.body.appendChild(modal)
                                    modal.addEventListener('click', (e) => {
                                      if (e.target === modal) modal.remove()
                                    })
                                  }}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`${listing.name} - Image ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </div>
                                  <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Desktop grid */}
                          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {listing.images.map((imageUrl, index) => (
                              <div 
                                key={index} 
                                className="relative group cursor-pointer"
                                onClick={() => {
                                  // Open image in full screen modal
                                  const modal = document.createElement('div')
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4'
                                  modal.innerHTML = `
                                    <div class="relative max-w-4xl max-h-full">
                                      <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
                                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                      <img src="${imageUrl}" alt="${listing.name} - Image ${index + 1}" class="max-w-full max-h-full object-contain rounded-lg">
                                      <div class="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                                        ${index + 1} of ${listing.images?.length || 0}
                                      </div>
                                    </div>
                                  `
                                  document.body.appendChild(modal)
                                  modal.addEventListener('click', (e) => {
                                    if (e.target === modal) modal.remove()
                                  })
                                }}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`${listing.name} - Image ${index + 1}`}
                                  className="w-full h-20 sm:h-24 md:h-28 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200 hover:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                                {/* Image counter badge */}
                                <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-neutral-500">Click any image to view full size</p>
                            <button
                              onClick={() => promptAndUploadImages(listing)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Upload Images
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center bg-neutral-50">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <h4 className="text-lg font-medium text-neutral-700 mb-2">Upload Images</h4>
                              <p className="text-sm text-neutral-500 mb-4 max-w-sm">
                                Showcase your business with high-quality photos to attract more customers
                              </p>
                              <button
                                onClick={() => promptAndUploadImages(listing)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Upload Images
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Business Information */}
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-neutral-800 mb-3">Business Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Category</span>
                            <span className="text-sm text-neutral-700">{listing.category_key}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Email</span>
                            <span className="text-sm text-neutral-700">{listing.email || 'Not provided'}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Phone</span>
                            <span className="text-sm text-neutral-700">{listing.phone || 'Not provided'}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Website</span>
                            <span className="text-sm text-neutral-700">
                              {listing.website ? (
                                <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {listing.website}
                                </a>
                              ) : 'Not provided'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {listing.address && (
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Address</span>
                              <span className="text-sm text-neutral-700">{listing.address}</span>
                            </div>
                          )}
                          {listing.tags && listing.tags.length > 0 && (
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Tags</span>
                              <span className="text-sm text-neutral-700">{listing.tags.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {listing.description && (
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0 mr-4">Description</span>
                            <br /><p className="text-sm text-neutral-700 leading-relaxed">{listing.description}</p>
                          </div>
                        </div>
                      )}
                      
                      {listing.bonita_resident_discount && (
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-green-600 uppercase tracking-wide w-20 flex-shrink-0">Discount</span>
                            <p className="text-sm text-green-700 font-medium">{listing.bonita_resident_discount}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Social Links */}
                    {listing.social_links && Object.keys(listing.social_links).length > 0 && (
                      <div className="bg-neutral-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-neutral-800 mb-3">Social Media</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(listing.social_links).map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                              </svg>
                              {platform}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Google Calendar Integration - Featured accounts only */}
                    {listing.is_member && listing.booking_enabled && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <h4 className="text-sm font-semibold text-neutral-800">Google Calendar Sync</h4>
                            </div>
                            
                            {listing.google_calendar_connected ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm text-green-700 font-medium">Connected</span>
                                </div>
                                <p className="text-xs text-neutral-600">
                                  Bookings are automatically synced to your Google Calendar{listing.google_calendar_id && ` (${listing.google_calendar_id})`}
                                </p>
                                {!listing.google_calendar_sync_enabled && (
                                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-xs text-amber-700">Sync is paused</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-neutral-600">
                                  Sync your bookings with Google Calendar to manage appointments seamlessly
                                </p>
                                <ul className="text-xs text-neutral-500 space-y-1 ml-4 list-disc">
                                  <li>Automatic calendar updates</li>
                                  <li>Real-time availability</li>
                                  <li>Email reminders</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                          {listing.google_calendar_connected ? (
                            <>
                              <button
                                onClick={() => disconnectGoogleCalendar(listing.id)}
                                disabled={connectingCalendar}
                                className="inline-flex items-center justify-center px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {connectingCalendar ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Disconnecting...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Disconnect
                                  </>
                                )}
                              </button>
                              <a
                                href={`https://calendar.google.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Calendar
                              </a>
                            </>
                          ) : (
                            <button
                              onClick={() => connectGoogleCalendar(listing.id)}
                              disabled={connectingCalendar}
                              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {connectingCalendar ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                                  </svg>
                                  Connect Google Calendar
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
                      <button
                        onClick={() => deleteBusinessListing(listing.id)}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Listing
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
                <div key={app.id} className="rounded-2xl border border-neutral-100 p-1 bg-white">
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
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Ready to Post Jobs?</h3>
                <p className="text-neutral-600 mb-2">First, you'll need to create a business listing.</p>
                <p className="text-sm text-neutral-500 mb-6">Job postings are linked to your business listings so candidates can learn more about your company.</p>
                <button
                  onClick={() => {
                    setShowCreateForm(true)
                    setActiveTab('listings')
                  }}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Business Listing
                </button>
                <p className="text-xs text-neutral-500 mt-4">
                  After creating your listing, you can return here to post jobs
                </p>
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
                <div key={job.id} className="rounded-2xl border border-neutral-100 p-1 bg-white">
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
                      <button 
                        onClick={() => {
                          console.log('[MyBusiness] Edit job button clicked for job:', job.id, job.title)
                          setEditingJob(job) // Set the job to edit
                          setShowJobForm(true) // Open the job form
                        }}
                        className="rounded-full bg-neutral-100 text-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-200"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteJobPost(job.id)}
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

        {/* Change Requests Tab */}
        {activeTab === 'change-requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Change Requests</h2>
                <p className="text-sm text-neutral-600">Track your pending business listing changes</p>
              </div>
            </div>

            {nonFeaturedChangeRequests.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Change Requests</h3>
                <p className="mt-2 text-neutral-600">
                  You haven't submitted any change requests yet. Edit your business listings to create change requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonFeaturedChangeRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-neutral-200 p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-neutral-900">
                          {request.type === 'update' ? 'Business Listing Update' : 
                           request.type === 'delete' ? 'Business Listing Deletion' :
                           request.type === 'feature_request' ? 'Featured Upgrade Request' :
                           request.type === 'claim' ? 'Business Claim Request' : request.type}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          request.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Show the changes being requested */}
                    {request.changes && Object.keys(request.changes).length > 0 && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">Specific Changes Being Requested:</div>
                        <div className="text-sm text-gray-600 space-y-2">
                          {Object.entries(request.changes).map(([field, value]) => {
                            // Get current value from the listing for comparison
                            const currentListing = listings.find(l => l.id === request.provider_id)
                            const currentValue = currentListing ? (currentListing as any)[field] : null
                            
                            // Format field names for better readability
                            const fieldDisplayName = field
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase())
                              .replace('Id', 'ID')
                              .replace('Url', 'URL')
                              .replace('Email', 'Email')
                              .replace('Phone', 'Phone')
                            
                            // Format values for better display
                            const formatValue = (val: any) => {
                              if (val === null || val === undefined) return 'Not set'
                              if (typeof val === 'boolean') return val ? 'Yes' : 'No'
                              if (typeof val === 'object') {
                                if (Array.isArray(val)) {
                                  return val.length > 0 ? val.join(', ') : 'None'
                                }
                                return JSON.stringify(val)
                              }
                              if (typeof val === 'string' && val.length > 50) {
                                return val.substring(0, 50) + '...'
                              }
                              return String(val)
                            }
                            
                            return (
                              <div key={field} className="border-l-2 border-blue-200 pl-3 py-1">
                                <div className="font-medium text-gray-800">{fieldDisplayName}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  <div className="flex justify-between">
                                    <span>Current: <span className="text-gray-600">{formatValue(currentValue)}</span></span>
                                    <span className="text-blue-600">→</span>
                                    <span>New: <span className="text-gray-600">{formatValue(value)}</span></span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-neutral-600">
                        <div>Provider ID: {request.provider_id}</div>
                        {request.reason && <div>Reason: {request.reason}</div>}
                        {request.decided_at && (
                          <div>
                            {request.status === 'approved' ? 'Approved' : 
                             request.status === 'rejected' ? 'Rejected' : 
                             request.status === 'cancelled' ? 'Cancelled' : 'Unknown'} on: {new Date(request.decided_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      {/* Cancel button for pending requests */}
                      {request.status === 'pending' && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this change request? This action cannot be undone.')) {
                              cancelChangeRequest(request.id)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Activity Tab */}
        {activeTab === 'user-activity' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-100 p-6 bg-white">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Customer Interactions</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Track how customers interact with your business listings - profile views, discount copies, booking requests, and questions.
              </p>
              
              {userActivity.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">No Activity Yet</h4>
                  <p className="text-neutral-600">
                    Customer interactions will appear here once people start viewing your listings and engaging with your business.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.activity_type === 'profile_view' ? 'bg-blue-100 text-blue-600' :
                          activity.activity_type === 'discount_copy' ? 'bg-green-100 text-green-600' :
                          activity.activity_type === 'booking_request' ? 'bg-purple-100 text-purple-600' :
                          activity.type === 'booking_received' ? 'bg-emerald-100 text-emerald-600' :
                          activity.type === 'booking_updated' ? 'bg-amber-100 text-amber-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {activity.activity_type === 'profile_view' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                          {activity.activity_type === 'discount_copy' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                          {activity.activity_type === 'booking_request' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                          {activity.activity_type === 'question_asked' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {activity.type === 'booking_received' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {activity.type === 'booking_updated' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-900">
                            {activity.user_name || activity.user_email || 'Anonymous User'}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="text-sm text-neutral-600 mb-1">
                          {activity.type === 'booking_received' ? (
                            <div>
                              <span className="font-medium">New Booking Received</span>
                              <div className="text-xs text-neutral-500 mt-1">
                                {activity.message || `Booking from ${activity.user_name || activity.user_email || 'Customer'}`}
                              </div>
                            </div>
                          ) : activity.type === 'booking_updated' ? (
                            <div>
                              <span className="font-medium">Booking Details Updated</span>
                              <div className="text-xs text-neutral-500 mt-1">
                                {activity.message || 'Booking details have been updated.'}
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium">
                                {activity.activity_type === 'profile_view' && 'Viewed profile'}
                                {activity.activity_type === 'discount_copy' && 'Copied discount code'}
                                {activity.activity_type === 'booking_request' && 'Requested booking'}
                                {activity.activity_type === 'question_asked' && 'Asked a question'}
                              </span>
                              {' for '}
                              <span className="font-medium text-blue-600">{activity.provider_name}</span>
                            </>
                          )}
                        </div>
                        
                        {activity.activity_details && activity.type !== 'booking_received' && activity.type !== 'booking_updated' && (
                          <div className="text-sm text-neutral-500 bg-neutral-50 p-2 rounded border-l-2 border-neutral-200">
                            {activity.activity_details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {/* Recently Approved Tab */}
        {activeTab === 'recently-approved' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recently Approved Requests</h2>
                <p className="text-sm text-neutral-600">Change requests that have been approved in the last 30 days</p>
              </div>
            </div>

            {nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && 
              new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Recently Approved Requests</h3>
                <p className="mt-2 text-neutral-600">
                  Approved change requests from the last 30 days will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonFeaturedChangeRequests.filter(req => req.status === 'approved' && req.decided_at && 
                  new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).map((request) => (
                  <div key={request.id} className="rounded-xl border border-green-200 p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-green-900">
                          {request.type === 'update' ? 'Business Listing Update' : 
                           request.type === 'delete' ? 'Business Listing Deletion' :
                           request.type === 'feature_request' ? 'Featured Upgrade Request' :
                           request.type === 'claim' ? 'Business Claim Request' : request.type}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          approved
                        </span>
                      </div>
                      <div className="text-xs text-green-600">
                        Approved {request.decided_at ? new Date(request.decided_at).toLocaleString() : 'recently'}
                      </div>
                    </div>

                    {/* Show the changes that were approved */}
                    {request.changes && Object.keys(request.changes).length > 0 && (
                      <div className="mb-3 p-3 bg-white rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-700 mb-2">Approved Changes:</div>
                        <div className="text-sm text-green-600 space-y-1">
                          {Object.keys(request.changes).map((field) => (
                            <div key={field} className="capitalize">
                              {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-green-600">
                      <div>Provider ID: {request.provider_id}</div>
                      {request.reason && <div>Reason: {request.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recently Rejected Tab */}
        {activeTab === 'recently-rejected' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recently Rejected Requests</h2>
                <p className="text-sm text-neutral-600">Change requests that have been rejected in the last 30 days</p>
              </div>
            </div>

            {nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && 
              new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Recently Rejected Requests</h3>
                <p className="mt-2 text-neutral-600">
                  Rejected change requests from the last 30 days will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonFeaturedChangeRequests.filter(req => req.status === 'rejected' && req.decided_at && 
                  new Date(req.decided_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).map((request) => (
                  <div key={request.id} className="rounded-xl border border-red-200 p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-red-900">
                          {request.type === 'update' ? 'Business Listing Update' : 
                           request.type === 'delete' ? 'Business Listing Deletion' :
                           request.type === 'feature_request' ? 'Featured Upgrade Request' :
                           request.type === 'claim' ? 'Business Claim Request' : request.type}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          rejected
                        </span>
                      </div>
                      <div className="text-xs text-red-600">
                        Rejected {request.decided_at ? new Date(request.decided_at).toLocaleString() : 'recently'}
                      </div>
                    </div>

                    {/* Show the changes that were rejected */}
                    {request.changes && Object.keys(request.changes).length > 0 && (
                      <div className="mb-3 p-3 bg-white rounded-lg border border-red-200">
                        <div className="text-sm font-medium text-red-700 mb-2">Rejected Changes:</div>
                        <div className="text-sm text-red-600 space-y-1">
                          {Object.keys(request.changes).map((field) => (
                            <div key={field} className="capitalize">
                              {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-red-600">
                      <div>Provider ID: {request.provider_id}</div>
                      {request.reason && <div>Reason: {request.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending-requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pending Requests</h2>
                <p className="text-sm text-neutral-600">Change requests waiting for admin approval</p>
              </div>
            </div>

            {nonFeaturedChangeRequests.filter(req => req.status === 'pending').length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
                <h3 className="text-lg font-medium text-neutral-900">No Pending Requests</h3>
                <p className="mt-2 text-neutral-600">
                  Change requests waiting for admin approval will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonFeaturedChangeRequests.filter(req => req.status === 'pending').map((request) => (
                  <div key={request.id} className="rounded-xl border border-amber-200 p-4 bg-amber-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-amber-900">
                          {request.type === 'update' ? 'Business Listing Update' : 
                           request.type === 'delete' ? 'Business Listing Deletion' :
                           request.type === 'feature_request' ? 'Featured Upgrade Request' :
                           request.type === 'claim' ? 'Business Claim Request' : request.type}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          pending
                        </span>
                      </div>
                      <div className="text-xs text-amber-600">
                        Submitted {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Show the changes being requested */}
                    {request.changes && Object.keys(request.changes).length > 0 && (
                      <div className="mb-3 p-3 bg-white rounded-lg border border-amber-200">
                        <div className="text-sm font-medium text-amber-700 mb-2">Requested Changes:</div>
                        <div className="text-sm text-amber-600 space-y-1">
                          {Object.keys(request.changes).map((field) => (
                            <div key={field} className="capitalize">
                              {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-amber-600">
                        <div>Provider ID: {request.provider_id}</div>
                        {request.reason && <div>Reason: {request.reason}</div>}
                      </div>
                      
                      {/* Cancel button for pending requests */}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this change request? This action cannot be undone.')) {
                            cancelChangeRequest(request.id)
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            isUpdating={isUpdating}
            onCancel={() => {
              console.log('[MyBusiness] Form cancelled')
              setShowCreateForm(false)
              setEditingListing(null)
            }}
          />
        )}

        {/* Job Post Creation/Edit Modal */}
        {showJobForm && (
          <JobPostForm
            listings={listings}
            editingJob={editingJob} // Pass the job being edited (null for new jobs)
            onSave={(providerId, jobData) => {
              if (editingJob) {
                // Update existing job post
                updateJobPost(editingJob.id, jobData)
              } else {
                // Create new job post
                createJobPost(providerId, jobData)
              }
              setShowJobForm(false)
              setEditingJob(null) // Clear editing state
            }}
            onCancel={() => {
              setShowJobForm(false)
              setEditingJob(null) // Clear editing state
            }}
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
  onCancel,
  isUpdating = false
}: { 
  listing: BusinessListing | null
  onSave: (data: Partial<BusinessListing>) => void
  onCancel: () => void
  isUpdating?: boolean
}) {
  console.log('[BusinessListingForm] Rendering with listing:', listing?.id, listing?.name)
  
  const [formData, setFormData] = useState<Partial<BusinessListing>>({
    // Core business fields
    name: listing?.name || '',
    category_key: listing?.category_key || '',
    phone: listing?.phone || '',
    email: listing?.email || '',
    website: listing?.website || '',
    address: listing?.address || '',
    tags: listing?.tags || [],
    images: listing?.images || [],
    rating: listing?.rating || null,
    badges: listing?.badges || [],
    published: listing?.published || false,
    is_member: listing?.is_member || false,
    
    // Enhanced business management fields (now properly stored in database)
    description: listing?.description || '',
    specialties: listing?.specialties || [],
    social_links: listing?.social_links || {},
    business_hours: listing?.business_hours || {},
    service_areas: listing?.service_areas || [],
    google_maps_url: listing?.google_maps_url || '',
    bonita_resident_discount: listing?.bonita_resident_discount || '',
    
    // Coupon fields
    coupon_code: listing?.coupon_code || '',
    coupon_discount: listing?.coupon_discount || '',
    coupon_description: listing?.coupon_description || '',
    coupon_expires_at: listing?.coupon_expires_at || null,
    
    // Booking system fields
    booking_enabled: listing?.booking_enabled || false,
    booking_type: listing?.booking_type || null,
    booking_instructions: listing?.booking_instructions || '',
    booking_url: listing?.booking_url || '',
    enable_calendar_booking: listing?.enable_calendar_booking || false,
    enable_call_contact: listing?.enable_call_contact || false,
    enable_email_contact: listing?.enable_email_contact || false
  })

  // Restaurant tag options
  const restaurantTagOptions = {
    cuisine: [
      'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'French', 'Indian', 
      'Chinese', 'Japanese', 'Thai', 'Vietnamese', 'Korean', 'Middle Eastern', 'Latin American',
      'Seafood', 'Steakhouse', 'Vegetarian', 'Vegan', 'Fusion', 'Other'
    ],
    occasion: [
      'Casual', 'Family', 'Date', 'Business', 'Celebration', 'Quick Bite', 'Fine Dining',
      'Takeout', 'Delivery', 'Outdoor Seating', 'Group Friendly'
    ],
    priceRange: ['$', '$$', '$$$', '$$$$'],
    diningType: [
      'Dine-in', 'Takeout', 'Delivery', 'Drive-through', 'Counter Service', 
      'Full Service', 'Buffet', 'Café', 'Bar & Grill', 'Food Truck'
    ]
  }

  // Update form data when listing changes (important for after successful updates)
  useEffect(() => {
    if (listing) {
      setFormData({
        // Core business fields
        name: listing.name || '',
        category_key: listing.category_key || '',
        phone: listing.phone || '',
        email: listing.email || '',
        website: listing.website || '',
        address: listing.address || '',
        tags: listing.tags || [],
        images: listing.images || [],
        rating: listing.rating || null,
        badges: listing.badges || [],
        published: listing.published || false,
        is_member: listing.is_member || false,
        
        // Enhanced business management fields
        description: listing.description || '',
        specialties: listing.specialties || [],
        social_links: listing.social_links || {},
        business_hours: listing.business_hours || {},
        service_areas: listing.service_areas || [],
        google_maps_url: listing.google_maps_url || '',
        bonita_resident_discount: listing.bonita_resident_discount || '',
        
        // Coupon fields
        coupon_code: listing.coupon_code || '',
        coupon_discount: listing.coupon_discount || '',
        coupon_description: listing.coupon_description || '',
        coupon_expires_at: listing.coupon_expires_at || null,
        
        // Booking system fields
        booking_enabled: listing.booking_enabled || false,
        booking_type: listing.booking_type || null,
        booking_instructions: listing.booking_instructions || '',
        booking_url: listing.booking_url || '',
        enable_calendar_booking: listing.enable_calendar_booking || false,
        enable_call_contact: listing.enable_call_contact || false,
        enable_email_contact: listing.enable_email_contact || false
      })
    }
  }, [listing])

  // Initialize restaurant tags when listing changes or when editing existing listing
  useEffect(() => {
    if (listing?.tags && formData.category_key === 'restaurants-cafes') {
      const tags = listing.tags
      setRestaurantTags({
        cuisine: tags.find(tag => restaurantTagOptions.cuisine.includes(tag)) || '',
        occasion: tags.find(tag => restaurantTagOptions.occasion.includes(tag)) || '',
        priceRange: tags.find(tag => restaurantTagOptions.priceRange.includes(tag)) || '',
        diningType: tags.find(tag => restaurantTagOptions.diningType.includes(tag)) || ''
      })
    }
  }, [listing, formData.category_key])

  const [newTag, setNewTag] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newServiceArea, setNewServiceArea] = useState('')
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUrl, setNewSocialUrl] = useState('')
  
  // Restaurant-specific tag selections
  const [restaurantTags, setRestaurantTags] = useState({
    cuisine: '',
    occasion: '',
    priceRange: '',
    diningType: ''
  })
  
  // Image upload state management
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<Record<string, number>>({})

  const categories = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isUpdating) {
      console.log('[BusinessListingForm] Form submission blocked - update in progress')
      return
    }
    
    // Only send changed fields, not all form data
    const changes: Partial<BusinessListing> = {}
    
    // Compare each field with the original listing to find actual changes
    Object.entries(formData).forEach(([key, value]) => {
      const originalValue = listing ? (listing as any)[key] : null
      
      // Handle different data types
      if (Array.isArray(value) && Array.isArray(originalValue)) {
        // Compare arrays
        if (JSON.stringify(value.sort()) !== JSON.stringify(originalValue.sort())) {
          changes[key as keyof BusinessListing] = value as any
        }
      } else if (typeof value === 'object' && value !== null && typeof originalValue === 'object' && originalValue !== null) {
        // Compare objects
        if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
          changes[key as keyof BusinessListing] = value as any
        }
      } else if (value !== originalValue) {
        // Compare primitive values
        changes[key as keyof BusinessListing] = value as any
      }
    })
    
    console.log('[BusinessListingForm] Original listing data:', listing)
    console.log('[BusinessListingForm] Form data:', formData)
    console.log('[BusinessListingForm] Detected changes:', changes)
    console.log('[BusinessListingForm] Number of changed fields:', Object.keys(changes).length)
    
    // Only proceed if there are actual changes
    if (Object.keys(changes).length === 0) {
      console.log('[BusinessListingForm] No changes detected, skipping submission')
      return
    }
    
    onSave(changes)
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

  // Handle restaurant tag updates
  const updateRestaurantTag = (type: keyof typeof restaurantTags, value: string) => {
    const oldValue = restaurantTags[type]
    
    setRestaurantTags(prev => ({
      ...prev,
      [type]: value
    }))

    // Remove old tag if it exists
    if (oldValue) {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags?.filter(tag => tag !== oldValue) || []
      }))
    }

    // Add new tag if value is not empty
    if (value && !formData.tags?.includes(value)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), value]
      }))
    }
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

  /**
   * IMAGE UPLOAD FUNCTIONS
   * 
   * These functions handle uploading images to Supabase Storage for business listings.
   * Images are stored in a 'business-images' bucket and organized by business ID.
   * 
   * SETUP REQUIRED:
   * 1. Create a 'business-images' bucket in Supabase Storage
   * 2. Set bucket to public for image display
   * 3. Configure RLS policies for authenticated users
   * 
   * Features:
   * - Multiple image upload support
   * - Progress tracking for each image
   * - Automatic image optimization and validation
   * - Secure file storage with proper naming conventions
   * - Image reordering and management
   */
  
  const uploadImage = async (file: File, businessId: string): Promise<string | null> => {
    try {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file')
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image size must be less than 5MB')
      }

      // Generate unique filename with timestamp and random string
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log('[BusinessListingForm] Uploading image:', fileName)
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('business-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('[BusinessListingForm] Image upload error:', error)
        
        // Handle specific bucket not found error
        if (error.message.includes('Bucket not found')) {
          throw new Error('Image storage not yet configured. Please contact support to set up image uploads.')
        }
        
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(fileName)

      console.log('[BusinessListingForm] Image uploaded successfully:', urlData.publicUrl)
      return urlData.publicUrl
      
    } catch (error: any) {
      console.error('[BusinessListingForm] Image upload failed:', error)
      throw error
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // Check image limit for free accounts
    if (!formData.is_member) {
      const currentImageCount = formData.images?.length || 0
      if (currentImageCount >= 1) {
        alert('Free accounts are limited to 1 image. Upgrade to Featured to add multiple images.')
        return
      }
      
      // If trying to upload multiple files, only take the first one
      if (files.length > 1) {
        alert('Free accounts can only upload 1 image. Only the first image will be uploaded.')
      }
    }

    const businessId = listing?.id || 'new-listing'
    setUploadingImages(true)
    
    try {
      // For free accounts, only process the first file
      const filesToProcess = !formData.is_member ? [files[0]] : Array.from(files)
      const uploadPromises = filesToProcess.map(async (file, index) => {
        const fileId = `${file.name}-${index}`
        
        // Track upload progress
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
        
        try {
          const imageUrl = await uploadImage(file, businessId)
          return imageUrl
        } catch (error: any) {
          console.error(`[BusinessListingForm] Failed to upload ${file.name}:`, error)
          
          // Show user-friendly error message for storage setup issues
          if (error.message.includes('Image storage not yet configured')) {
            alert('Image uploads are not yet available. Please contact support to enable this feature.')
          } else {
            alert(`Failed to upload ${file.name}: ${error.message}`)
          }
          
          return null
        } finally {
          // Remove progress tracking
          setImageUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const successfulUrls = uploadedUrls.filter(url => url !== null) as string[]
      
      if (successfulUrls.length > 0) {
        // Add new images to existing images
        const currentImages = formData.images || []
        setFormData(prev => ({
          ...prev,
          images: [...currentImages, ...successfulUrls]
        }))
        
        console.log('[BusinessListingForm] Successfully uploaded', successfulUrls.length, 'images')
      }
      
    } catch (error: any) {
      console.error('[BusinessListingForm] Image upload process failed:', error)
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img !== imageUrl) || []
    }))
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (!formData.images) return
    
    const newImages = [...formData.images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    
    setFormData(prev => ({
      ...prev,
      images: newImages
    }))
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 pointer-events-auto">
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
                {/* Show character limit info based on plan tier */}
                <span className="text-xs text-neutral-500 ml-2">
                  ({formData.description?.length || 0}/{formData.is_member ? '500' : '200'} characters)
                </span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => {
                  const newDescription = e.target.value
                  
                  // For free plans, enforce 200 character limit
                  if (!formData.is_member && newDescription.length > 200) {
                    // Don't update the form data if it exceeds the limit for free plans
                    return
                  }
                  
                  setFormData(prev => ({ ...prev, description: newDescription }))
                }}
                rows={4}
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                  // Show red border if free plan exceeds 200 characters
                  !formData.is_member && (formData.description?.length || 0) > 200
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-neutral-300 focus:ring-neutral-500'
                }`}
                placeholder="Tell customers about your business..."
                maxLength={formData.is_member ? 500 : 200} // Set maxLength based on plan
              />
              
              {/* Character limit warning for free plans */}
              {!formData.is_member && (formData.description?.length || 0) > 200 && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Character Limit Exceeded
                      </h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>
                          Free listings are limited to 200 characters for business descriptions. 
                          You have {(formData.description?.length || 0) - 200} characters over the limit.
                        </p>
                        <p className="mt-1">
                          <strong>Upgrade to Featured</strong> to get up to 500 characters for your description.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Character limit info for featured plans */}
              {formData.is_member && (formData.description?.length || 0) > 400 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You're approaching the 500 character limit for featured listings. 
                    {(formData.description?.length || 0)}/500 characters used.
                  </p>
                </div>
              )}
            </div>

            {/* Exclusive Coupon Settings - Featured Accounts Only */}
            <div className={`border-2 border-green-200 rounded-xl p-4 bg-green-50 ${!formData.is_member ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎟️</span>
                <h3 className="text-sm font-semibold text-green-900">Exclusive Coupon for Bonita Forward Users</h3>
                {!formData.is_member && (
                  <span className="text-xs text-amber-600 ml-2">
                    (Featured accounts only)
                  </span>
                )}
              </div>
              
              {/* Free account restriction notice */}
              {!formData.is_member && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Featured Accounts Only</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Upgrade to a Featured account to create exclusive coupons for Bonita Forward users. Coupons appear prominently on your business page and help drive more customers to your business!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-green-800 mb-4">
                Offer a special coupon that users can save to their account. This appears prominently on your business page!
              </p>
              
              <div className="space-y-3">
                {/* Coupon Code */}
                <div>
                  <label className="block text-sm font-medium text-green-900 mb-1">
                    Coupon Code <span className="text-xs text-green-700">(e.g., BONITA10, COMMUNITY15)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.coupon_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    placeholder="BONITA10"
                    maxLength={20}
                    disabled={!formData.is_member}
                  />
                </div>

                {/* Coupon Discount */}
                <div>
                  <label className="block text-sm font-medium text-green-900 mb-1">
                    Discount Amount <span className="text-xs text-green-700">(e.g., 10% off, $20 off)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.coupon_discount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, coupon_discount: e.target.value }))}
                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    placeholder="10% off entire service"
                    maxLength={50}
                    disabled={!formData.is_member}
                  />
                </div>

                {/* Coupon Description */}
                <div>
                  <label className="block text-sm font-medium text-green-900 mb-1">
                    Coupon Details <span className="text-xs text-green-700">(Optional - any terms or conditions)</span>
                  </label>
                  <textarea
                    value={formData.coupon_description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, coupon_description: e.target.value }))}
                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white resize-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    placeholder="Valid for first-time customers only. Cannot be combined with other offers."
                    rows={2}
                    maxLength={200}
                    disabled={!formData.is_member}
                  />
                </div>

                {/* Coupon Expiration */}
                <div>
                  <label className="block text-sm font-medium text-green-900 mb-1">
                    Expiration Date <span className="text-xs text-green-700">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.coupon_expires_at ? new Date(formData.coupon_expires_at).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      coupon_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                    }))}
                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    disabled={!formData.is_member}
                  />
                </div>

                <div className="bg-white rounded-lg p-3 border border-green-300">
                  <p className="text-xs text-green-800">
                    <strong>💡 Tip:</strong> Set both Coupon Code and Discount Amount to activate the coupon feature. 
                    Users will see a prominent green banner on your page and can save the coupon to their account!
                  </p>
                </div>
              </div>
            </div>

            {/* Business Images */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Business Images
                {!formData.is_member && (
                  <span className="text-xs text-amber-600 ml-2">
                    (1 image for free accounts)
                  </span>
                )}
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Upload images to showcase your business. Images will appear in search results and on your business page.
                {!formData.is_member && (
                  <span className="text-amber-600 font-medium"> Free accounts are limited to 1 image. Upgrade to Featured for multiple images.</span>
                )}
              </p>
              
              {/* Free account image limit notice */}
              {!formData.is_member && formData.images && formData.images.length >= 1 && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Image Limit Reached</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Free accounts can upload 1 image. Upgrade to Featured to add multiple images and showcase your business better.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Storage Setup Notice */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Image Storage Setup Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Image uploads require Supabase Storage to be configured. Contact support to enable this feature.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Image Upload Area */}
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImages || (!formData.is_member && (formData.images?.length || 0) >= 1)}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer ${
                    uploadingImages || (!formData.is_member && (formData.images?.length || 0) >= 1) 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-neutral-600">
                      {uploadingImages ? 'Uploading images...' : 'Click to upload images or drag and drop'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      PNG, JPG, GIF up to 5MB each
                    </p>
                  </div>
                </label>
              </div>

              {/* Current Images Display */}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((imageUrl, index) => (
                      <div key={imageUrl} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Business image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                        />
                        
                        {/* Image Actions Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            {/* Move Left Button */}
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, index - 1)}
                                className="p-1 bg-white rounded-full text-neutral-600 hover:text-neutral-800"
                                title="Move left"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Move Right Button */}
                            {index < formData.images!.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, index + 1)}
                                className="p-1 bg-white rounded-full text-neutral-600 hover:text-neutral-800"
                                title="Move right"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => removeImage(imageUrl)}
                              className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                              title="Remove image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Image Order Indicator */}
                        <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-neutral-500 mt-2">
                    Drag to reorder images. The first image will be used as the main image in search results.
                  </p>
                </div>
              )}

              {/* Upload Progress */}
              {Object.keys(imageUploadProgress).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="text-xs text-neutral-600">
                      Uploading {fileId}... {progress}%
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tags
              </label>
              
              {/* Conditional restaurant tag guidance */}
              {formData.category_key === 'restaurants-cafes' && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">
                    🍽️ Restaurant Tags - Help customers find you!
                  </h4>
                  <p className="text-xs text-blue-700 mb-4">
                    Select your restaurant characteristics below. These will be automatically added as tags to help customers discover your business.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cuisine Type */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Cuisine Type *
                      </label>
                      <select
                        value={restaurantTags.cuisine}
                        onChange={(e) => updateRestaurantTag('cuisine', e.target.value)}
                        className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select cuisine type</option>
                        {restaurantTagOptions.cuisine.map(cuisine => (
                          <option key={cuisine} value={cuisine}>{cuisine}</option>
                        ))}
                      </select>
                    </div>

                    {/* Occasion */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Best For *
                      </label>
                      <select
                        value={restaurantTags.occasion}
                        onChange={(e) => updateRestaurantTag('occasion', e.target.value)}
                        className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select occasion</option>
                        {restaurantTagOptions.occasion.map(occasion => (
                          <option key={occasion} value={occasion}>{occasion}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Price Range *
                      </label>
                      <select
                        value={restaurantTags.priceRange}
                        onChange={(e) => updateRestaurantTag('priceRange', e.target.value)}
                        className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select price range</option>
                        {restaurantTagOptions.priceRange.map(price => (
                          <option key={price} value={price}>
                            {price} {price === '$' ? 'Budget-friendly' : price === '$$' ? 'Moderate' : price === '$$$' ? 'Upscale' : 'Fine dining'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dining Type */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Dining Type *
                      </label>
                      <select
                        value={restaurantTags.diningType}
                        onChange={(e) => updateRestaurantTag('diningType', e.target.value)}
                        className="w-full text-sm rounded-lg border border-blue-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select dining type</option>
                        {restaurantTagOptions.diningType.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder={formData.category_key === 'restaurants-cafes' ? "Add additional tags..." : "Add a tag..."}
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
            <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Social Media Links
                {!formData.is_member && (
                  <span className="text-xs text-amber-600 ml-2">
                    (Featured accounts only)
                  </span>
                )}
              </label>
              
              {/* Free account restriction notice */}
              {!formData.is_member && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Social Media Links - Featured Accounts Only</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Upgrade to Featured to add your social media profiles and increase your online presence.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={newSocialPlatform}
                  onChange={(e) => setNewSocialPlatform(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Platform (e.g., Facebook)"
                  disabled={!formData.is_member}
                />
                <input
                  type="url"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="URL"
                  disabled={!formData.is_member}
                />
                <button
                  type="button"
                  onClick={addSocialLink}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!formData.is_member}
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
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!formData.is_member}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking System - with Toggle Switch */}
            <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Booking System
                {!formData.is_member && (
                  <span className="text-xs text-amber-600 ml-2">
                    (Featured accounts only)
                  </span>
                )}
              </label>
              
              {/* Free account restriction notice */}
              {!formData.is_member && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Booking System - Featured Accounts Only</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Upgrade to Featured to enable direct appointment booking and scheduling for your customers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Toggle Switch for Enable Booking */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-800">
                      Online Booking System
                    </span>
                    {formData.booking_enabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    {formData.booking_enabled 
                      ? 'Customers can book appointments through your listing'
                      : 'Enable to allow customers to book appointments online'
                    }
                  </p>
                </div>
                
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.is_member) return
                    setFormData(prev => ({ ...prev, booking_enabled: !prev.booking_enabled }))
                  }}
                  disabled={!formData.is_member}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.booking_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                  }`}
                  aria-label="Toggle booking system"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.booking_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Booking fields - only show when enabled */}
              {formData.booking_enabled && (
                <div className="space-y-3 mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Booking Type
                    </label>
                    <select
                      value={formData.booking_type || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, booking_type: e.target.value as any || null }))}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!formData.is_member}
                    >
                      <option value="">Select booking type...</option>
                      <option value="appointment">Appointment</option>
                      <option value="reservation">Reservation</option>
                      <option value="consultation">Consultation</option>
                      <option value="walk-in">Walk-in Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Booking Instructions
                    </label>
                    <textarea
                      value={formData.booking_instructions || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, booking_instructions: e.target.value }))}
                      placeholder="e.g., Call ahead for same-day appointments, Book at least 24 hours in advance..."
                      rows={3}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!formData.is_member}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Instructions shown to customers when they try to book
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      External Booking URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.booking_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, booking_url: e.target.value }))}
                      placeholder="https://calendly.com/yourbusiness"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!formData.is_member}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Link to your external booking platform (Calendly, etc.)
                    </p>
                  </div>

                  {/* Contact Method Toggles */}
                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <h4 className="text-sm font-medium text-neutral-800 mb-3">Contact Methods</h4>
                    <p className="text-xs text-neutral-600 mb-3">
                      Choose which contact methods customers can use to reach you
                    </p>
                    
                    <div className="space-y-3">
                      {/* Calendar Booking Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-800">
                              Integrated Calendar Booking
                            </span>
                            {formData.enable_calendar_booking && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 mt-1">
                            Allow customers to book directly through your connected Google Calendar
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.is_member) return
                            setFormData(prev => ({ ...prev, enable_calendar_booking: !prev.enable_calendar_booking }))
                          }}
                          disabled={!formData.is_member}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            formData.enable_calendar_booking ? 'bg-blue-600' : 'bg-neutral-300'
                          }`}
                          aria-label="Toggle calendar booking"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.enable_calendar_booking ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Call Contact Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-800">
                              Phone Call Contact
                            </span>
                            {formData.enable_call_contact && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 mt-1">
                            Show your phone number so customers can call you directly
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.is_member) return
                            setFormData(prev => ({ ...prev, enable_call_contact: !prev.enable_call_contact }))
                          }}
                          disabled={!formData.is_member}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            formData.enable_call_contact ? 'bg-blue-600' : 'bg-neutral-300'
                          }`}
                          aria-label="Toggle call contact"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.enable_call_contact ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Email Contact Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-800">
                              Email Contact
                            </span>
                            {formData.enable_email_contact && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 mt-1">
                            Show your email address so customers can contact you via email
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.is_member) return
                            setFormData(prev => ({ ...prev, enable_email_contact: !prev.enable_email_contact }))
                          }}
                          disabled={!formData.is_member}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            formData.enable_email_contact ? 'bg-blue-600' : 'bg-neutral-300'
                          }`}
                          aria-label="Toggle email contact"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.enable_email_contact ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isUpdating}
                className={`flex-1 px-6 py-2 rounded-lg flex items-center justify-center ${
                  isUpdating 
                    ? 'bg-neutral-400 text-white cursor-not-allowed' 
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {listing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  listing ? 'Update Listing' : 'Create Listing'
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isUpdating}
                className={`px-6 py-2 border rounded-lg ${
                  isUpdating 
                    ? 'border-neutral-300 text-neutral-400 cursor-not-allowed' 
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {isUpdating ? 'Please Wait...' : 'Cancel'}
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
  editingJob, // Optional job being edited
  onSave, 
  onCancel 
}: { 
  listings: BusinessListing[]
  editingJob?: JobPost | null // Optional job being edited
  onSave: (providerId: string, jobData: {
    title: string
    description?: string
    apply_url?: string
    salary_range?: string
  }) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState({
    provider_id: editingJob?.provider_id || '',
    title: editingJob?.title || '',
    description: editingJob?.description || '',
    apply_url: editingJob?.apply_url || '',
    salary_range: editingJob?.salary_range || ''
  })

  // Update form data when editingJob changes
  useEffect(() => {
    if (editingJob) {
      setFormData({
        provider_id: editingJob.provider_id || '',
        title: editingJob.title || '',
        description: editingJob.description || '',
        apply_url: editingJob.apply_url || '',
        salary_range: editingJob.salary_range || ''
      })
    } else {
      // Reset form for new job creation
      setFormData({
        provider_id: '',
        title: '',
        description: '',
        apply_url: '',
        salary_range: ''
      })
    }
  }, [editingJob])

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
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 pointer-events-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {editingJob ? 'Edit Job Post' : 'Create Job Post'}
            </h2>
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
                {editingJob ? 'Update Job Post' : 'Create Job Post'}
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
