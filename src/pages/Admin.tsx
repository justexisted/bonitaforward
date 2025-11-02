import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
// iCalendar parsing moved to server-side Netlify function for reliability
// import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'
// Type imports (extracted from Admin.tsx for better organization)
import type { ProviderRow, ProviderChangeRequestWithDetails, ProviderJobPostWithDetails, AdminSection } from '../types/admin'
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
import { ResidentVerificationSection } from '../components/admin/sections/ResidentVerificationSection'
import { FunnelResponsesSection } from '../components/admin/sections/FunnelResponsesSection-2025-10-19'
import { BookingsSection } from '../components/admin/sections/BookingsSection-2025-10-19'
import { BusinessApplicationsSection } from '../components/admin/sections/BusinessApplicationsSection-2025-10-19'
import { BookingEventsSection } from '../components/admin/sections/BookingEventsSection-2025-10-19'
import { ProvidersSection } from '../components/admin/sections/ProvidersSection-2025-10-19'
import { RestaurantTaggingSection } from '../components/admin/sections/RestaurantTaggingSection'
import { PendingApprovalsDashboard } from '../components/admin/PendingApprovalsDashboard'
import { AdminHeader } from '../components/admin/AdminHeader'
import { AdminAuthGuard } from '../components/admin/AdminAuthGuard'
import { AdminErrorBoundary } from '../components/admin/AdminErrorBoundary'

// ============================================================================
// GRADUAL MIGRATION: New Service Layer
// ============================================================================
// Importing new data management infrastructure for gradual migration
// The hook runs in parallel with existing state - both systems work together
// This allows incremental migration without breaking existing functionality
import { useAdminData } from '../hooks/useAdminData'
// ============================================================================

