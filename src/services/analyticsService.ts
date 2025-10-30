/**
 * Analytics Service
 * Handles all analytics tracking and data retrieval
 * 
 * Key Features:
 * - Anonymous tracking support (session-based)
 * - Non-blocking (failures don't break UI)
 * - Respects user privacy preferences
 * - Comprehensive error handling
 */

import { supabase } from '@/lib/supabase'
import type {
  ListingAnalytics,
  FunnelAttribution,
  BookingAttribution,
  ProviderAnalyticsSummary,
  TrackingResult,
  AnalyticsResult,
} from '@/types/analytics'

// ============================================
// Session Management (for Anonymous Tracking)
// ============================================

const SESSION_KEY = 'bf_analytics_session_id'

/**
 * Get or create a session ID for anonymous tracking
 * Stored in sessionStorage (clears on tab close)
 */
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Get current user agent
 */
function getUserAgent(): string {
  return navigator.userAgent
}

/**
 * Get referrer domain (not full URL for privacy)
 */
function getReferrerDomain(): string | null {
  try {
    if (!document.referrer) return null
    const url = new URL(document.referrer)
    return url.hostname
  } catch {
    return null
  }
}

// ============================================
// Listing Analytics Tracking
// ============================================

/**
 * Track a listing event (view, click, save)
 * Works for both authenticated and anonymous users
 * 
 * @param providerId - Provider UUID
 * @param eventType - Type of event to track
 * @param metadata - Additional context (optional)
 * @returns Success status
 */
