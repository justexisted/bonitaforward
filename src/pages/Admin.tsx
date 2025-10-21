import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
// Blog imports moved to BlogSection component (Step 10)
import { type CalendarEvent } from './Calendar'
// iCalendar parsing moved to server-side Netlify function for reliability
// import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'
import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'
// Provider management utilities (extracted for better organization)
import * as ProviderUtils from '../utils/adminProviderUtils'
import { BlogSection } from '../components/admin/sections/BlogSection-2025-10-19'
import { JobPostsSection } from '../components/admin/sections/JobPostsSection-2025-10-19'
import { ChangeRequestsSection } from '../components/admin/sections/ChangeRequestsSection-2025-10-19'
import { CalendarEventsSection } from '../components/admin/sections/CalendarEventsSection-2025-10-19'
import { FlaggedEventsSection } from '../components/admin/sections/FlaggedEventsSection-2025-10-19'
import { CustomerUsersSection } from '../components/admin/sections/CustomerUsersSection-2025-10-19'
import { ContactLeadsSection } from '../components/admin/sections/ContactLeadsSection-2025-10-19'
import { BusinessAccountsSection } from '../components/admin/sections/BusinessAccountsSection-2025-10-19'
import { UsersSection } from '../components/admin/sections/UsersSection-2025-10-19'
import { FunnelResponsesSection } from '../components/admin/sections/FunnelResponsesSection-2025-10-19'
import { BookingsSection } from '../components/admin/sections/BookingsSection-2025-10-19'
import { BusinessApplicationsSection } from '../components/admin/sections/BusinessApplicationsSection-2025-10-19'
import { BookingEventsSection } from '../components/admin/sections/BookingEventsSection-2025-10-19'
import { ProvidersSection } from '../components/admin/sections/ProvidersSection-2025-10-19'

// ============================================================================
// GRADUAL MIGRATION: New Service Layer
// ============================================================================
// Importing new data management infrastructure for gradual migration
// The hook runs in parallel with existing state - both systems work together
// This allows incremental migration without breaking existing functionality
import { useAdminData } from '../hooks/useAdminData'
// Type imported for future use in Phase 2 (section type safety)
import type { AdminSection as _AdminSection } from '../types/admin'
// ============================================================================

// Extended type for change requests with joined provider and profile data
type ProviderChangeRequestWithDetails = ProviderChangeRequest & {
  providers?: {
    id: string
    name: string
    email: string | null
  }
  profiles?: {
    id: string
    email: string
    name: string | null
  }
}

// Extended type for job posts with provider information
type ProviderJobPostWithDetails = ProviderJobPost & {
  provider?: {
    id: string
    name: string
    email: string | null
  }
  owner?: {
    id: string
    email: string
    name: string | null
  }
}

export type ProviderRow = {
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
  is_member?: boolean | null
  // Enhanced featured provider tracking fields
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null // 'monthly' or 'yearly'
  // REMOVED: tier?: string | null - This column doesn't exist in the database
  // REMOVED: paid?: boolean | null - This column doesn't exist in the database
  // Using existing subscription_type, is_member, is_featured fields instead
  // Enhanced business management fields (matching My Business page)
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  bonita_resident_discount?: string | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  // Contact method toggles
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  // Coupon system fields
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
}

type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null          // ⚠️ Database uses 'category' NOT 'category_key'
  challenge: string | null         // Contains JSON string with all business details
  created_at: string
  tier_requested: string | null    // 'free' or 'featured'
  status: string | null            // 'pending', 'approved', or 'rejected'
}

type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * Admin page (per-user): Lists the authenticated user's saved funnel responses and bookings.
 * Requires RLS policies to allow users to select their own rows.
 * 
 * GRADUAL MIGRATION STATUS:
 * - Phase 1: ✅ NEW service layer running in parallel with existing code
 * - Phase 2: 🔄 Gradually replacing old state with new hook data
 * - Phase 3: ⏳ Replace Supabase calls with AdminDataService
 * - Phase 4: ⏳ Remove old state and data loading code
 */
