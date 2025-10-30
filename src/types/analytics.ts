/**
 * Analytics Type Definitions
 * Generated from VERIFIED database schema on 2025-10-30
 * 
 * Tables: listing_analytics, funnel_attribution, booking_attribution
 * RLS: Enabled with public INSERT, owner SELECT, admin DELETE
 */

// ============================================
// Database Table Types (Match Exact Schema)
// ============================================

export interface ListingAnalytics {
  id: string
  provider_id: string
  event_type: 'view' | 'phone_click' | 'website_click' | 'save'
  user_id: string | null
  session_id: string | null
  referrer: string | null
  user_agent: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface FunnelAttribution {
  id: string
  funnel_response_id: string
  provider_id: string | null
  session_id: string | null
  referrer_url: string | null
  created_at: string
}

export interface BookingAttribution {
  id: string
  booking_id: string
  provider_id: string | null
  source: 'listing_view' | 'search' | 'direct' | 'calendar'
  session_id: string | null
  created_at: string
}

// ============================================
// Metadata Types (for ListingAnalytics.metadata)
// ============================================

export interface ViewMetadata {
  category?: string
  is_featured?: boolean
  search_source?: string | null
  referrer_domain?: string
}

export interface ClickMetadata {
  location?: string // 'provider_page' | 'search_card' | 'community'
  is_mobile?: boolean
  destination?: string // For website clicks
  button_type?: string
}

export interface SaveMetadata {
  action?: 'saved' | 'unsaved'
  from_page?: string
}

// ============================================
// Aggregated Analytics (for Dashboard Display)
// ============================================

export interface ProviderAnalyticsSummary {
  provider_id: string
  provider_name?: string
  total_views: number
  total_saves: number
  total_phone_clicks: number
  total_website_clicks: number
  total_funnel_responses: number
  total_bookings: number
  conversion_rate: number // (bookings / views) * 100
  date_range: {
    start: string
    end: string
  }
}

export interface ProviderAnalyticsDetail {
  provider_id: string
  provider_name?: string
  events: ListingAnalytics[]
  funnel_responses: FunnelAttribution[]
  bookings: BookingAttribution[]
  summary: ProviderAnalyticsSummary
}

// ============================================
// Service Return Types
// ============================================

export interface AnalyticsResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TrackingResult {
  success: boolean
  error?: string
  blocked?: boolean // If tracking was intentionally blocked
}

