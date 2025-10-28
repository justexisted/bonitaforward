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
 * ==================================================================================
 * 🔧 REFACTORING TODO - FILE SIZE: ~4,900 lines
 * ==================================================================================
 * 
 * This file contains TWO large embedded components that need extraction:
 * 
 * 1. BusinessListingForm (~1,500 lines) - Lines 3173-4676
 *    - Search for: "START: BusinessListingForm"
 *    - Destination: src/pages/MyBusiness/components/BusinessListingForm.tsx
 * 
 * 2. JobPostForm (~240 lines) - Lines 4680-4928
 *    - Search for: "START: JobPostForm"
 *    - Destination: src/pages/MyBusiness/components/JobPostForm.tsx
 * 
 * Detailed extraction instructions are at each component's START marker.
 * See also: src/pages/MyBusiness/REFACTORING_GUIDE.md
 * 
 * ==================================================================================
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
import { type PlanChoice } from '../utils/planChoiceDb'
import { Link, useLocation } from 'react-router-dom'
import { type ProviderChangeRequest, dismissNotification as dismissNotificationDB, getLatestActivityTimestamp, type DismissedNotification } from '../lib/supabaseData'

// Import mobile optimizations CSS
import './MyBusiness/mobile-optimizations.css'

// Import extracted components
import { BusinessListingForm, JobPostForm, FeaturedUpgradeCard, PlanSelectionSection, BusinessListingCard, ApplicationCard, ApplicationsEmptyState, JobPostCard, JobPostsNoListingsState, JobPostsEmptyState, ChangeRequestsNotifications, ChangeRequestsList } from './MyBusiness/components'
// import { PlanSelector } from './MyBusiness/components/PlanSelector' // Available but not used yet
// import { useBusinessData, useImageUpload } from './MyBusiness/hooks' // Available but not integrated yet
// import { BUSINESS_CATEGORIES } from './MyBusiness/utils' // Available but not used yet

// Import type definitions from centralized types file
import type { BusinessListing, BusinessApplication, JobPost, UserActivity } from './MyBusiness/types'

// Import tab configuration utilities
import { createTabsConfig, getNonFeaturedChangeRequests, type TabKey } from './MyBusiness/utils/tabs'