// REFACTORED: Type definitions moved to types/admin.ts for better organization
// Types now imported at top: ProviderRow, ProviderChangeRequestWithDetails, ProviderJobPostWithDetails

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
  
  // ============================================================================
  // NEW: Service-Based Data Management (Phase 1)
  // ============================================================================
  // This hook loads all admin data in parallel and provides refresh capabilities
  // Currently running alongside existing state - both systems work together
  const { 
    data: _adminData,  // Prefixed: For future migration (Phase 2)
    loading: _adminDataLoading,  // Prefixed: For future migration (Phase 2)
    error: _adminDataError,  // Prefixed: For future migration (Phase 2)
    refresh: _refreshAdminData,  // Prefixed: Will use in refresh buttons (Phase 2)
    refreshEntity: _refreshEntity  // Prefixed: Will use after updates (Phase 2)
  } = useAdminData()
  
  // Admin data hook for future migration (Phase 2)
  // Currently unused but prepared for gradual migration
  
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
  const [section, setSection] = useState<AdminSection>('providers')
  
  // Restore admin state when page loads
  useEffect(() => {
    const savedState = localStorage.getItem('admin-state')
    if (savedState) {
      try {
        const { section: savedSection, selectedProviderId: savedProviderId, timestamp } = JSON.parse(savedState)
        
        // Validate savedSection is a valid AdminSection
        const validSections: AdminSection[] = [
          'providers', 'restaurant-tagging', 'business-applications', 'contact-leads',
          'customer-users', 'business-accounts', 'business-owners', 'users',
          'resident-verification', 'owner-change-requests', 'job-posts', 'funnel-responses', 'bookings',
          'booking-events', 'blog', 'calendar-events', 'flagged-events'
        ]
        
        // Only restore if it's recent (within 2 hours) and section is valid
        if (
          Date.now() - timestamp < 2 * 60 * 60 * 1000 &&
          validSections.includes(savedSection as AdminSection)
        ) {
          setSection(savedSection as AdminSection)
          if (selectedProviderId && typeof savedProviderId === 'string') {
            setSelectedProviderId(savedProviderId)
          }
        }
      } catch (err) {
        // Silently fail - invalid localStorage data, just don't restore
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
  const isLoading = loading // adminDataLoading for future migration (Phase 2)

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
  // Returns full user objects with name, role, account type, and data sources
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

  // Helper function to update provider tags only (for restaurant tagging section)
  const updateProviderTags = async (providerId: string, tags: string[]) => {
    try {
      // Find the provider
      const provider = providers.find(p => p.id === providerId)
      if (!provider) {
        setError(`Provider not found: ${providerId}`)
        return
      }

      // Update provider with new tags
      // saveProvider is a wrapper that takes 1 argument and calls the utility function
      const updatedProvider = { ...provider, tags }
      await saveProvider(updatedProvider)
      
      // Refresh providers list to show updated tags immediately
      // The saveProvider function already refreshes, but we ensure it's visible
    } catch (error: any) {
      setError(`Failed to update tags: ${error.message || 'Unknown error'}`)
      throw error
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

  // Auth guard component handles loading, sign-in, and authorization checks
  // Extracted to AdminAuthGuard for better organization and reusability
  return (
    <AdminAuthGuard
      auth={{
        email: auth.email ?? null,
        loading: auth.loading,
        isAuthed: auth.isAuthed
      }}
      isAdmin={isAdmin}
      adminStatus={adminStatus}
    >
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        {/* Admin header with title, status badge, and navigation controls - Extracted for better organization */}
        <AdminHeader
          isAdmin={isAdmin}
          adminStatus={adminStatus}
          selectedUser={selectedUser}
          section={section}
          customerUsers={customerUsers}
          onUserChange={setSelectedUser}
          onSectionChange={setSection}
        />
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

        {/* Pending Approvals Notification Section - Extracted to component for better organization */}
        {isAdmin && (
          <PendingApprovalsDashboard
            bizApps={bizApps}
            changeRequests={changeRequests}
            jobPosts={jobPosts}
            contactLeads={contactLeads}
            flaggedEvents={flaggedEvents}
            onSectionChange={setSection}
          />
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
          {isAdmin && section === 'contact-leads' && (
            <AdminErrorBoundary section="contact-leads">
              <ContactLeadsSection
                contactLeads={contactLeads}
                providers={providers as any}
                onMessage={setMessage}
                onError={setError}
                onContactLeadsUpdate={setContactLeads}
                onToggleFeaturedStatus={toggleFeaturedStatus}
                onUpdateSubscriptionType={updateSubscriptionType}
              />
            </AdminErrorBoundary>
          )}
          {isAdmin && section === 'customer-users' && (
            <AdminErrorBoundary section="customer-users">
              <CustomerUsersSection
                customerUsers={customerUsers}
                funnels={funnels}
                bookings={bookings}
                bookingEvents={bookingEvents}
                profiles={profiles}
                businessEmails={businessEmails}
                deletingCustomerEmail={deletingCustomerEmail}
                onSetDeletingCustomerEmail={setDeletingCustomerEmail}
                onDeleteCustomerUser={deleteUser}
                deleteCustomerUserByEmail={async (email: string) => {
                  // Find user ID from profiles
                  const profile = profiles.find(p => AdminHelpers.normalizeEmail(p.email) === AdminHelpers.normalizeEmail(email))
                  if (profile?.id) {
                    // User has a profile - delete everything including auth user
                    await UserUtils.deleteUser(profile.id, profiles, setMessage, setError, setDeletingUserId, setProfiles, setFunnels, setBookings)
                  } else {
                    // User only exists in funnels/bookings/booking_events - delete email-keyed data only
                    await UserUtils.deleteUserByEmailOnly(email, setMessage, setError, setDeletingCustomerEmail, setFunnels, setBookings, setBookingEvents)
                  }
                }}
              />
            </AdminErrorBoundary>
          )}

          {isAdmin && section === 'business-accounts' && (
            <AdminErrorBoundary section="business-accounts">
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
            </AdminErrorBoundary>
          )}

          {isAdmin && section === 'business-owners' && (
            <AdminErrorBoundary section="business-owners">
              <UsersSection
                profiles={profiles}
                deletingUserId={deletingUserId}
                currentUserEmail={auth.email ?? null}
                onSetDeletingUserId={setDeletingUserId}
                onDeleteUser={deleteUser}
              />
            </AdminErrorBoundary>
          )}
          {isAdmin && section === 'resident-verification' && (
            <AdminErrorBoundary section="resident-verification">
              <ResidentVerificationSection
                profiles={profiles}
              />
            </AdminErrorBoundary>
          )}
          {section === 'funnel-responses' && (
            <AdminErrorBoundary section="funnel-responses">
              <FunnelResponsesSection
                funnels={funnels}
                onMessage={setMessage}
                onError={setError}
                onFunnelsUpdate={setFunnels}
              />
            </AdminErrorBoundary>
          )}

          {section === 'bookings' && (
            <AdminErrorBoundary section="bookings">
              <BookingsSection
                bookings={bookings}
                onMessage={setMessage}
                onError={setError}
                onBookingsUpdate={setBookings}
              />
            </AdminErrorBoundary>
          )}

          {isAdmin && section === 'booking-events' && (
            <AdminErrorBoundary section="booking-events">
              <BookingEventsSection
                bookingEvents={bookingEvents}
                loading={loading}
                onMessage={setMessage}
                onError={setError}
                onBookingEventsUpdate={setBookingEvents}
                onLoadBookingEvents={loadBookingEvents}
              />
            </AdminErrorBoundary>
          )}
        </div>

        {/* Main Business Applications Section */}
        {isAdmin && section === 'business-applications' && (
          <AdminErrorBoundary section="business-applications">
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
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'providers' && (
          <AdminErrorBoundary section="providers">
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
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'restaurant-tagging' && (
          <AdminErrorBoundary section="restaurant-tagging">
            <RestaurantTaggingSection
              providers={providers}
              onUpdateProvider={updateProviderTags}
              loading={loading}
            />
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'owner-change-requests' && (
          <AdminErrorBoundary section="owner-change-requests">
            <ChangeRequestsSection
              providers={providers}
              onMessage={(msg) => setMessage(msg)}
              onError={(err) => setError(err)}
            />
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'job-posts' && (
          <AdminErrorBoundary section="job-posts">
            <JobPostsSection
              onMessage={(msg) => setMessage(msg)}
              onError={(err) => setError(err)}
            />
          </AdminErrorBoundary>
        )}
        </div>

        {isAdmin && section === 'blog' && (
          <AdminErrorBoundary section="blog">
            <BlogSection
              onMessage={(msg) => setMessage(msg)}
              onError={(err) => setError(err)}
            />
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'calendar-events' && (
          <AdminErrorBoundary section="calendar-events">
            <CalendarEventsSection
              onMessage={(msg) => setMessage(msg)}
              onError={(err) => setError(err)}
            />
          </AdminErrorBoundary>
        )}

        {isAdmin && section === 'flagged-events' && (
          <AdminErrorBoundary section="flagged-events">
            <FlaggedEventsSection
              onMessage={(msg) => setMessage(msg)}
              onError={(err) => setError(err)}
            />
          </AdminErrorBoundary>
        )}
    </section>
    </AdminAuthGuard>
  )
}
// JobCard component moved to JobPostsSection (Step 11)
