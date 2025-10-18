/**
 * ADMIN TYPES
 * 
 * Type definitions for the Admin page and admin data service.
 * Extracted from Admin.tsx for better organization and reusability.
 */

import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'

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
