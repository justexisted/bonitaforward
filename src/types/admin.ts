/**
 * ADMIN TYPE DEFINITIONS
 * 
 * Comprehensive type definitions for the Admin page and related functionality.
 * This file extracts all types from Admin.tsx for better organization and reusability.
 * 
 * Type Categories:
 * - Row Types: Database table row types specific to admin views
 * - Extended Types: Enhanced types with joined data
 * - State Types: UI state management types
 * - Filter Types: Data filtering and search types
 * - Form Types: Form data and validation types
 * - Import/Export Types: Data import/export functionality
 */

// ============================================================================
// RE-EXPORT SHARED TYPES
// ============================================================================

// Re-export types that are used in Admin but defined elsewhere
export type { CalendarEvent } from './index'
export type { BlogPost } from '../lib/supabaseData'
export type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * Provider row type for admin view
 * Extended with all fields visible/editable in admin panel
 */
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
}

/**
 * Funnel response row type
 * Contains customer funnel form submissions
 */
export type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

/**
 * Booking row type
 * Contains customer booking requests (legacy booking system)
 */
export type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

/**
 * Booking event row type
 * Contains provider booking events with joined provider data
 */
export type BookingEventRow = {
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
  }
}

/**
 * Business application row type
 * Contains business listing applications pending approval
 * ⚠️ Database uses 'category' NOT 'category_key'
 */
