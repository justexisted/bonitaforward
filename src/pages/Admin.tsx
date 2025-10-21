import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
// iCalendar parsing moved to server-side Netlify function for reliability
// import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'
import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'
// Provider management utilities (extracted for better organization)
import * as ProviderUtils from '../utils/adminProviderUtils'
// User management utilities (extracted for better organization)
import * as UserUtils from '../utils/adminUserUtils'
// Data loading utilities (extracted for better organization)
import * as DataLoadingUtils from '../utils/adminDataLoadingUtils'
// Business application utilities (extracted for better organization)
import * as BusinessAppUtils from '../utils/adminBusinessApplicationUtils'
// Helper utilities (extracted for better organization)
import * as AdminHelpers from '../utils/adminHelpers'
// Admin verification hook (extracted for better organization)
import { useAdminVerification } from '../hooks/useAdminVerification'
// Admin data loader hook (extracted for better organization)
import { useAdminDataLoader } from '../hooks/useAdminDataLoader'
// Category constants (extracted for consistency)
import { CATEGORY_OPTIONS } from '../constants/categories'
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

// REFACTORED: All type definitions moved to hook files or removed (now sourced from hooks)
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
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null
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
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
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
  // REFACTORED: Data loading extracted to useAdminDataLoader hook
  // ============================================================================
  // Note: Data loader is initialized below after admin verification

  // Local UI state
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
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
  // REFACTORED: Section state moved up to useAdminDataLoader dependencies

  // Filtered providers logic moved to ContactLeadsSection component (Step 16)

  // Blog editor effects moved to BlogSection component (Step 10)

  // REFACTORED: Moved to adminHelpers.ts
  const clearSavedState = () => AdminHelpers.clearSavedState(setSelectedProviderId)

  // REFACTORED: Moved to adminHelpers.ts
  const startCreateNewProvider = () => 
    AdminHelpers.startCreateNewProvider(
      setIsCreatingNewProvider,
      setSelectedProviderId,
      setMessage,
      setError,
      setNewProviderForm
    )

  // REFACTORED: Moved to adminHelpers.ts
  const cancelCreateProvider = () => 
    AdminHelpers.cancelCreateProvider(
      setIsCreatingNewProvider,
      setSelectedProviderId,
      setMessage,
      setError,
      setNewProviderForm
    )

  // Blog editor functions moved to BlogSection component (Step 10)
  
  // State for section and user filtering (declared BEFORE verification hook to avoid ordering issues)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [section, setSection] = useState< 'providers' |'business-applications' | 'contact-leads' | 'customer-users' | 'business-accounts' | 'business-owners' | 'users' | 'owner-change-requests' | 'job-posts' | 'funnel-responses' | 'bookings' | 'booking-events' | 'blog' | 'calendar-events' | 'flagged-events'>('providers')
  
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
  
  // REFACTORED: Admin verification moved to useAdminVerification hook
  const { isAdmin, adminStatus } = useAdminVerification({
    email: auth.email ?? null,
    loading: auth.loading,
    isAuthed: auth.isAuthed,
    userId: auth.userId ?? null
  })
  
  // State for change requests and job posts (loaded via Netlify functions)
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [jobPosts, setJobPosts] = useState<ProviderJobPostWithDetails[]>([])
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
  
  // Netlify function loaders for RLS-protected data
  // CRITICAL: Wrapped in useCallback to prevent infinite loop in useAdminDataLoader
  // State setters are stable and don't need to be in dependencies
  const loadChangeRequests = useCallback(() => 
    DataLoadingUtils.loadChangeRequests(setError, setChangeRequests), 
    [] // Empty deps: state setters are stable
  )
  const loadJobPosts = useCallback(() => 
    DataLoadingUtils.loadJobPosts(setError, setJobPosts), 
    [] // Empty deps: state setters are stable
  )
  const loadBookingEvents = useCallback(() => 
    DataLoadingUtils.loadBookingEvents(setError, setBookingEvents), 
    [] // Empty deps: state setters are stable
  )
  
  // REFACTORED: Large data loading useEffect moved to useAdminDataLoader hook
  // Note: Setters from this hook are typed correctly but may cause type errors
  // when passed to utility functions that expect simpler setter signatures
  const {
    funnels,
    bookings,
    bizApps,
    contactLeads,
    providers,
    flaggedEvents,
    profiles,
    loading,
    error: dataLoadError,
    setFunnels,
    setBookings,
    setBizApps,
    setContactLeads,
    setProviders,
    setFlaggedEvents: _setFlaggedEvents,  // Prefix unused setters
    setProfiles,
    setError: _setDataLoadError  // Prefix unused setters
  } = useAdminDataLoader({
    userEmail: auth.email ?? null,
    isAdmin,
    selectedUser,
    section,
    loadChangeRequests,
    loadJobPosts,
    loadBookingEvents
  })
  
  // Combine error and loading states
  const combinedError = error || dataLoadError
  const isLoading = loading || adminDataLoading

  // Type-safe setter wrappers (hooks return Dispatch<SetStateAction<T>>, utilities expect (T) => void)
  // Using type casts to bridge type compatibility between hooks and utility functions
  const setProvidersSimple = ((providers: ProviderRow[]) => setProviders(providers)) as (providers: ProviderRow[]) => void
  const setBizAppsSimple = ((apps: any[]) => setBizApps(apps)) as (apps: any[]) => void
  const setProfilesSimple = ((profiles: any[]) => setProfiles(profiles)) as (profiles: any[]) => void

  // REFACTORED: Moved to adminProviderUtils.ts (defined after wrappers)
  const toggleFeaturedStatus = (providerId: string, currentStatus: boolean) => 
    ProviderUtils.toggleFeaturedStatus(providerId, currentStatus, setMessage, setError, setProvidersSimple as any)

  // REFACTORED: Moved to adminProviderUtils.ts (defined after wrappers)
  const updateSubscriptionType = (providerId: string, subscriptionType: 'monthly' | 'yearly') =>
    ProviderUtils.updateSubscriptionType(providerId, subscriptionType, setMessage, setError, setProvidersSimple as any)

  // REFACTORED: Moved to adminHelpers.ts
  // Emails of business owners (from profiles)
  const businessEmails = useMemo(() => 
    AdminHelpers.getBusinessEmails(profiles), 
    [profiles]
  )

  // REFACTORED: Moved to adminHelpers.ts
  // Customer users: emails present in funnels/bookings/booking_events/profiles, excluding business owner emails
  const customerUsers = useMemo(() => 
    AdminHelpers.getCustomerUsers(funnels, bookings, bookingEvents, profiles, businessEmails), 
    [funnels, bookings, bookingEvents, profiles, businessEmails]
  )

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

  // REFACTORED: Category options moved to constants/categories.ts
  const catOptions = CATEGORY_OPTIONS

  // REFACTORED: Moved to adminBusinessApplicationUtils.ts
  const approveApplication = (appId: string) =>
    BusinessAppUtils.approveApplication(
      appId,
      bizApps,
      appEdits,
      setMessage,
      setError,
      setBizAppsSimple as any,
      setProvidersSimple as any
    )

  // REFACTORED: Moved to adminBusinessApplicationUtils.ts
  const deleteApplication = (appId: string) =>
    BusinessAppUtils.deleteApplication(appId, setMessage, setError, setBizAppsSimple as any)

  // REFACTORED: Moved to adminProviderUtils.ts
  const saveProvider = (p: ProviderRow) =>
    ProviderUtils.saveProvider(
      p,
      setMessage,
      setError,
      setSavingProvider,
      setProvidersSimple as any,
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
      setProvidersSimple as any,
      setMessage
    )

  // REFACTORED: Moved to adminProviderUtils.ts
  const removeImage = (providerId: string, imageUrl: string) =>
    ProviderUtils.removeImage(
      providerId,
      imageUrl,
      providers,
      setProvidersSimple as any,
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
      setProvidersSimple as any
    )

  // Change request functions moved to ChangeRequestsSection component (Step 12)

  // REFACTORED: Moved to adminProviderUtils.ts
  const toggleBookingEnabled = (providerId: string, currentlyEnabled: boolean) =>
    ProviderUtils.toggleBookingEnabled(
      providerId,
      currentlyEnabled,
      setMessage,
      setError,
      setProvidersSimple as any
    )

  

  
  // ============================================================================
  // STEP 12: DELETE CHANGE REQUEST FUNCTIONS (END)
  // ============================================================================

  // Job post functions moved to JobPostsSection component (Step 11)

  // REFACTORED: Moved to adminUserUtils.ts
  const deleteUser = (userId: string) =>
    UserUtils.deleteUser(
      userId,
      profiles,
      setMessage,
      setError,
      setDeletingUserId,
      setProfilesSimple as any,
      setFunnels as any,
      setBookings as any
    )

  // REFACTORED: Moved to adminUserUtils.ts
  const deleteCustomerUser = (email: string) =>
    UserUtils.deleteCustomerUser(
      email,
      setMessage,
      setError,
      setDeletingCustomerEmail,
      setProfilesSimple as any,
      setFunnels as any,
      setBookings as any
    )

  // REFACTORED: Moved to adminUserUtils.ts
  const fetchBusinessDetails = (userId: string) =>
    UserUtils.fetchBusinessDetails(
      userId,
      profiles,
      setLoadingBusinessDetails,
      setExpandedBusinessDetails,
      setError
    )

  // REFACTORED: Moved to adminUserUtils.ts
  const collapseBusinessDetails = (userId: string) =>
    UserUtils.collapseBusinessDetails(userId, setExpandedBusinessDetails)

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
  
  /* console.log('[Admin] ✅ Auth checks passed - rendering admin panel') */

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
        {combinedError && <div className="mt-3 text-sm text-red-600">{combinedError}</div>}
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
            onSetProviders={setProvidersSimple as any}
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