// Import custom hooks
import { useBusinessOperations } from './MyBusiness/hooks/useBusinessOperations'

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
  const [activeTab, setActiveTab] = useState<TabKey>('listings')
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
  
  
  // State for collapsible change requests section
  const [showChangeRequests, setShowChangeRequests] = useState(false)
  
  // State for featured upgrade success modal
  const [showFeaturedUpgradeModal, setShowFeaturedUpgradeModal] = useState(false)

  // Initialize business operations hook with all required state setters
  const businessOps = useBusinessOperations({
    auth: { userId: auth.userId, email: auth.email || '', name: auth.name },
    setMessage,
    setLoading,
    setListings,
    setApplications,
    setJobPosts,
    setChangeRequests,
    setUserActivity,
    setDismissedNotifications,
    setShowSubscriptionCard,
    setUserPlanChoice,
    setEditingListing,
    setShowCreateForm,
    isUpdating,
    setIsUpdating,
    listings,
    applications
  })

  // Destructure business operations for easier use
  const {
    loadBusinessData,
    checkUserPlanChoice,
    requestFreeListingFromApp,
    selectFreeAccount,
    upgradeToFeatured: upgradeToFeaturedOriginal,
    downgradeToFree,
    promptAndUploadImages,
    createBusinessListing,
    updateBusinessListing,
    deleteBusinessListing
  } = businessOps
  
  // Wrapper for upgradeToFeatured that shows the modal after submission
  const upgradeToFeatured = async (listingId?: string) => {
    await upgradeToFeaturedOriginal(listingId)
    // Show modal to confirm submission and inform about admin approval
    setShowFeaturedUpgradeModal(true)
    // Scroll to top so user sees any other notifications too
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  /**
   * TAB CONFIGURATION
   * 
   * Uses utility function to create tab configuration with counts.
   * Tabs are used for both the dropdown menu and tab display logic.
   */
  const tabs = createTabsConfig(listings, applications, jobPosts, changeRequests, userActivity)
  const nonFeaturedChangeRequests = getNonFeaturedChangeRequests(listings, changeRequests)
  
  // Get current tab information for dropdown display
  const currentTab = tabs.find(tab => tab.key === activeTab) || tabs[0]

  /**
   * HANDLE TAB SELECTION
   * 
   * This function handles tab selection from the dropdown menu.
   * It closes the dropdown and updates the active tab.
   */
  const handleTabSelect = (tabKey: TabKey) => {
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
  // loadBusinessData function now provided by useBusinessOperations hook

  // checkUserPlanChoice, requestFreeListingFromApp, selectFreeAccount, and upgradeToFeatured functions now provided by useBusinessOperations hook

  // promptAndUploadImages and createBusinessListing functions now provided by useBusinessOperations hook

  // updateBusinessListing function now provided by useBusinessOperations hook

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
  // deleteBusinessListing function now provided by useBusinessOperations hook

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
      <section className="py-2 sm:py-4 md:py-8 px-2 sm:px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
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
      <section className="py-2 sm:py-4 md:py-8 px-2 sm:px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
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
    <section className="py-2 sm:py-4 md:py-8 px-2 sm:px-4 md:px-6 my-business-container">
      <div className="mx-auto max-w-6xl">

        {message && (
          <div className="my-business-mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 my-business-card">
            <p className="text-blue-800 my-business-text-sm">{message}</p>
          </div>
        )}


        {/* Featured Upgrade Confirmation - Inline Card */}
        {showFeaturedUpgradeModal && (
          <FeaturedUpgradeCard onDismiss={() => setShowFeaturedUpgradeModal(false)} />
        )}

        {/* Subscription Comparison Section - hidden if any listing is featured */}
        {showSubscriptionCard && listings.every(l => !l.is_member) && (
          <PlanSelectionSection
            onSelectFree={selectFreeAccount}
            onSelectFeatured={() => upgradeToFeatured()}
          />
        )}

        {/* Change Requests Status Section */}
        <ChangeRequestsNotifications
          changeRequests={changeRequests}
          listings={listings}
          showChangeRequests={showChangeRequests}
          setShowChangeRequests={setShowChangeRequests}
          shouldShowNotification={shouldShowNotification}
          dismissNotification={dismissNotification}
          setActiveTab={setActiveTab}
        />

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
                className="inline-flex justify-between w-full rounded-xl border border-neutral-300 shadow-sm px-4 py-3 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-100 focus:ring-blue-500 my-business-dropdown-btn"
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
          <div className="space-y-4 my-business-space-y-4">
            {/* Header with Create Button */}
            <div className="flex flex-wrap items-center justify-between my-business-gap-2">
              <div className="p-[1vh] m-[1vh]">
                <h2 className="text-lg font-semibold my-business-heading-lg">Your Business Listings</h2>
                <p className="text-sm text-neutral-600 my-business-text-sm">Manage your business listings and details</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 my-business-btn"
              >
                + Create New Listing
              </button>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 p-3 sm:p-4 md:p-6 lg:p-8 bg-white text-center my-business-empty-state">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 my-business-empty-icon">
                    <svg className="w-8 h-8 text-blue-600 my-business-icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2 my-business-heading-xl">No Business Listings</h3>
                  <p className="text-neutral-600 mb-6 my-business-text-sm">You don't have any business listings yet. Create your first one to get started!</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors my-business-btn-lg"
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
                <BusinessListingCard
                  key={listing.id}
                  listing={listing}
                  changeRequests={changeRequests}
                  onEdit={(listing) => {
                    console.log('[MyBusiness] Edit button clicked for listing:', listing.id, listing.name)
                    setEditingListing(listing)
                  }}
                  onUpgradeToFeatured={upgradeToFeatured}
                  onPromptAndUploadImages={promptAndUploadImages}
                  onConnectGoogleCalendar={connectGoogleCalendar}
                  onDisconnectGoogleCalendar={disconnectGoogleCalendar}
                  onDowngradeToFree={downgradeToFree}
                  onDelete={deleteBusinessListing}
                  connectingCalendar={connectingCalendar}
                />
              ))
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <ApplicationsEmptyState />
            ) : (
              applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onRequestFreeListing={requestFreeListingFromApp}
                />
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
              <JobPostsNoListingsState 
                onCreateListing={() => {
                  setShowCreateForm(true)
                  setActiveTab('listings')
                }}
              />
            ) : jobPosts.length === 0 ? (
              <JobPostsEmptyState onCreateJob={() => setShowJobForm(true)} />
            ) : (
              jobPosts.map((job) => (
                <JobPostCard
                  key={job.id}
                  job={job}
                  onEdit={(job) => {
                    setEditingJob(job)
                    setShowJobForm(true)
                  }}
                  onDelete={deleteJobPost}
                />
              ))
            )}
          </div>
        )}

        {/* Change Requests Tab */}
        {activeTab === 'change-requests' && (
          <ChangeRequestsList
            nonFeaturedChangeRequests={nonFeaturedChangeRequests}
            listings={listings}
            cancelChangeRequest={cancelChangeRequest}
          />
        )}

        {/* User Activity Tab */}
        {activeTab === 'user-activity' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-100 p-2 sm:p-3 md:p-4 lg:p-6 bg-white">
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




