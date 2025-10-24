/**
 * TYPE DEFINITIONS FOR MY BUSINESS PAGE
 * Centralized type definitions for business management dashboard
 */

// Type definition for business listings in the providers table
// Updated to include all enhanced business management fields that were added to the database
export type BusinessListing = {
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
  is_member: boolean | null  // This indicates if the provider is featured (admin-approved)
  published: boolean | null
  created_at: string | null  // Now available in database
  updated_at: string | null  // Now available in database
  
  // Enhanced business management fields (now stored in providers table)
  description: string | null
  specialties: string[] | null
  social_links: Record<string, string> | null
  business_hours: Record<string, string> | null
  service_areas: string[] | null
  google_maps_url: string | null
  bonita_resident_discount: string | null  // Discount offer for Bonita residents
  // Coupon fields
  coupon_code: string | null
  coupon_discount: string | null
  coupon_description: string | null
  coupon_expires_at: string | null
  // Booking system fields
  booking_enabled: boolean | null
  booking_type: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions: string | null
  booking_url: string | null
  // Contact method toggles
  enable_calendar_booking: boolean | null
  enable_call_contact: boolean | null
  enable_email_contact: boolean | null
  // Google Calendar integration fields
  google_calendar_connected: boolean | null
  google_calendar_id: string | null
  google_calendar_sync_enabled: boolean | null
}

// Type definition for business applications in the business_applications table
export type BusinessApplication = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  tier_requested: 'free' | 'featured' | null
  status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
}

// Type definition for job posts in the provider_job_posts table
export type JobPost = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description: string | null
  apply_url: string | null
  salary_range: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  decided_at: string | null
}

// Type definition for user activity tracking
export type UserActivity = {
  id: string
  provider_id: string
  user_email: string | null
  user_name: string | null
  activity_type?: 'profile_view' | 'discount_copy' | 'booking_request' | 'question_asked'
  activity_details: string | null
  created_at: string
  provider_name: string
  // New fields for notification types
  type?: 'booking_received' | 'booking_updated' | 'general'
  message?: string
  title?: string
  booking_id?: string
  is_read?: boolean
}

// Dashboard tab type
export type DashboardTab = 'listings' | 'applications' | 'jobs' | 'analytics' | 'change-requests'

// Image upload progress tracking
export type ImageUploadProgress = Record<string, number>

