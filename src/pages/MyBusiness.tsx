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
import { BusinessListingForm } from './MyBusiness/components/BusinessListingForm'
import { JobPostForm } from './MyBusiness/components/JobPostForm'
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
    upgradeToFeatured,
    downgradeToFree,
    promptAndUploadImages,
    createBusinessListing,
    updateBusinessListing,
    deleteBusinessListing
  } = businessOps


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
    <section className="py-8 my-business-container">
      <div className="container-px mx-auto max-w-6xl">

        {message && (
          <div className="my-business-mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 my-business-card">
            <p className="text-blue-800 my-business-text-sm">{message}</p>
          </div>
        )}

        {/* Subscription Comparison Section - hidden if any listing is featured */}
        {showSubscriptionCard && listings.every(l => !l.is_member) && (
          <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm my-business-plan-card">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 text-center my-business-heading-xl">Choose Your Business Plan</h2>
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
                className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium my-business-btn-lg"
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
                className="w-full mt-4 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium my-business-btn-lg"
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
              <div className="rounded-2xl border border-neutral-100 p-6 sm:p-8 bg-white text-center my-business-empty-state">
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
                <div key={listing.id} className="rounded-2xl border border-neutral-200 p-4 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow my-business-card">
                  <div className="space-y-4 my-business-space-y-4">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:items-center sm:justify-between gap-3 my-business-gap-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-neutral-900 mb-2 my-business-heading-lg">{listing.name}</h3>
                        <div className="flex flex-wrap gap-2 my-business-gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium my-business-badge ${
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
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 my-business-badge">
                                ⏳ Changes Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800 my-business-badge">
                                ✓ Live
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 my-business-action-group my-business-gap-2">
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
                                    className="w-full h-20 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200 bg-white"
                                    loading="lazy"
                                    onError={(e) => {
                                      console.error('[MyBusiness] Image failed to load:', imageUrl)
                                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f5f5f5" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E'
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                                    <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </div>
                                  <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full pointer-events-none">
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
                                  className="w-full h-20 sm:h-24 md:h-28 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200 hover:scale-105 bg-white"
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error('[MyBusiness] Image failed to load:', imageUrl)
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f5f5f5" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E'
                                  }}
                                />
                                <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                                {/* Image counter badge */}
                                <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full pointer-events-none">
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




