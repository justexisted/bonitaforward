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
import { BusinessListingForm, JobPostForm, FeaturedUpgradeCard, PlanSelectionSection, ApplicationCard, ApplicationsEmptyState, ChangeRequestsNotifications, ChangeRequestsList, UserActivityTab, ListingsTab, HistoricalRequestsTab, JobPostsTab, TabDropdownNav } from './MyBusiness/components'
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
        <TabDropdownNav
          tabs={tabs}
          activeTab={activeTab}
          isDropdownOpen={isDropdownOpen}
          onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
          onSelectTab={handleTabSelect}
        />

        {/* Business Listings Tab */}
        {activeTab === 'listings' && (
          <ListingsTab
            listings={listings}
            changeRequests={changeRequests}
            onCreateNew={() => setShowCreateForm(true)}
            onEdit={setEditingListing}
            onUpgradeToFeatured={upgradeToFeatured}
            onPromptAndUploadImages={promptAndUploadImages}
            onConnectGoogleCalendar={connectGoogleCalendar}
            onDisconnectGoogleCalendar={disconnectGoogleCalendar}
            onDowngradeToFree={downgradeToFree}
            onDelete={deleteBusinessListing}
            connectingCalendar={connectingCalendar}
          />
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
          <JobPostsTab
            jobPosts={jobPosts}
            listings={listings}
            onCreateJob={() => setShowJobForm(true)}
            onCreateListing={() => {
              setShowCreateForm(true)
              setActiveTab('listings')
            }}
            onEditJob={(job) => {
              setEditingJob(job)
              setShowJobForm(true)
            }}
            onDeleteJob={deleteJobPost}
          />
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
          <UserActivityTab userActivity={userActivity} />
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
          <HistoricalRequestsTab
            status="approved"
            nonFeaturedChangeRequests={nonFeaturedChangeRequests}
            listings={listings}
          />
        )}

        {/* Recently Rejected Tab */}
        {activeTab === 'recently-rejected' && (
          <HistoricalRequestsTab
            status="rejected"
            nonFeaturedChangeRequests={nonFeaturedChangeRequests}
            listings={listings}
          />
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




