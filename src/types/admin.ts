// Admin page types - extracted from Admin.tsx for better organization

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

export type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

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

export type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

export type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

// Extended type for change requests with joined provider and profile data
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

// Extended type for job posts with provider information
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

// Admin section types
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
  | 'blog'
  | 'calendar-events'
  | 'flagged-events'

// Admin status type
export type AdminStatus = {
  isAdmin: boolean
  isLoading: boolean
  error: string | null
}

// Blog post type for admin
export type AdminBlogPost = {
  id?: string
  category_key: string
  title: string
  content: string
  images?: string[]
}