export async function trackListingEvent(
  providerId: string,
  eventType: ListingAnalytics['event_type'],
  metadata?: Record<string, any>
): Promise<TrackingResult> {
  try {
    // Get user context
    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = getOrCreateSessionId()
    
    // Build analytics record
    const record = {
      provider_id: providerId,
      event_type: eventType,
      user_id: user?.id || null,
      session_id: sessionId,
      referrer: getReferrerDomain(),
      user_agent: getUserAgent(),
      metadata: metadata || {},
    }
    
    // Insert (RLS allows public INSERT)
    const { error } = await supabase
      .from('listing_analytics')
      .insert(record)
    
    if (error) {
      console.error('[Analytics] Failed to track listing event:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`[Analytics] Tracked ${eventType} for provider:`, providerId)
    return { success: true }
  } catch (err) {
    console.error('[Analytics] Exception tracking event:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Check if view has been tracked this session
 * Prevents double-counting page refreshes
 */
export function hasTrackedViewThisSession(providerId: string): boolean {
  const key = `viewed_${providerId}`
  return sessionStorage.getItem(key) === 'true'
}

/**
 * Mark view as tracked for this session
 */
export function markViewTracked(providerId: string): void {
  const key = `viewed_${providerId}`
  sessionStorage.setItem(key, 'true')
}

// ============================================
// Funnel Attribution Tracking
// ============================================

/**
 * Track which provider a funnel response came from
 * Should be called when funnel is submitted
 * 
 * @param funnelResponseId - UUID of the funnel_responses record
 * @param providerId - Provider that drove the funnel (optional)
 * @param referrerUrl - Full referrer URL (optional)
 * @returns Success status
 */
export async function trackFunnelAttribution(
  funnelResponseId: string,
  providerId: string | null,
  referrerUrl?: string
): Promise<TrackingResult> {
  try {
    const sessionId = getOrCreateSessionId()
    
    const record = {
      funnel_response_id: funnelResponseId,
      provider_id: providerId,
      session_id: sessionId,
      referrer_url: referrerUrl || document.referrer || null,
    }
    
    const { error } = await supabase
      .from('funnel_attribution')
      .insert(record)
    
    if (error) {
      // Handle duplicate key error gracefully (already attributed)
      if (error.code === '23505') {
        console.log('[Analytics] Funnel attribution already exists (skipping):', funnelResponseId)
        return { success: true, blocked: true }
      }
      
      console.error('[Analytics] Failed to track funnel attribution:', error)
      return { success: false, error: error.message }
    }
    
    console.log('[Analytics] Tracked funnel attribution:', funnelResponseId)
    return { success: true }
  } catch (err) {
    console.error('[Analytics] Exception tracking funnel:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Store last viewed provider in session
 * Used for attribution when user submits funnel
 */
export function storeLastViewedProvider(providerId: string): void {
  sessionStorage.setItem('last_viewed_provider', providerId)
  sessionStorage.setItem('last_viewed_provider_time', Date.now().toString())
}

/**
 * Get last viewed provider (within attribution window)
 * Returns null if no provider viewed or too much time passed
 * 
 * @param windowMinutes - Attribution window in minutes (default 30)
 */
export function getLastViewedProvider(windowMinutes: number = 30): string | null {
  const providerId = sessionStorage.getItem('last_viewed_provider')
  const timeStr = sessionStorage.getItem('last_viewed_provider_time')
  
  if (!providerId || !timeStr) return null
  
  const timeSince = Date.now() - parseInt(timeStr)
  const windowMs = windowMinutes * 60 * 1000
  
  if (timeSince > windowMs) return null
  
  return providerId
}

// ============================================
// Booking Attribution Tracking
// ============================================

/**
 * Track where a booking came from
 * Should be called when booking is created
 * 
 * @param bookingId - UUID of the bookings record
 * @param providerId - Provider being booked (optional)
 * @param source - Traffic source
 * @returns Success status
 */
export async function trackBookingAttribution(
  bookingId: string,
  providerId: string | null,
  source: BookingAttribution['source']
): Promise<TrackingResult> {
  try {
    const sessionId = getOrCreateSessionId()
    
    const record = {
      booking_id: bookingId,
      provider_id: providerId,
      source,
      session_id: sessionId,
    }
    
    const { error } = await supabase
      .from('booking_attribution')
      .insert(record)
    
    if (error) {
      // Handle duplicate key error gracefully (already attributed)
      if (error.code === '23505') {
        console.log('[Analytics] Booking attribution already exists (skipping):', bookingId)
        return { success: true, blocked: true }
      }
      
      console.error('[Analytics] Failed to track booking attribution:', error)
      return { success: false, error: error.message }
    }
    
    console.log('[Analytics] Tracked booking attribution:', bookingId)
    return { success: true }
  } catch (err) {
    console.error('[Analytics] Exception tracking booking:', err)
    return { success: false, error: 'Unknown error' }
  }
}

// ============================================
// Analytics Retrieval (for Dashboard)
// ============================================

/**
 * Get all analytics events for a provider
 * RLS ensures only owner or admin can access
 * 
 * @param providerId - Provider UUID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 */
export async function getProviderAnalytics(
  providerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsResult<ListingAnalytics[]>> {
  try {
    let query = supabase
      .from('listing_analytics')
      .select('*')
      .eq('provider_id', providerId)
    
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Analytics] Failed to fetch analytics:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as ListingAnalytics[] }
  } catch (err) {
    console.error('[Analytics] Exception fetching analytics:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Get analytics summary for a provider
 * Aggregates views, clicks, conversions, etc.
 * 
 * @param providerId - Provider UUID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 */
export async function getProviderAnalyticsSummary(
  providerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsResult<ProviderAnalyticsSummary>> {
  try {
    // Fetch all analytics events
    const analyticsResult = await getProviderAnalytics(providerId, startDate, endDate)
    if (!analyticsResult.success || !analyticsResult.data) {
      return { success: false, error: analyticsResult.error }
    }
    
    const events = analyticsResult.data
    
    // Count by event type
    const total_views = events.filter(e => e.event_type === 'view').length
    const total_saves = events.filter(e => e.event_type === 'save').length
    const total_phone_clicks = events.filter(e => e.event_type === 'phone_click').length
    const total_website_clicks = events.filter(e => e.event_type === 'website_click').length
    
    // Get funnel responses
    let funnelQuery = supabase
      .from('funnel_attribution')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
    
    if (startDate) funnelQuery = funnelQuery.gte('created_at', startDate.toISOString())
    if (endDate) funnelQuery = funnelQuery.lte('created_at', endDate.toISOString())
    
    const { count: total_funnel_responses } = await funnelQuery
    
    // Get bookings
    let bookingQuery = supabase
      .from('booking_attribution')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
    
    if (startDate) bookingQuery = bookingQuery.gte('created_at', startDate.toISOString())
    if (endDate) bookingQuery = bookingQuery.lte('created_at', endDate.toISOString())
    
    const { count: total_bookings } = await bookingQuery
    
    // Calculate conversion rate
    const conversion_rate = total_views > 0 
      ? ((total_bookings || 0) / total_views) * 100 
      : 0
    
    const summary: ProviderAnalyticsSummary = {
      provider_id: providerId,
      total_views,
      total_saves,
      total_phone_clicks,
      total_website_clicks,
      total_funnel_responses: total_funnel_responses || 0,
      total_bookings: total_bookings || 0,
      conversion_rate: parseFloat(conversion_rate.toFixed(2)),
      date_range: {
        start: startDate?.toISOString() || new Date(0).toISOString(),
        end: endDate?.toISOString() || new Date().toISOString(),
      },
    }
    
    return { success: true, data: summary }
  } catch (err) {
    console.error('[Analytics] Exception fetching summary:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Get funnel responses attributed to a provider
 * 
 * @param providerId - Provider UUID
 */
export async function getFunnelResponsesFromProvider(
  providerId: string
): Promise<AnalyticsResult<FunnelAttribution[]>> {
  try {
    const { data, error } = await supabase
      .from('funnel_attribution')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Analytics] Failed to fetch funnel attribution:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as FunnelAttribution[] }
  } catch (err) {
    console.error('[Analytics] Exception fetching funnel attribution:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Get bookings attributed to a provider
 * 
 * @param providerId - Provider UUID
 */
export async function getBookingsFromProvider(
  providerId: string
): Promise<AnalyticsResult<BookingAttribution[]>> {
  try {
    const { data, error } = await supabase
      .from('booking_attribution')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Analytics] Failed to fetch booking attribution:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as BookingAttribution[] }
  } catch (err) {
    console.error('[Analytics] Exception fetching booking attribution:', err)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Get analytics for ALL providers owned by a user
 * Useful for multi-listing business owners
 * 
 * @param providerIds - Array of provider UUIDs
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 */
export async function getMultiProviderAnalytics(
  providerIds: string[],
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsResult<Record<string, ProviderAnalyticsSummary>>> {
  try {
    const summaries: Record<string, ProviderAnalyticsSummary> = {}
    
    // Fetch summary for each provider
    for (const providerId of providerIds) {
      const result = await getProviderAnalyticsSummary(providerId, startDate, endDate)
      if (result.success && result.data) {
        summaries[providerId] = result.data
      }
    }
    
    return { success: true, data: summaries }
  } catch (err) {
    console.error('[Analytics] Exception fetching multi-provider analytics:', err)
    return { success: false, error: 'Unknown error' }
  }
}