export default function AdminPage() {
  const auth = useAuth()
  
  // DEBUG: Log on mount
  useEffect(() => {
    console.log('=== ADMIN PAGE MOUNTED ===')
    console.log('[Admin] Initial auth state:', {
      email: auth.email,
      loading: auth.loading,
      isAuthed: auth.isAuthed,
      userId: auth.userId
    })
  }, [])
  
  // ============================================================================
  // NEW: Service-Based Data Management (Phase 1)
  // ============================================================================
  // This hook loads all admin data in parallel and provides refresh capabilities
  // Currently running alongside existing state - both systems work together
  const { 
    data: adminData, 
    loading: adminDataLoading,
    error: adminDataError,
    refresh: _refreshAdminData,  // Prefixed: Will use in refresh buttons (Phase 2)
    refreshEntity: _refreshEntity  // Prefixed: Will use after updates (Phase 2)
  } = useAdminData()
  
  // Log hook status for debugging during migration
  useEffect(() => {
    if (adminData) {
      console.log('[Admin Migration] New data service loaded:', {
        providers: adminData.providers?.length || 0,
        bookings: adminData.bookings?.length || 0,
        funnels: adminData.funnels?.length || 0,
        calendarEvents: adminData.calendarEvents?.length || 0
      })
    }
    if (adminDataError) {
      console.error('[Admin Migration] Data service error:', adminDataError)
    }
  }, [adminData, adminDataError])
  
  // ============================================================================
  // OLD: Legacy State Management (To be phased out)
  // ============================================================================
  // These state variables will be gradually replaced with adminData from the hook above
  // Keeping them for now to ensure existing functionality continues to work
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingEvents, setBookingEvents] = useState<Array<{
    id: string
    provider_id: string
    customer_email: string
    customer_name: string | null
    booking_date: string
    booking_duration_minutes: number | null
    booking_notes: string | null
    status: string | null
    created_at: string
    providers?: {
      name: string
      category_key: string
      address: string | null
      phone: string | null
    }
  }>>([])
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [flaggedEvents, setFlaggedEvents] = useState<Array<{
    id: string
    event_id: string
    user_id: string
    reason: string
    details: string | null
    created_at: string
    event?: CalendarEvent
    reporter_email?: string
  }>>([])
  const [loading, setLoading] = useState(true)
  
  // PHASE 1 IMPROVEMENT: Combine loading states for better UX
  // Show loading if EITHER system is still loading data
  const isLoading = loading || adminDataLoading

  // Calendar event functions moved to CalendarEventsSection component (Step 13)
  
  // Old client-side refresh kept as fallback (CORS issues make this unreliable)
  // Use refreshICalFeedsServer() instead
  /* const refreshICalFeeds = async () => {
    try {
      // console.log('Refreshing iCalendar feeds (client-side)...')
      const icalEvents = await parseMultipleICalFeeds(ICAL_FEEDS)
      const calendarEvents = icalEvents.map(convertICalToCalendarEvent)
      
      if (calendarEvents.length === 0) {
        setMessage('No events found in iCalendar feeds')
        return
      }
      
      // Clear existing iCalendar events (those with source matching our feeds)
      const icalSources = ICAL_FEEDS.map(feed => feed.source)
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('source', icalSources)
      
      if (deleteError) {
        console.warn('Error clearing existing iCalendar events:', deleteError)
      }
      
      // Add new iCalendar events
      await addMultipleEvents(calendarEvents)
      setMessage(`Successfully refreshed ${calendarEvents.length} events from iCalendar feeds!`)
    } catch (error) {
      console.error('Error refreshing iCalendar feeds:', error)
      setError('Failed to refresh iCalendar feeds: ' + error)
    }
  } */
  const [error, setError] = useState<string | null>(null)
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  // Blog state moved to BlogSection component (Step 10)
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [jobPosts, setJobPosts] = useState<ProviderJobPostWithDetails[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deletingCustomerEmail, setDeletingCustomerEmail] = useState<string | null>(null)
  // STEP 12: expandedChangeRequestIds and expandedBusinessDropdowns deleted - moved to ChangeRequestsSection
  // STEP 19: editFunnel and funnelUserFilter deleted - moved to FunnelResponsesSection
  // STEP 20: editBooking deleted - moved to BookingsSection
  const [expandedBusinessDetails, setExpandedBusinessDetails] = useState<Record<string, any>>({})
  const [loadingBusinessDetails, setLoadingBusinessDetails] = useState<Record<string, boolean>>({})
  // Featured provider filter moved to ContactLeadsSection component (Step 16)
  // Loading state for provider save operations
  const [savingProvider, setSavingProvider] = useState(false)
  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false)
  // Retry state for failed saves
  const [retryProvider, setRetryProvider] = useState<ProviderRow | null>(null)
  // State for selected provider being edited
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  // State for creating new provider
  const [isCreatingNewProvider, setIsCreatingNewProvider] = useState(false)
  const [newProviderForm, setNewProviderForm] = useState<Partial<ProviderRow>>({
    name: '',
    category_key: 'professional-services',
    tags: [],
    badges: [],
    rating: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    images: [],
    owner_user_id: null,
    is_member: false,
    is_featured: false,
    featured_since: null,
    subscription_type: null,
    description: null,
    specialties: null,
    social_links: null,
    business_hours: null,
    service_areas: null,
    google_maps_url: null,
    bonita_resident_discount: null,
    published: true,
    created_at: null,
    updated_at: null,
    booking_enabled: false,
    booking_type: null,
    booking_instructions: null,
    booking_url: null
  })
  // State for selected section
  const [section, setSection] = useState< 'providers' |'business-applications' | 'contact-leads' | 'customer-users' | 'business-accounts' | 'business-owners' | 'users' | 'owner-change-requests' | 'job-posts' | 'funnel-responses' | 'bookings' | 'booking-events' | 'blog' | 'calendar-events' | 'flagged-events'>('providers')

  // Filtered providers logic moved to ContactLeadsSection component (Step 16)

  // REFACTORED: Moved to adminProviderUtils.ts
  const toggleFeaturedStatus = (providerId: string, currentStatus: boolean) => 
    ProviderUtils.toggleFeaturedStatus(providerId, currentStatus, setMessage, setError, setProviders)

  // REFACTORED: Moved to adminProviderUtils.ts
  const updateSubscriptionType = (providerId: string, subscriptionType: 'monthly' | 'yearly') =>
    ProviderUtils.updateSubscriptionType(providerId, subscriptionType, setMessage, setError, setProviders)

  /**
   * LOAD CHANGE REQUESTS
   * 
   * This function loads all change requests from the database for admin review.
   * It fetches all change requests ordered by creation date (newest first).
   * 
   * How it works:
   * 1. Queries the provider_change_requests table
   * 2. Orders by created_at descending to show newest requests first
   * 3. Updates the changeRequests state with the fetched data
   * 
   * This provides the admin with a complete list of all pending change requests.
   */
  const loadChangeRequests = async () => {
    try {
      console.log('[Admin] STARTING loadChangeRequests')
      
      // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
      // refreshSession() was causing the auth state to be cleared, signing out the user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[Admin] ❌ Session get failed:', sessionError)
        setError('Session error. Please refresh the page and sign in again.')
        return
      }
      
      if (!session?.access_token) {
        console.error('[Admin] ❌ No auth token available')
        setError('Not authenticated. Please refresh the page and sign in again.')
        return
      }

      console.log('[Admin] ✓ Session acquired, auth token obtained')

      // Call Netlify function that uses service role to bypass RLS and auto-create missing profiles
      // Use relative URL for Netlify functions (works in both dev and production)
      const url = '/.netlify/functions/admin-list-change-requests'
      // console.log('[Admin] Fetching from:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // console.log('[Admin] Response received:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok
      // })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Admin] ❌ Error response body:', errorText)
        setError(`Failed to load change requests (HTTP ${response.status}): ${errorText}`)
        return
      }

      const result = await response.json()
      // console.log('[Admin] ✓ JSON parsed successfully')
      // console.log('[Admin] Result structure:', {
      //   hasRequests: !!result.requests,
      //   requestCount: result.requests?.length || 0,
      //   firstRequest: result.requests?.[0] ? {
      //     id: result.requests[0].id,
      //     type: result.requests[0].type,
      //     hasProfiles: !!result.requests[0].profiles,
      //     profileEmail: result.requests[0].profiles?.email,
      //     profileName: result.requests[0].profiles?.name
      //   } : 'No requests'
      // })
      
      if (!result.requests) {
        console.error('[Admin] ❌ Result has no requests property:', result)
        setError('Invalid response from server')
        return
      }
      
      console.log('[Admin] ✓ Setting changeRequests state with', result.requests.length, 'items')  // KEPT: Change request logging
      setChangeRequests(result.requests)
      // console.log('[Admin] ✓ State updated successfully')
      // console.log('========================================')
      
    } catch (error: any) {
      console.error('========================================')
      console.error('[Admin] ❌ EXCEPTION in loadChangeRequests:', error)
      console.error('[Admin] Error stack:', error.stack)
      console.error('========================================')
      setError(`Failed to load change requests: ${error.message}`)
    }
  }

  const loadJobPosts = async () => {
    try {
      console.log('[Admin] STARTING loadJobPosts')
      
      // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.error('[Admin] No session token available for job posts')
        setError('Session error. Please refresh the page.')
        return
      }

      // Call Netlify function with service role to bypass RLS
      // For development, use relative URL since local Netlify functions may not be running
      const url = '/.netlify/functions/admin-list-job-posts'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Admin] Job posts function error:', response.status, errorText)
        throw new Error(`Function call failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        console.error('[Admin] Function returned error:', result.error)
        throw new Error(result.error)
      }

      // Process the job posts data
      const jobPostsData = result.jobPosts || []
      console.log('[Admin] ✓ Received', jobPostsData.length, 'job posts from function')
      
      // Update state with the fetched data
      setJobPosts(jobPostsData)
      
    } catch (error: any) {
      console.error('[Admin] ❌ EXCEPTION in loadJobPosts:', error)
      setError(`Failed to load job posts: ${error.message}`)
      setJobPosts([])
    }
  }

  const loadBookingEvents = async () => {
    try {
      console.log('[Admin] STARTING loadBookingEvents')
      
      // FIXED: Use getSession() instead of refreshSession() to avoid clearing auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        console.error('[Admin] No session token available for booking events')
        setError('Session error. Please refresh the page.')
        return
      }

      // Try to call Netlify function with service role to bypass RLS
      // Fall back to direct query if function not available (local dev)
      const url = '/.netlify/functions/admin-list-booking-events'
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}) // No customer email filter - get all bookings
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.warn('[Admin] Booking events function error:', response.status, errorText)
          throw new Error(`Function call failed: ${response.status}`)
        }

        const result = await response.json()

        if (result.error) {
          console.warn('[Admin] Function returned error:', result.error)
          throw new Error(result.error)
        }

        // Process the booking events data
        const bookingEventsData = result.bookingEvents || []
        console.log('[Admin] ✓ Received', bookingEventsData.length, 'booking events from function')
        
        // Update state with the fetched data
        setBookingEvents(bookingEventsData)
      } catch (fetchError: any) {
        // Fallback: Try direct Supabase query (may hit RLS in production)
        console.warn('[Admin] Netlify function unavailable, trying direct query:', fetchError.message)
        
        try {
          const { data, error: directError } = await supabase
            .from('booking_events')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (directError) {
            console.warn('[Admin] Direct query also failed (expected if RLS not configured):', directError.message)
            setBookingEvents([])
          } else {
            console.log('[Admin] ✓ Loaded', data?.length || 0, 'booking events via direct query')
            setBookingEvents(data || [])
          }
        } catch (directQueryError) {
          console.warn('[Admin] Direct query error:', directQueryError)
          setBookingEvents([])
        }
      }
      
    } catch (error: any) {
      console.error('[Admin] ❌ EXCEPTION in loadBookingEvents:', error)
      setBookingEvents([])
    }
  }

  // Blog editor effects moved to BlogSection component (Step 10)

  // Restore admin state when page loads
  useEffect(() => {
    const savedState = localStorage.getItem('admin-state')
    if (savedState) {
      try {
        const { section: savedSection, selectedProviderId: savedProviderId, timestamp } = JSON.parse(savedState)
        
        // Only restore if it's recent (within 2 hours)
        if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
          setSection(savedSection)
          setSelectedProviderId(savedProviderId)
        }
      } catch (err) {
        console.error('Failed to restore admin state:', err)
      }
    }
  }, [])

  // Save admin state when it changes
  useEffect(() => {
    if (section === 'providers' && selectedProviderId) {
      localStorage.setItem('admin-state', JSON.stringify({
        section: 'providers',
        selectedProviderId: selectedProviderId,
        timestamp: Date.now()
      }))
    }
  }, [section, selectedProviderId])

  // Clear saved state function
  const clearSavedState = () => {
    localStorage.removeItem('admin-state')
    setSelectedProviderId(null)
  }

  // Function to start creating a new provider
  const startCreateNewProvider = () => {
    setIsCreatingNewProvider(true)
    setSelectedProviderId(null) // Clear any selected provider
    setMessage(null)
    setError(null)
    // Reset form to default values
    setNewProviderForm({
      name: '',
      category_key: 'professional-services',
      tags: [],
      badges: [],
      rating: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      images: [],
      owner_user_id: null,
      is_member: false,
      is_featured: false,
      featured_since: null,
      subscription_type: null,
      description: null,
      specialties: null,
      social_links: null,
      business_hours: null,
      service_areas: null,
      google_maps_url: null,
      bonita_resident_discount: null,
      published: true,
      created_at: null,
      updated_at: null,
      booking_enabled: false,
      booking_type: null,
      booking_instructions: null,
      booking_url: null
    })
  }

  // Function to cancel creating new provider
  const cancelCreateProvider = () => {
    setIsCreatingNewProvider(false)
    setSelectedProviderId(null)
    setMessage(null)
    setError(null)
    // Reset form to default values
    setNewProviderForm({
      name: '',
      category_key: 'professional-services',
      tags: [],
      badges: [],
      rating: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      images: [],
      owner_user_id: null,
      is_member: false,
      is_featured: false,
      featured_since: null,
      subscription_type: null,
      description: null,
      specialties: null,
      social_links: null,
      business_hours: null,
      service_areas: null,
      google_maps_url: null,
      bonita_resident_discount: null,
      published: true,
      created_at: null,
      updated_at: null,
      booking_enabled: false,
      booking_type: null,
      booking_instructions: null,
      booking_url: null
    })
  }

  // Blog editor functions moved to BlogSection component (Step 10)
  // Secure server-side admin verification with client-side fallback
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean
    loading: boolean
    verified: boolean
    error?: string
  }>({ isAdmin: false, loading: true, verified: false })
  
  // Legacy client-side check for fallback
  // CRITICAL FIX: Memoize adminList to prevent unnecessary recalculations
  // Without this, adminList gets a new reference on every render, causing isClientAdmin 
  // to recalculate and potentially trigger auth state changes that sign out the user
  const adminList = useMemo(() => {
    const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
    return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  }, []) // Empty deps - admin emails don't change during runtime
  
  const isClientAdmin = useMemo(
    () => !!auth.email && adminList.includes(auth.email.toLowerCase()), 
    [auth.email, adminList]
  )

  /**
   * CRITICAL FIX: Admin verification race condition
   * 
   * Issue: Admin verification re-runs during auth state changes, causing isAdmin to flip from true to false.
   * 
   * Root cause: useEffect runs on every auth.email change, including during auth initialization.
   * During auth state transitions, auth.email might be temporarily undefined or the verification fails.
   * 
   * Fix: Only run verification once when auth is fully loaded, and cache the result.
   */
  useEffect(() => {
    async function verifyAdmin() {
      console.log('=== ADMIN VERIFICATION START ===')
      console.log('[Admin] Auth state:', { 
        email: auth.email, 
        loading: auth.loading,
        isAuthed: auth.isAuthed,
        userId: auth.userId
      })
      console.log('[Admin] Current adminStatus:', adminStatus)
      console.log('[Admin] isClientAdmin:', isClientAdmin)
      
      if (!auth.email) {
        console.log('[Admin] ❌ No email, setting admin status to false')
        setAdminStatus({ isAdmin: false, loading: false, verified: false })
        return
      }

      // CRITICAL: Don't re-verify if already verified for this email
      if (adminStatus.verified && adminStatus.isAdmin && auth.email) {
        console.log('[Admin] ✓ Already verified as admin, skipping re-verification')
        return
      }

      // CRITICAL: Don't verify during auth loading to prevent race conditions
      if (auth.loading) {
        console.log('[Admin] ⏳ Auth still loading, skipping verification')
        return
      }

      console.log('[Admin] 🔍 Starting admin verification for:', auth.email)
      setAdminStatus(prev => ({ ...prev, loading: true }))

      try {
        console.log('[Admin] Getting session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Admin] Session result:', { 
          hasSession: !!session, 
          hasToken: !!session?.access_token,
          sessionError: sessionError?.message 
        })
        
        const token = session?.access_token
        
        if (!token) {
          console.log('[Admin] ⚠️ No auth token, using client-side admin check:', isClientAdmin)
          setAdminStatus({ isAdmin: isClientAdmin, loading: false, verified: false })
          return
        }

        // Use relative URL for Netlify functions (works in both dev and production)
        const url = '/.netlify/functions/admin-verify'
        console.log('[Admin] 📡 Making server verification request to:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      })
      
        console.log('[Admin] Server response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        })

        if (response.ok) {
          const result = await response.json()
          console.log('[Admin] ✅ Server verification SUCCESS:', result)
          setAdminStatus({
            isAdmin: result.isAdmin,
            loading: false,
            verified: true
          })
        } else {
          const errorText = await response.text()
          console.log('[Admin] ❌ Server verification FAILED:', {
            status: response.status,
            error: errorText
          })
          console.log('[Admin] Falling back to client-side check:', isClientAdmin)
          // Fallback to client-side check if server verification fails
          setAdminStatus({
            isAdmin: isClientAdmin,
            loading: false,
            verified: false,
            error: 'Server verification unavailable'
          })
        }
      } catch (err: any) {
        console.log('[Admin] ❌ Exception during verification:', err)
        console.log('[Admin] Error details:', {
          message: err?.message,
          stack: err?.stack
        })
        console.log('[Admin] Falling back to client-side check:', isClientAdmin)
        // Fallback to client-side check on error
        setAdminStatus({
          isAdmin: isClientAdmin,
          loading: false,
          verified: false,
          error: 'Server verification failed'
        })
      }
      console.log('=== ADMIN VERIFICATION END ===')
    }

    /**
     * CRITICAL FIX: Prevent re-verification during auth state changes
     * 
     * Issue: useEffect was running on every isClientAdmin change, which happens
     * during auth state updates, causing admin status to flip from true to false.
     * 
     * Root cause: isClientAdmin is a computed value that changes during auth updates,
     * triggering unnecessary re-verification that fails.
     * 
     * Fix: Only run verification when email changes AND auth is not loading.
     * Remove isClientAdmin from dependencies to prevent unnecessary re-runs.
     */
    
    // Only verify when email changes and auth is stable (not loading)
    if (!auth.loading) {
    verifyAdmin()
    }
  }, [auth.email, auth.loading]) // Removed isClientAdmin dependency

  const isAdmin = adminStatus.isAdmin
  
  // DEBUG: Log when isAdmin changes
  useEffect(() => {
    console.log('[Admin] 🔐 isAdmin changed to:', isAdmin, 'adminStatus:', adminStatus)
  }, [isAdmin, adminStatus])
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!auth.email) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        // console.log('[Admin] loading data. isAdmin?', isAdmin, 'selectedUser', selectedUser)
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', auth.email!)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', auth.email!)
        // CRITICAL: Only load PENDING applications (not approved/rejected)
        // This prevents showing already-processed applications in the admin panel
        const bizQuery = supabase
          .from('business_applications')
          .select('*')
          .or('status.eq.pending,status.is.null')  // Include pending OR null (legacy apps)
          .order('created_at', { ascending: false })
        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })
        // Enhanced providers query with all featured tracking fields
        const provQuery = isAdmin ? supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url, enable_calendar_booking, enable_call_contact, enable_email_contact, coupon_code, coupon_discount, coupon_description, coupon_expires_at')
          .order('name', { ascending: true }) : null
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }, provRes] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
          provQuery as any,
        ])
        if (cancelled) return
        if (fErr) { console.error('[Admin] funnels error', fErr); setError(fErr.message) }
        if (bErr) { console.error('[Admin] bookings error', bErr); setError((prev) => prev ?? bErr.message) }
        if (bizErr) { console.error('[Admin] business_applications error', bizErr); setError((prev) => prev ?? bizErr.message) }
        if (conErr) { console.error('[Admin] contact_leads error', conErr); setError((prev) => prev ?? conErr.message) }
        // console.log('[Admin] funnels', fData)
        // console.log('[Admin] bookings', bData)
        console.log('[Admin] business_applications', bizData)  // KEPT: Business application logging
        // console.log('[Admin] contact_leads', conData)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])
        if (provRes && 'data' in (provRes as any)) {
          const { data: pData, error: pErr } = (provRes as any)
          if (pErr) { console.error('[Admin] providers error', pErr); setError((prev) => prev ?? pErr.message) }
          setProviders((pData as ProviderRow[]) || [])
        }
        // Blog posts loading moved to BlogSection component (Step 10)
        // Calendar events loading moved to CalendarEventsSection component (Step 13)
        try {
          // Load flagged events for admin panel (always load for pending approvals notification)
          if (isAdmin) {
            const { data: flags, error: flagsError } = await supabase
              .from('event_flags')
              .select('*, calendar_events(*), profiles(email)')
              .order('created_at', { ascending: false })
            
            if (flagsError) {
              // Table might not exist yet or foreign key issue - log detailed error
              console.warn('[Admin] Could not load flagged events (table may not exist yet):', flagsError.message, flagsError.code)
              // Set empty array so the UI doesn't break
              setFlaggedEvents([])
            } else {
              // Transform the data to include event and reporter info
              const transformedFlags = (flags || []).map((flag: any) => ({
                id: flag.id,
                event_id: flag.event_id,
                user_id: flag.user_id,
                reason: flag.reason,
                details: flag.details,
                created_at: flag.created_at,
                event: flag.calendar_events,
                reporter_email: flag.profiles?.email || 'Unknown'
              }))
              setFlaggedEvents(transformedFlags)
            }
          }
        } catch (err) {
          console.warn('[Admin] Exception loading flagged events:', err)
          setFlaggedEvents([])
        }
        try {
          if (isAdmin) {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            
          if (token) {
            // Use relative URL for Netlify functions (works in both dev and production)
            const url = '/.netlify/functions/admin-list-profiles'
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              if (res.ok) {
                const payload = await res.json() as { profiles?: ProfileRow[] }
                if (payload?.profiles) setProfiles(payload.profiles)
              }
            }
          }
        } catch {}
        try {
          // Load change requests using Netlify function (bypasses RLS with SERVICE_ROLE_KEY)
          await loadChangeRequests()
        } catch {}
        try {
          // Load job posts using Netlify function (bypasses RLS with SERVICE_ROLE_KEY)
          await loadJobPosts()
        } catch {}
        try {
          // Load booking events using Netlify function (bypasses RLS with SERVICE_ROLE_KEY)
          await loadBookingEvents()
        } catch {}
      } catch (err: any) {
        console.error('[Admin] unexpected failure', err)
        if (!cancelled) setError(err?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [auth.email, isAdmin, selectedUser, section])

  // Normalizers
  const normalizeEmail = (e?: string | null) => String(e || '').trim().toLowerCase()
  const normalizeRole = (r?: string | null) => String(r || '').trim().toLowerCase()

  // Emails of business owners (from profiles)
  const businessEmails = useMemo(() => {
    return new Set(
      profiles
        .filter((p) => normalizeRole(p.role) === 'business')
        .map((p) => normalizeEmail(p.email))
        .filter(Boolean)
    )
  }, [profiles])

  // Customer users: emails present in funnels/bookings/booking_events/profiles, excluding business owner emails
  const customerUsers = useMemo(() => {
    const set = new Set<string>()
    
    // Add users from funnel responses
    funnels.forEach((f) => { const e = normalizeEmail(f.user_email); if (e) set.add(e) })
    
    // Add users from bookings
    bookings.forEach((b) => { const e = normalizeEmail(b.user_email); if (e) set.add(e) })
    
    // Add users from booking events
    bookingEvents.forEach((be) => { const e = normalizeEmail(be.customer_email); if (e) set.add(e) })
    
    // Add users from profiles (non-business users)
    profiles.forEach((p) => { 
      const e = normalizeEmail(p.email); 
      if (e && p.role !== 'business') set.add(e) 
    })
    
    return Array.from(set)
      .filter((e) => !businessEmails.has(normalizeEmail(e)))
      .sort()
  }, [funnels, bookings, bookingEvents, profiles, businessEmails])

  // STEP 19: filteredFunnels deleted - moved to FunnelResponsesSection component
  // Removed legacy businessAccounts (email-derived). Business accounts now come from profiles.role === 'business'.

  // Inline helpers for admin edits
  const [appEdits, setAppEdits] = useState<Record<string, { category: string; tagsInput: string }>>({})

  // Auto-populate tags from challenge data when applications load
  useEffect(() => {
    if (bizApps.length > 0) {
      const newEdits: Record<string, { category: string; tagsInput: string }> = {}
      bizApps.forEach(app => {
        if (!appEdits[app.id]) {  // Only initialize if not already edited
          try {
            const challengeData = app.challenge ? JSON.parse(app.challenge) : {}
            const tags = Array.isArray(challengeData.tags) ? challengeData.tags : []
            newEdits[app.id] = {
              category: app.category || 'professional-services',
              tagsInput: tags.join(', ')  // Pre-populate with tags from application
            }
          } catch {
            newEdits[app.id] = {
              category: app.category || 'professional-services',
              tagsInput: ''
            }
          }
        }
      })
      if (Object.keys(newEdits).length > 0) {
        setAppEdits(prev => ({ ...prev, ...newEdits }))
      }
    }
  }, [bizApps])

  const catOptions: { key: string; name: string }[] = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' },
  ]

  async function approveApplication(appId: string) {
    setMessage(null)
    setError(null)
    
    const app = bizApps.find((b) => b.id === appId)
    if (!app) return
    
    // CRITICAL: Check if this application was already approved
    if (app.status === 'approved') {
      setError('This application has already been approved. Please refresh the page.')
      return
    }
    
    // Parse the challenge field which contains all the business details as JSON
    let challengeData: any = {}
    try {
      if (app.challenge) {
        challengeData = JSON.parse(app.challenge)
      }
    } catch (err) {
      console.error('[Admin] Error parsing challenge data:', err)
      setError('Failed to parse application data. Please contact support.')
      return
    }
    
    const businessName = app.business_name || 'Unnamed Business'
    
    // DUPLICATE PREVENTION: Check if a provider with this name already exists
    try {
      const { data: existingProviders, error: checkError } = await supabase
        .from('providers')
        .select('id, name')
        .ilike('name', businessName)
        .limit(5)
      
      if (checkError) {
        console.error('[Admin] Error checking for duplicates:', checkError)
        setError('Failed to check for duplicate businesses. Please try again.')
        return
      }
      
      if (existingProviders && existingProviders.length > 0) {
        // Found potential duplicates - warn the admin
        const duplicateNames = existingProviders.map(p => p.name).join(', ')
        const confirmed = window.confirm(
          `⚠️ WARNING: A business with a similar name already exists:\n\n${duplicateNames}\n\n` +
          `Are you sure you want to create "${businessName}"?\n\n` +
          `Click OK to create anyway, or Cancel to prevent duplicate.`
        )
        
        if (!confirmed) {
          setMessage('Application approval cancelled to prevent duplicate.')
          return
        }
      }
    } catch (err: any) {
      console.error('[Admin] Exception checking duplicates:', err)
      setError(`Failed to verify duplicates: ${err.message}`)
      return
    }
    
    // Get admin-edited category and tags, or fall back to application's category
    const draft = appEdits[appId] || { category: app.category || 'professional-services', tagsInput: '' }
    const adminTags = draft.tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    
    // Combine tags from challenge data and admin input
    const challengeTags = Array.isArray(challengeData.tags) ? challengeData.tags : []
    const allTags = [...new Set([...challengeTags, ...adminTags])]  // Remove duplicates
    
    // Attempt to find a profile/user by the application's email so we can assign ownership to the applicant
    let ownerUserId: string | null = null
    try {
      if (app.email) {
        const { data: profRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', app.email)
          .limit(1)
        ownerUserId = ((profRows as any[])?.[0]?.id as string | undefined) || null
      }
    } catch (err) {
      console.warn('[Admin] Could not find owner user:', err)
    }
    
    // IMMEDIATELY remove from UI to prevent double-approval
    setBizApps((rows) => rows.filter((r) => r.id !== appId))
    
    // Create provider with ALL data from the application
    const payload: Partial<ProviderRow> = {
      name: businessName as any,
      category_key: draft.category as any,
      tags: allTags as any,
      phone: (app.phone || null) as any,
      email: (app.email || null) as any,
      website: (challengeData.website || null) as any,
      address: (challengeData.address || null) as any,
      description: (challengeData.description || null) as any,
      images: (Array.isArray(challengeData.images) ? challengeData.images : []) as any,
      specialties: (Array.isArray(challengeData.specialties) ? challengeData.specialties : []) as any,
      social_links: (challengeData.social_links || {}) as any,
      business_hours: (challengeData.business_hours || {}) as any,
      service_areas: (Array.isArray(challengeData.service_areas) ? challengeData.service_areas : []) as any,
      google_maps_url: (challengeData.google_maps_url || null) as any,
      bonita_resident_discount: (challengeData.bonita_resident_discount || null) as any,
      owner_user_id: (ownerUserId || null) as any,
      published: false,  // Keep unpublished until admin manually publishes
      is_member: false   // Default to free tier
    }
    
    console.log('[Admin] Approving application with payload:', payload)  // KEPT: Business application logging
    
    // Create the provider
    const { error: insertError } = await supabase.from('providers').insert([payload as any])
    
    if (insertError) {
      console.error('[Admin] Error creating provider:', insertError)
      setError(`Failed to create provider: ${insertError.message}`)
      
      // ROLLBACK: Re-add the application to the UI since creation failed
      setBizApps((rows) => [app, ...rows])
      return
    }
    
    // Update application status to approved
    const { error: updateError } = await supabase
      .from('business_applications')
      .update({ status: 'approved' })
      .eq('id', appId)
    
    if (updateError) {
      console.error('[Admin] Error updating application status:', updateError)
      // Don't rollback here - the provider was created successfully
      // Just log the error and continue
    }
    
    setMessage(`✅ Application approved! "${businessName}" has been created as a new provider.`)
    
    // Refresh providers list
    try {
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      setProviders((pData as ProviderRow[]) || [])
    } catch (err) {
      console.error('[Admin] Error refreshing providers:', err)
    }
  }

  async function deleteApplication(appId: string) {
    setMessage(null)
    // Update status to rejected before deleting the application
    const { error: updateError } = await supabase.from('business_applications').update({ status: 'rejected' }).eq('id', appId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    
    const { error } = await supabase.from('business_applications').delete().eq('id', appId)
    if (error) setError(error.message)
    else {
      setMessage('Application rejected and deleted')
      setBizApps((rows) => rows.filter((r) => r.id !== appId))
    }
  }

  // REFACTORED: Moved to adminProviderUtils.ts
  const saveProvider = (p: ProviderRow) =>
    ProviderUtils.saveProvider(
      p,
      setMessage,
      setError,
      setSavingProvider,
      setProviders,
      setRetryProvider,
      clearSavedState,
      setIsCreatingNewProvider,
      setSelectedProviderId
    )

  // REFACTORED: Retry function - calls utility after wrapping saveProvider
  const retrySaveProvider = () => {
    if (retryProvider) {
      saveProvider(retryProvider)
    }
  }

  // REFACTORED: Moved to adminProviderUtils.ts
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, providerId: string) =>
    ProviderUtils.handleImageUpload(
      event,
      providerId,
      providers,
      setUploadingImages,
      setError,
      setProviders,
      setMessage
    )

  // REFACTORED: Moved to adminProviderUtils.ts
  const removeImage = (providerId: string, imageUrl: string) =>
    ProviderUtils.removeImage(
      providerId,
      imageUrl,
      providers,
      setProviders,
      setMessage,
      setError
    )

  // REFACTORED: Moved to adminProviderUtils.ts
  const deleteProvider = (providerId: string) =>
    ProviderUtils.deleteProvider(
      providerId,
      setMessage,
      setError,
      setConfirmDeleteProviderId,
      setProviders
    )

  // Change request functions moved to ChangeRequestsSection component (Step 12)

  // REFACTORED: Moved to adminProviderUtils.ts
  const toggleBookingEnabled = (providerId: string, currentlyEnabled: boolean) =>
    ProviderUtils.toggleBookingEnabled(
      providerId,
      currentlyEnabled,
      setMessage,
      setError,
      setProviders
    )

  

  
  // ============================================================================
  // STEP 12: DELETE CHANGE REQUEST FUNCTIONS (END)
  // ============================================================================

  // Job post functions moved to JobPostsSection component (Step 11)

  async function deleteUser(userId: string) {
    setMessage(null)
    setDeletingUserId(userId)
    try {
      // console.log('[Admin] Deleting user:', userId)
      
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Call Netlify function (not Supabase Edge Function)
      // For production: use relative URL (/.netlify/functions/...)
      // Use relative URL for Netlify functions (works in both dev and production)
      const url = '/.netlify/functions/admin-delete-useradmin-delete-user'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ user_id: userId })
      })
      
      // console.log('[Admin] Delete response status:', response.status)
      
      if (!response.ok) {
        // Try to parse as JSON first for detailed error
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('[Admin] Delete error details:', errorData)
          
          if (errorData.error) {
            errorMessage = errorData.error
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`
            }
            if (errorData.hint) {
              errorMessage += ` (${errorData.hint})`
            }
            if (errorData.code) {
              console.error('[Admin] Error code:', errorData.code)
            }
          }
        } catch (parseErr) {
          // Fallback to text if JSON parsing fails
          const errorText = await response.text()
          console.error('[Admin] Delete error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      // console.log('[Admin] Delete result:', result)
      
      if (!result.ok) {
        throw new Error('Delete failed')
      }
      
      // Remove from local lists - get the user's email first
      const deletedProfile = profiles.find(p => p.id === userId)
      const deletedEmail = deletedProfile?.email?.toLowerCase().trim()
      
      // console.log('[Admin] Removing deleted user from local state:', { userId, email: deletedEmail })
      
      // Remove profile from profiles list
      setProfiles((arr) => arr.filter((p) => p.id !== userId))
      
      // CRITICAL FIX: Remove funnel responses and bookings by email
      // This ensures the "All users" dropdown updates immediately
      if (deletedEmail) {
        setFunnels((arr) => arr.filter((f) => {
          const funnelEmail = f.user_email?.toLowerCase().trim()
          return funnelEmail !== deletedEmail
        }))
        setBookings((arr) => arr.filter((b) => {
          const bookingEmail = b.user_email?.toLowerCase().trim()
          return bookingEmail !== deletedEmail
        }))
        // console.log('[Admin] Removed funnel responses and bookings for:', deletedEmail)
      }
      
      setMessage('User deleted successfully - all associated data removed')
      // console.log('[Admin] User deleted successfully')
    } catch (err: any) {
      console.error('[Admin] Delete user error:', err)
      setError(err?.message || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  async function deleteCustomerUser(email: string) {
    setMessage(null)
    setDeletingCustomerEmail(email)
    try {
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Remove funnel responses and bookings for this email
      try { await supabase.from('funnel_responses').delete().eq('user_email', email) } catch {}
      try { await supabase.from('bookings').delete().eq('user_email', email) } catch {}
      // If an auth profile exists (and is not a business owner), delete the auth user as well
      try {
        const { data: prof } = await supabase.from('profiles').select('id,role').eq('email', email).limit(1).maybeSingle()
        const pid = (prof as any)?.id as string | undefined
        const role = (prof as any)?.role as string | undefined
        if (pid && role !== 'business') {
          // Call Netlify function (not Supabase Edge Function)
          // Use relative URL for Netlify functions (works in both dev and production)
          const url = '/.netlify/functions/admin-delete-user'
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ user_id: pid })
          })
          
          if (response.ok) {
            setProfiles((arr) => arr.filter((p) => p.id !== pid))
          }
        }
      } catch {}
      // Update local UI lists
      setFunnels((arr) => arr.filter((f) => f.user_email !== email))
      setBookings((arr) => arr.filter((b) => b.user_email !== email))
      setMessage('Customer user deleted')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete customer user')
    } finally {
      setDeletingCustomerEmail(null)
    }
  }

  /**
   * FETCH BUSINESS DETAILS
   * 
   * This function fetches business details for a specific business account user.
   * It uses a Netlify function to bypass RLS policies and fetch provider data.
   * 
   * How it works:
   * 1. Sets loading state for the specific user
   * 2. Uses existing profile data to get user email and name
   * 3. Calls Netlify function with SERVICE_ROLE_KEY to bypass RLS
   * 4. Returns business name, phone, and other relevant details
   * 5. Updates expandedBusinessDetails state with the fetched data
   */
  async function fetchBusinessDetails(userId: string) {
    // console.log('[Admin] Fetching business details for user ID:', userId)
    setLoadingBusinessDetails(prev => ({ ...prev, [userId]: true }))
    
    try {
      // Get the user's email and name from the existing profiles data
      const userProfile = profiles.find(p => p.id === userId)
      const userEmail = userProfile?.email
      const userName = userProfile?.name

      // console.log('[Admin] User profile data from existing data:', { email: userEmail, name: userName })

      // Get auth session for the request
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('No authentication token available')
      }

      // Call Netlify function to fetch business details (bypasses RLS)
      // For production: use relative URL (/.netlify/functions/...)
      // Use relative URL for Netlify functions (works in both dev and production)
      const url = '/.netlify/functions/admin-get-business-detailsadmin-get-business-details'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          userEmail,
          userName
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      // console.log('[Admin] Business details response:', result)

      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to fetch business details')
      }

      const uniqueBusinessData = result.businessData || []
      // console.log('[Admin] Combined unique business data:', uniqueBusinessData.length, 'records')

      // Update expanded details with the fetched business data
      setExpandedBusinessDetails(prev => ({
        ...prev,
        [userId]: uniqueBusinessData
      }))

    } catch (err: any) {
      console.error('[Admin] Error fetching business details:', err)
      setError(`Failed to fetch business details: ${err.message}`)
    } finally {
      setLoadingBusinessDetails(prev => ({ ...prev, [userId]: false }))
    }
  }

  /**
   * COLLAPSE BUSINESS DETAILS
   * 
   * This function collapses the expanded business details for a specific user.
   * It removes the user's data from the expandedBusinessDetails state.
   */
  function collapseBusinessDetails(userId: string) {
    // console.log('[Admin] Collapsing business details for user ID:', userId)
    setExpandedBusinessDetails(prev => {
      const newState = { ...prev }
      delete newState[userId]
      return newState
    })
  }

  /**
   * CRITICAL FIX: Admin page auth check
   * 
   * The issue was that auth.email was temporarily undefined during auth loading,
   * causing the "Please sign in" message to show even when user was signed in.
   * 
   * Fix: Check auth.loading state to prevent premature "sign in" message.
   */
  if (!auth.email) {
    console.log('[Admin] 🚫 NO EMAIL - Rendering auth check UI')
    console.log('[Admin] Auth state:', { 
      email: auth.email, 
      loading: auth.loading, 
      isAuthed: auth.isAuthed 
    })
    
    // Don't show "please sign in" message while auth is still loading
    if (auth.loading) {
      console.log('[Admin] ⏳ Auth loading - showing skeleton')
      return (
        <section className="py-8">
          <div className="container-px mx-auto max-w-3xl">
            <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        </section>
      )
    }
    
    console.log('[Admin] 🚫 Auth not loading but no email - showing "Please sign in"')
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: email={auth.email || 'none'}, loading={String(auth.loading)}, isAuthed={String(auth.isAuthed)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    console.log('[Admin] 🚫 NOT ADMIN - Showing unauthorized message')
    console.log('[Admin] isAdmin:', isAdmin, 'adminStatus:', adminStatus)
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: isAdmin={String(isAdmin)}, email={auth.email}, adminStatus={JSON.stringify(adminStatus)}
            </div>
          </div>
        </div>
      </section>
    )
  }
  
  console.log('[Admin] ✅ Auth checks passed - rendering admin panel')

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        <div className="flex flex-col lg:items-start md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Admin' : 'Your Data'}</h1>
            {isAdmin && (
              <div className="text-xs text-neutral-500 mt-1">
                {adminStatus.verified ? '🔒 Server-verified admin' : '⚠️ Client-side admin (less secure)'}
                {adminStatus.error && ` • ${adminStatus.error}`}
              </div>
            )}
          </div>
          <div className="flex flex-col lg:items-start md:flex-row md:items-center gap-2">
            {isAdmin && (
              <>
                <select value={selectedUser || ''} onChange={(e) => setSelectedUser(e.target.value || null)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="">All users</option>
                  {customerUsers.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <select value={section} onChange={(e) => setSection(e.target.value as any)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="providers">Providers</option>
                  <option value="contact-leads">Contact / Get Featured</option>
                  <option value="customer-users">Customer Users</option>
                  <option value="business-accounts">Business Accounts</option>
                  <option value="users">Users</option>
                  <option value="business-applications">Business Applications</option>
                  <option value="owner-change-requests">Owner Change Requests</option>
                  <option value="job-posts">Job Posts</option>
                  <option value="funnel-responses">Funnel Responses</option>
                  <option value="bookings">Bookings</option>
                  <option value="booking-events">Calendar Bookings</option>
                  <option value="blog">Blog Manager</option>
                  <option value="calendar-events">Calendar Events</option>
                  <option value="flagged-events">Flagged Events</option>
                </select>
              </>
            )}
            <button onClick={() => window.location.reload()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200 text-sm">Refresh</button>
          </div>
        </div>
        {isLoading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton">
                <div className="skeleton-inner space-y-3">
                  <div className="skeleton-line w-1/3"></div>
                  <div className="skeleton-chip"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {message && <div className="mt-3 text-sm text-green-700">{message}</div>}

        {/* Pending Approvals Notification Section */}
        {isAdmin && (
          <div className="mt-6 mb-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">Pending Approvals</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Pending Business Applications */}
                      {bizApps.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Business Applications</div>
                          <div className="text-xs text-amber-600 mt-1">{bizApps.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {bizApps.slice(0, 2).map(app => (
                              <div key={app.id} className="truncate">
                                {app.business_name || app.full_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {bizApps.length > 2 && <div className="text-amber-500">+{bizApps.length - 2} more</div>}
                          </div>
                        </div>
                      )}

                      {/* Pending Change Requests */}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Change Requests</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {changeRequests.filter(req => req.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {changeRequests.filter(req => req.status === 'pending').slice(0, 2).map(req => (
                              <div key={req.id} className="truncate">
                                {/* Show business name if available, otherwise show request type */}
                                {req.providers?.name ? `${req.providers.name} - ` : ''}
                                {req.type === 'feature_request' ? 'Featured Upgrade' : 
                                 req.type === 'update' ? 'Listing Update' : 
                                 req.type === 'delete' ? 'Listing Deletion' :
                                 req.type === 'claim' ? 'Business Claim' : req.type}
                              </div>
                            ))}
                            {changeRequests.filter(req => req.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{changeRequests.filter(req => req.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Job Posts */}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Job Posts</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {jobPosts.filter(job => job.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {jobPosts.filter(job => job.status === 'pending').slice(0, 2).map(job => (
                              <div key={job.id} className="truncate">
                                {job.title}
                              </div>
                            ))}
                            {jobPosts.filter(job => job.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{jobPosts.filter(job => job.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Contact Leads */}
                      {contactLeads.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Contact Leads</div>
                          <div className="text-xs text-amber-600 mt-1">{contactLeads.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {contactLeads.slice(0, 2).map(lead => (
                              <div key={lead.id} className="truncate">
                                {lead.business_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {contactLeads.length > 2 && <div className="text-amber-500">+{contactLeads.length - 2} more</div>}
                          </div>
                        </div>
                      )}

                      {/* Flagged Calendar Events */}
                      {flaggedEvents.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-red-300">
                          <div className="font-medium text-red-800">Flagged Events</div>
                          <div className="text-xs text-red-600 mt-1">{flaggedEvents.length} flagged</div>
                          <div className="text-xs text-red-700 mt-2">
                            {flaggedEvents.slice(0, 2).map(flag => (
                              <div key={flag.id} className="truncate">
                                {flag.event?.title || 'Event deleted'} ({flag.reason})
                              </div>
                            ))}
                            {flaggedEvents.length > 2 && <div className="text-red-500">+{flaggedEvents.length - 2} more</div>}
                          </div>
                          <button
                            onClick={() => setSection('flagged-events')}
                            className="mt-3 w-full px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            Review Flagged Events
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bizApps.length > 0 && (
                        <button 
                          onClick={() => setSection('business-applications')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Applications ({bizApps.length})
                        </button>
                      )}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('owner-change-requests')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Changes ({changeRequests.filter(req => req.status === 'pending').length})
                        </button>
                      )}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('job-posts')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Jobs ({jobPosts.filter(job => job.status === 'pending').length})
                        </button>
                      )}
                      {contactLeads.length > 0 && (
                        <button 
                          onClick={() => setSection('contact-leads')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Leads ({contactLeads.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
          {isAdmin && section === 'contact-leads' && (
            <ContactLeadsSection
              contactLeads={contactLeads}
              providers={providers as any}
              onMessage={setMessage}
              onError={setError}
              onContactLeadsUpdate={setContactLeads}
              onToggleFeaturedStatus={toggleFeaturedStatus}
              onUpdateSubscriptionType={updateSubscriptionType}
            />
          )}
          {isAdmin && section === 'customer-users' && (
            <CustomerUsersSection
              customerUsers={customerUsers}
              funnels={funnels}
              bookings={bookings}
              bookingEvents={bookingEvents}
              profiles={profiles}
              businessEmails={businessEmails}
              deletingCustomerEmail={deletingCustomerEmail}
              onSetDeletingCustomerEmail={setDeletingCustomerEmail}
              onDeleteCustomerUser={deleteCustomerUser}
            />
          )}

          {isAdmin && section === 'business-accounts' && (
            <BusinessAccountsSection
              profiles={profiles}
              expandedBusinessDetails={expandedBusinessDetails}
              loadingBusinessDetails={loadingBusinessDetails}
              deletingUserId={deletingUserId}
              onSetDeletingUserId={setDeletingUserId}
              onFetchBusinessDetails={fetchBusinessDetails}
              onCollapseBusinessDetails={collapseBusinessDetails}
              onDeleteUser={deleteUser}
            />
          )}

          {isAdmin && section === 'business-owners' && (
            <UsersSection
              profiles={profiles}
              deletingUserId={deletingUserId}
              currentUserEmail={auth.email}
              onSetDeletingUserId={setDeletingUserId}
              onDeleteUser={deleteUser}
            />
          )}
          {section === 'funnel-responses' && (
            <FunnelResponsesSection
              funnels={funnels}
              onMessage={setMessage}
              onError={setError}
              onFunnelsUpdate={setFunnels}
            />
          )}

          {section === 'bookings' && (
            <BookingsSection
              bookings={bookings}
              onMessage={setMessage}
              onError={setError}
              onBookingsUpdate={setBookings}
            />
          )}

          {isAdmin && section === 'booking-events' && (
            <BookingEventsSection
              bookingEvents={bookingEvents}
              loading={loading}
              onMessage={setMessage}
              onError={setError}
              onBookingEventsUpdate={setBookingEvents}
              onLoadBookingEvents={loadBookingEvents}
            />
          )}
        </div>

        {/* Main Business Applications Section */}
        {isAdmin && section === 'business-applications' && (
          <BusinessApplicationsSection
            bizApps={bizApps}
            appEdits={appEdits}
            catOptions={catOptions}
            onAppEditsUpdate={(appId, category, tagsInput) => {
              setAppEdits(prev => ({ ...prev, [appId]: { category, tagsInput } }))
            }}
            onApproveApplication={approveApplication}
            onDeleteApplication={deleteApplication}
          />
        )}

        {isAdmin && section === 'providers' && (
          <ProvidersSection
            providers={providers}
            selectedProviderId={selectedProviderId}
            isCreatingNewProvider={isCreatingNewProvider}
            newProviderForm={newProviderForm}
            savingProvider={savingProvider}
            uploadingImages={uploadingImages}
            retryProvider={retryProvider}
            confirmDeleteProviderId={confirmDeleteProviderId}
            catOptions={catOptions}
            message={message}
            error={error}
            onSetSelectedProviderId={setSelectedProviderId}
            onStartCreateNewProvider={startCreateNewProvider}
            onCancelCreateProvider={cancelCreateProvider}
            onSetNewProviderForm={setNewProviderForm}
            onSaveProvider={saveProvider}
            onDeleteProvider={deleteProvider}
            onRetrySaveProvider={retrySaveProvider}
            onHandleImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onToggleBookingEnabled={toggleBookingEnabled}
            onSetProviders={setProviders}
            onSetConfirmDeleteProviderId={setConfirmDeleteProviderId}
          />
        )}


        {isAdmin && section === 'owner-change-requests' && (
          <ChangeRequestsSection
            providers={providers}
            onMessage={(msg) => setMessage(msg)}
            onError={(err) => setError(err)}
          />
        )}

        {isAdmin && section === 'job-posts' && (
          <JobPostsSection
            onMessage={(msg) => setMessage(msg)}
            onError={(err) => setError(err)}
          />
        )}
        </div>

        {isAdmin && section === 'blog' && (
          <BlogSection
            onMessage={(msg) => setMessage(msg)}
            onError={(err) => setError(err)}
          />
        )}

        {isAdmin && section === 'calendar-events' && (
          <CalendarEventsSection
            onMessage={(msg) => setMessage(msg)}
            onError={(err) => setError(err)}
          />
        )}

        {isAdmin && section === 'flagged-events' && (
          <FlaggedEventsSection
            onMessage={(msg) => setMessage(msg)}
            onError={(err) => setError(err)}
          />
        )}
    </section>
  )
}
// JobCard component moved to JobPostsSection (Step 11)
