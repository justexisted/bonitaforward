/**
 * SHARED TYPE DEFINITIONS
 * 
 * Centralized type definitions used across the application.
 * This file serves as the single source of truth for all shared types,
 * preventing duplication and ensuring consistency.
 * 
 * Type Categories:
 * - Core Types (CategoryKey, Provider, Category)
 * - Business Types (ProviderDetails, BusinessApplication)
 * - Funnel Types (FunnelOption, FunnelQuestion)
 * - Event Types (CalendarEvent)
 * - Booking Types (Booking, BookingEvent)
 * - User Types (Profile, UserNotification)
 * - Admin Types (re-exported from admin.ts)
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Category keys for business types
 * These map to the category_key column in the providers table
 */
export type CategoryKey = 
  | 'real-estate' 
  | 'home-services' 
  | 'health-wellness' 
  | 'restaurants-cafes' 
  | 'professional-services'

/**
 * Category display information
 * Used for navigation, cards, and category pages
 */
export type Category = {
  key: CategoryKey
  name: string
  description: string
  icon: string
}

/**
 * Provider/Business type matching the database schema
 * This is the main business entity in the application
 */
export type Provider = {
  id: string
  name: string
  slug: string
  category_key: CategoryKey
  tags: string[]
  rating?: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  isMember?: boolean
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  images?: string[] | null
  badges?: string[] | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  featured_since?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
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
  bonita_resident_discount?: string | null
  owner_user_id?: string | null
  is_featured?: boolean | null
}

/**
 * Extended provider details with additional computed fields
 * Used for provider detail pages and booking flow
 */
export type ProviderDetails = Provider & {
  hasBooking?: boolean
  hasCalendar?: boolean
  hasCall?: boolean
  hasEmail?: boolean
  hasCoupon?: boolean
  isExpired?: boolean
}

// ============================================================================
// FUNNEL TYPES
// ============================================================================

/**
 * Funnel option - a single answer choice for a question
 */
export type FunnelOption = {
  id: string
  label: string
}

/**
 * Funnel question - a question with multiple answer options
 */
export type FunnelQuestion = {
  id: string
  prompt: string
  options: FunnelOption[]
}

/**
 * Funnel response stored in database
 */
export type FunnelResponse = {
  id: string
  user_email: string
  category: CategoryKey
  answers: Record<string, string>
  created_at: string
}

// ============================================================================
// CALENDAR & EVENT TYPES
// ============================================================================

/**
 * Calendar event
 * Used for community events, business events, and promotional activities
 */
export type CalendarEvent = {
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
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

/**
 * Booking request from a customer
 * Stored in customer_bookings table
 */
export type Booking = {
  id: string
  user_email?: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  provider_id: string
  provider_name?: string | null
  category_key?: CategoryKey | null
  booking_type?: string | null
  time?: string | null
  date?: string | null
  booking_duration_minutes?: number | null
  booking_notes?: string | null
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | null
  created_at: string
  updated_at?: string | null
}

/**
 * Booking event (alternative booking system)
 * Stored in booking_events table
 */
export type BookingEvent = {
  id: string
  customer_email: string
  customer_name?: string | null
  provider_id?: string | null
  provider_name?: string | null
  event_date?: string | null
  event_time?: string | null
  notes?: string | null
  status?: string | null
  created_at: string
  updated_at?: string | null
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User profile
 * Stored in profiles table
 */
export type Profile = {
  id: string
  email: string
  name?: string | null
  role?: 'customer' | 'business' | 'admin' | 'community' | null
  created_at?: string | null
  updated_at?: string | null
}

/**
 * User notification
 * Stored in user_notifications table
 */
export type UserNotification = {
  id: string
  user_id: string
  subject: string
  body?: string | null
  data?: Record<string, any> | null
  read: boolean
  created_at: string
  is_read?: boolean | null
  dismissed_at?: string | null
}

// ============================================================================
// BUSINESS APPLICATION TYPES
// ============================================================================

/**
 * Business application submission
 * Stored in business_applications table
 */
export type BusinessApplication = {
  id: string
  full_name?: string | null
  business_name?: string | null
  email?: string | null
  phone?: string | null
  category?: string | null
  challenge?: string | null
  created_at: string
  tier_requested?: 'free' | 'featured' | null
  status?: 'pending' | 'approved' | 'rejected' | null
  decided_at?: string | null
}

// ============================================================================
// CHANGE REQUEST TYPES
// ============================================================================

/**
 * Provider change request
 * Stored in provider_change_requests table
 */
export type ProviderChangeRequest = {
  id: string
  provider_id?: string | null
  owner_user_id: string
  type: 'create' | 'update' | 'delete'
  changes?: Record<string, any> | null
  status: 'pending' | 'approved' | 'rejected'
  reason?: string | null
  created_at: string
  decided_at?: string | null
}

// ============================================================================
// JOB POST TYPES
// ============================================================================

/**
 * Provider job post
 * Stored in provider_job_posts table
 */
export type ProviderJobPost = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description?: string | null
  apply_url?: string | null
  salary_range?: string | null
  status?: 'pending' | 'approved' | 'rejected' | 'archived' | null
  published?: boolean | null
  created_at: string
  updated_at?: string | null
  decided_at?: string | null
}

// ============================================================================
// COUPON TYPES
// ============================================================================

/**
 * Coupon redemption
 * Stored in coupon_redemptions table
 */
export type CouponRedemption = {
  id: string
  user_id: string
  provider_id: string
  code?: string | null
  created_at: string
}

// ============================================================================
// SAVED PROVIDER TYPES
// ============================================================================

/**
 * Saved provider (user's saved businesses)
 * Stored in saved_providers table
 */
export type SavedProvider = {
  id: string
  user_id: string
  provider_id: string
  created_at: string
}

// ============================================================================
// CONTACT LEAD TYPES
// ============================================================================

/**
 * Contact form lead
 * Stored in contact_leads table
 */
export type ContactLead = {
  id: string
  business_name?: string | null
  contact_email?: string | null
  details?: string | null
  created_at: string
}

// ============================================================================
// RE-EXPORT ADMIN TYPES
// ============================================================================

// Re-export all admin-specific types from admin.ts
export type {
  // Database row types
  ProviderRow,
  FunnelRow,
  BookingRow,
  BookingEventRow,
  BusinessApplicationRow,
  ContactLeadRow,
  ProfileRow,
  FlaggedEventRow,
  
  // Extended types with joined data
  ProviderChangeRequestWithDetails,
  ProviderJobPostWithDetails,
  
  // Admin section & status
  AdminSection,
  AdminStatus,
  
  // Form & draft types
  AdminBlogPost,
  CalendarEventFormData,
  NewProviderFormData,
  
  // Filter types
  FeaturedProviderFilter,
  ProviderFilterCriteria,
  FunnelFilterCriteria,
  
  // Edit state types
  FunnelEditState,
  BookingEditState,
  BusinessDetailsState,
  
  // Import/export types
  CalendarEventWithZip,
  ZipFilterModalState,
  CSVImportState,
  
  // UI state types
  ExpandedState,
  LoadingState,
  ConfirmationDialogState,
  MessageState,
  
  // Component prop types
  ProvidersSectionProps,
  BusinessApplicationsSectionProps,
  ChangeRequestsSectionProps,
  JobPostsSectionProps,
  CalendarEventsSectionProps,
  
  // Helper types
  ProviderWithRetry,
  AdminStatistics,
} from './admin'