export type BusinessApplicationRow = {
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

/**
 * Contact lead row type
 * Contains customer contact form submissions
 */
export type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

/**
 * Profile row type
 * User profile information for admin user management
 */
export type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * Flagged event row type
 * Contains flagged calendar events with joined event data
 */
export type FlaggedEventRow = {
  id: string
  event_id: string
  user_id: string | null
  reason: string | null
  created_at: string
  resolved: boolean
  events?: {
    id: string
    title: string
    date: string
    category: string
  }
}

// ============================================================================
// EXTENDED TYPES WITH JOINED DATA
// ============================================================================

/**
 * Extended type for change requests with joined provider and profile data
 * Used in admin view to show complete change request information
 */
export type ProviderChangeRequestWithDetails = {
  id: string
  provider_id: string | null
  owner_user_id: string
  type: 'create' | 'update' | 'delete'
  changes: Record<string, any> | null
  status: 'pending' | 'approved' | 'rejected'
  reason: string | null
  created_at: string
  decided_at: string | null
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

/**
 * Extended type for job posts with provider information
 * Used in admin view to show complete job post information
 */
export type ProviderJobPostWithDetails = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description: string | null
  apply_url: string | null
  salary_range: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  decided_at?: string | null
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

// ============================================================================
// ADMIN SECTION & STATUS TYPES
// ============================================================================

/**
 * Admin panel section identifiers
 * Determines which data view/management section is displayed
 */
export type AdminSection = 
  | 'providers'
  | 'business-applications'
  | 'contact-leads'
  | 'customer-users'
  | 'business-accounts'
  | 'business-owners'
  | 'users'
  | 'owner-change-requests'
  | 'job-posts'
  | 'funnel-responses'
  | 'bookings'
  | 'booking-events'
  | 'blog'
  | 'calendar-events'
  | 'flagged-events'

/**
 * Admin authentication status
 * Tracks admin user verification state
 */
export type AdminStatus = {
  isAdmin: boolean
  isLoading: boolean
  error: string | null
}

// ============================================================================
// FORM & DRAFT TYPES
// ============================================================================

/**
 * Blog post draft/form type for admin
 * Used when creating/editing blog posts
 */
export type AdminBlogPost = {
  id?: string
  category_key: string
  title: string
  content: string
  images?: string[]
}

/**
 * Calendar event form data
 * Used for adding/editing calendar events
 */
export type CalendarEventFormData = {
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  source: string
}

/**
 * New provider form data
 * Used when creating a new provider from admin panel
 */
export type NewProviderFormData = Partial<ProviderRow>

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Featured provider filter options
 * Used to filter providers by featured status
 */
export type FeaturedProviderFilter = 'all' | 'featured' | 'non-featured'

/**
 * Provider filter criteria
 * Combined filtering options for provider list
 */
export type ProviderFilterCriteria = {
  featuredStatus?: FeaturedProviderFilter
  categoryKey?: string
  searchTerm?: string
  ownerId?: string
}

/**
 * Funnel response filter criteria
 * Filtering options for funnel responses
 */
export type FunnelFilterCriteria = {
  userEmail?: string
  categoryKey?: string
  dateRange?: {
    start: string
    end: string
  }
}

// ============================================================================
// EDIT STATE TYPES
// ============================================================================

/**
 * Funnel edit state
 * Tracks which funnel responses are being edited and their values
 */
export type FunnelEditState = Record<string, string>

/**
 * Booking edit state
 * Tracks which bookings are being edited and their values
 */
export type BookingEditState = Record<string, {
  name?: string
  notes?: string
  answers?: string
  status?: string
}>

/**
 * Business details state
 * Tracks expanded business application details
 */
export type BusinessDetailsState = {
  expanded: Record<string, any>
  loading: Record<string, boolean>
}

// ============================================================================
// IMPORT/EXPORT TYPES
// ============================================================================

/**
 * Calendar event with zip code filtering data
 * Used during bulk import zip code validation
 */
export type CalendarEventWithZip = {
  id: string
  title: string
  description?: string | null
  date: string
  time?: string | null
  location?: string | null
  address?: string | null
  category: string
  source: string
  upvotes: number
  downvotes: number
  created_at: string
  updated_at?: string | null
  user_id?: string | null
  provider_id?: string | null
  is_flagged?: boolean | null
  flag_count?: number | null
  zip: string | null
  reason?: string
}

/**
 * Zip filter modal state
 * Manages the zip code filtering modal during bulk import
 */
export type ZipFilterModalState = {
  isOpen: boolean
  eventsToFilter: {
    toDelete: CalendarEventWithZip[]
    toKeep: CalendarEventWithZip[]
    event?: import('./index').CalendarEvent
  }
}

/**
 * CSV import state
 * Tracks CSV file upload and processing
 */
export type CSVImportState = {
  file: File | null
  isProcessing: boolean
  error: string | null
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Expanded state tracker
 * Generic type for tracking which items are expanded in collapsible UI
 */
export type ExpandedState = Set<string>

/**
 * Loading state tracker
 * Tracks loading states for specific operations
 */
export type LoadingState = {
  savingProvider: boolean
  uploadingImages: boolean
  deletingUser: string | null
  deletingCustomer: string | null
}

/**
 * Confirmation dialog state
 * Manages confirmation dialogs for destructive actions
 */
export type ConfirmationDialogState = {
  isOpen: boolean
  providerId?: string | null
  userId?: string | null
  message: string
  onConfirm: () => void
}

/**
 * Message state
 * User feedback messages (success/error)
 */
export type MessageState = {
  type: 'success' | 'error' | 'info'
  text: string
} | null

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Provider section props
 * Props for the providers management section component
 */
export type ProvidersSectionProps = {
  providers: ProviderRow[]
  selectedProviderId: string | null
  onSelectProvider: (id: string | null) => void
  onUpdateProvider: (provider: ProviderRow) => Promise<void>
  onDeleteProvider: (id: string) => Promise<void>
  isLoading: boolean
  filter: ProviderFilterCriteria
  onFilterChange: (filter: ProviderFilterCriteria) => void
}

/**
 * Business applications section props
 * Props for business applications management section
 */
export type BusinessApplicationsSectionProps = {
  applications: BusinessApplicationRow[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  isLoading: boolean
}

/**
 * Change requests section props
 * Props for provider change requests management section
 */
export type ChangeRequestsSectionProps = {
  requests: ProviderChangeRequestWithDetails[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  expandedIds: ExpandedState
  onToggleExpanded: (id: string) => void
  isLoading: boolean
}

/**
 * Job posts section props
 * Props for job posts management section
 */
export type JobPostsSectionProps = {
  jobPosts: ProviderJobPostWithDetails[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  isLoading: boolean
}

/**
 * Calendar events section props
 * Props for calendar events management section
 */
export type CalendarEventsSectionProps = {
  events: import('./index').CalendarEvent[]
  onAddEvent: (event: CalendarEventFormData) => Promise<void>
  onUpdateEvent: (id: string, event: Partial<CalendarEventFormData>) => Promise<void>
  onDeleteEvent: (id: string) => Promise<void>
  onBulkImport: (file: File) => Promise<void>
  selectedEventIds: ExpandedState
  onToggleSelectEvent: (id: string) => void
  isLoading: boolean
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Provider with retry data
 * Used when retrying failed provider operations
 */
export type ProviderWithRetry = ProviderRow & {
  retryCount?: number
  lastError?: string
}

/**
 * Admin statistics
 * Summary statistics for admin dashboard
 */
export type AdminStatistics = {
  totalProviders: number
  featuredProviders: number
  pendingApplications: number
  pendingChangeRequests: number
  totalUsers: number
  totalEvents: number
  flaggedEvents: number
}
