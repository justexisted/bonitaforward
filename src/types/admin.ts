/**
 * ADMIN TYPES
 * 
 * Type definitions for the Admin page and admin data service.
 * Extracted from Admin.tsx for better organization and reusability.
 */

import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'

// ============================================================================
// ADMIN SECTION TYPES
// ============================================================================

/**
 * Admin section identifiers
 * Defines all available sections in the admin panel
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
 * Admin status for verification
 */
export type AdminStatus = {
  isAdmin: boolean
  loading: boolean
  verified: boolean
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

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
  // Enhanced business management fields
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

// ============================================================================
// FUNNEL TYPES
// ============================================================================

export type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

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
    phone: string | null
  }
}

// ============================================================================
// BUSINESS APPLICATION TYPES
// ============================================================================

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

// ============================================================================
// CONTACT LEAD TYPES
// ============================================================================

export type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

// ============================================================================
// USER/PROFILE TYPES
// ============================================================================

export type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

// ============================================================================
// PROVIDER CHANGE REQUEST TYPES
// ============================================================================

export type ProviderChangeRequestWithDetails = ProviderChangeRequest & {
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

// ============================================================================
// JOB POST TYPES
// ============================================================================

export type ProviderJobPostWithDetails = ProviderJobPost & {
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
// CALENDAR EVENT TYPES
// ============================================================================

export type FlaggedEventRow = {
  id: string
  event_id: string
  user_id: string
  reason: string
  details: string | null
  created_at: string
  event?: any // CalendarEvent
  reporter_email?: string
}

// ============================================================================
// COMBINED ADMIN DATA TYPE
// ============================================================================

export type AdminData = {
  providers: ProviderRow[]
  funnels: FunnelRow[]
  bookings: BookingRow[]
  bookingEvents: BookingEventRow[]
  calendarEvents: any[] // CalendarEvent[]
  flaggedEvents: any[]
  businessApplications: BusinessApplicationRow[]
  contactLeads: ContactLeadRow[]
  profiles: ProfileRow[]
  changeRequests: ProviderChangeRequestWithDetails[]
  jobPosts: ProviderJobPostWithDetails[]
}

// ============================================================================
// FORM & DRAFT TYPES
// ============================================================================

/**
 * Blog post type for admin blog management
 */
export type AdminBlogPost = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  author_id: string | null
  published: boolean
  featured_image: string | null
  created_at: string
  updated_at: string
  category: string | null
  tags: string[] | null
}

/**
 * Calendar event form data
 */
export type CalendarEventFormData = {
  title: string
  date: string
  time?: string
  location?: string
  description?: string
  category?: string
  organizer?: string
  contact_email?: string
  contact_phone?: string
  website_url?: string
  image_url?: string
  is_featured?: boolean
  zip_codes?: string[]
}

/**
 * New provider form data for creating providers
 */
export type NewProviderFormData = {
  name: string
  category_key: string
  phone?: string
  email?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  images?: string[]
  owner_user_id?: string
  is_member?: boolean
  is_featured?: boolean
  featured_since?: string
  subscription_type?: 'monthly' | 'yearly' | null
  business_hours?: Record<string, string>
  specialties?: string[]
  social_links?: Record<string, string>
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Featured provider filter options
 */
export type FeaturedProviderFilter = 'all' | 'featured' | 'non-featured'

/**
 * Provider filter criteria
 */
export type ProviderFilterCriteria = {
  category?: string
  featured?: FeaturedProviderFilter
  searchTerm?: string
  hasOwner?: boolean
}

/**
 * Funnel filter criteria
 */
export type FunnelFilterCriteria = {
  category?: string
  dateFrom?: string
  dateTo?: string
  searchTerm?: string
}

// ============================================================================
// EDIT STATE TYPES
// ============================================================================

/**
 * Funnel edit state
 */
export type FunnelEditState = {
  editingId: string | null
  editingAnswers: Record<string, string>
}

/**
 * Booking edit state
 */
export type BookingEditState = {
  editingId: string | null
  editingData: Partial<BookingRow>
}

/**
 * Business application details state
 */
export type BusinessDetailsState = {
  expandedId: string | null
  details: Record<string, any> | null
}

// ============================================================================
// IMPORT/EXPORT TYPES
// ============================================================================

/**
 * Calendar event with zip code data
 */
export type CalendarEventWithZip = {
  id: string
  title: string
  date: string
  location?: string
  zip?: string | null
  reason?: string
}

/**
 * Zip code filter modal state
 */
export type ZipFilterModalState = {
  show: boolean
  toDelete: CalendarEventWithZip[]
  toKeep: CalendarEventWithZip[]
}

/**
 * CSV import state
 */
export type CSVImportState = {
  file: File | null
  importing: boolean
  error: string | null
  success: boolean
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Generic expanded state (for accordions, etc.)
 */
export type ExpandedState = Record<string, boolean> | Set<string>

/**
 * Loading state for async operations
 */
export type LoadingState = {
  [key: string]: boolean
}

/**
 * Confirmation dialog state
 */
export type ConfirmationDialogState = {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * Message/notification state
 */
export type MessageState = {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for ProvidersSection component
 */
export type ProvidersSectionProps = {
  isAdmin: boolean
  section: AdminSection
  providers?: ProviderRow[]
  onUpdate?: () => void
  onDelete?: (id: string) => void
}

/**
 * Props for BusinessApplicationsSection component
 */
export type BusinessApplicationsSectionProps = {
  isAdmin: boolean
  applications: BusinessApplicationRow[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onUpdate?: () => void
}

/**
 * Props for ChangeRequestsSection component
 */
export type ChangeRequestsSectionProps = {
  isAdmin: boolean
  changeRequests: ProviderChangeRequestWithDetails[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onUpdate?: () => void
}

/**
 * Props for JobPostsSection component
 */
export type JobPostsSectionProps = {
  isAdmin: boolean
  jobPosts: ProviderJobPostWithDetails[]
  onUpdate?: () => void
  onDelete?: (id: string) => void
}

/**
 * Props for CalendarEventsSection component
 */
export type CalendarEventsSectionProps = {
  isAdmin: boolean
  events: any[] // CalendarEvent[]
  flaggedEvents?: any[]
  onUpdate?: () => void
  onDelete?: (id: string) => void
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Provider with retry information for failed operations
 */
export type ProviderWithRetry = ProviderRow & {
  retryCount?: number
  lastError?: string
  lastAttempt?: string
}

/**
 * Admin statistics/metrics
 */
export type AdminStatistics = {
  totalProviders: number
  featuredProviders: number
  totalBookings: number
  pendingApplications: number
  totalUsers: number
  activeEvents: number
  flaggedEvents: number
  recentActivity: {
    newProviders: number
    newBookings: number
    newApplications: number
  }
}
