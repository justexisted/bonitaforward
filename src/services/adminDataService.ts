/**
 * ADMIN DATA SERVICE
 * 
 * Centralized service for loading and managing admin data from Supabase.
 * This service encapsulates all database queries used by the Admin page,
 * making the code more maintainable and testable.
 * 
 * Features:
 * - Load providers, bookings, calendar events, etc.
 * - CRUD operations for all admin entities
 * - Type-safe query functions
 * - Error handling and logging
 * 
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 * 
 * Usage:
 * ```typescript
 * import { AdminDataService } from './services/adminDataService'
 * 
 * const providers = await AdminDataService.fetchProviders()
 * ```
 */

import { query, update, deleteRows } from '../lib/supabaseQuery'
import type { 
  ProviderRow, 
  FunnelRow, 
  BookingRow, 
  BookingEventRow,
  BusinessApplicationRow,
  ContactLeadRow,
  ProfileRow,
  ProviderChangeRequestWithDetails,
  ProviderJobPostWithDetails
} from '../types/admin'
import type { CalendarEvent } from '../pages/Calendar'

// ============================================================================
// PROVIDER QUERIES
// ============================================================================

/**
 * Fetch all providers from database
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<ProviderRow[]>
 */
export async function fetchProviders(): Promise<ProviderRow[]> {
  try {
    const result = await query('providers', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('name')
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProviderRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch providers:', error)
    return []
  }
}

/**
 * Update a provider record
 * Uses centralized query utility with automatic retry logic
 * @param id Provider ID
 * @param updates Fields to update
 * @returns Promise<boolean>
 */
export async function updateProvider(
  id: string, 
  updates: Partial<ProviderRow>
): Promise<boolean> {
  try {
    const result = await update(
      'providers',
      updates,
      { id },
      { logPrefix: '[AdminDataService]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return false
    }
    
    return true
  } catch (error) {
    console.error('[AdminDataService] Failed to update provider:', error)
    return false
  }
}

/**
 * Delete a provider record
 * Uses centralized query utility with automatic retry logic
 * @param id Provider ID
 * @returns Promise<boolean>
 */
export async function deleteProvider(id: string): Promise<boolean> {
  try {
    const result = await deleteRows(
      'providers',
      { id },
      { logPrefix: '[AdminDataService]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return false
    }
    
    return true
  } catch (error) {
    console.error('[AdminDataService] Failed to delete provider:', error)
    return false
  }
}

// ============================================================================
// FUNNEL QUERIES
// ============================================================================

/**
 * Fetch all funnel responses
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<FunnelRow[]>
 */
export async function fetchFunnels(): Promise<FunnelRow[]> {
  try {
    const result = await query('funnel_responses', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as FunnelRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch funnels:', error)
    return []
  }
}

// ============================================================================
// BOOKING QUERIES
// ============================================================================

/**
 * Fetch all bookings
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<BookingRow[]>
 */
export async function fetchBookings(): Promise<BookingRow[]> {
  try {
    const result = await query('bookings', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as BookingRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch bookings:', error)
    return []
  }
}

/**
 * Fetch all booking events with provider details
 * 
 * ⚠️ CRITICAL ADMIN REQUIREMENT:
 * The admin user MUST be able to see ALL bookings from all customers and providers.
 * This is essential for managing the platform and monitoring business activity.
 * 
 * If you see RLS permission errors, you MUST run fix-booking-events-admin-access.sql
 * to add the admin policies to the booking_events table.
 * 
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<BookingEventRow[]>
 */
export async function fetchBookingEvents(): Promise<BookingEventRow[]> {
  try {
    // Select specific columns to avoid permission errors on related tables (like users)
    // This prevents Supabase from trying to follow foreign keys we don't have access to
    const result = await query('booking_events', { logPrefix: '[AdminDataService]' })
      .select('id, provider_id, customer_email, customer_name, booking_date, booking_duration_minutes, booking_notes, status, created_at')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // RLS PERMISSION ERROR - log error details for troubleshooting
      // Error already logged by query utility with standardized format
      return [] // Return empty array, admin panel will still function
    }
    
    return (result.data || []) as BookingEventRow[]
  } catch (error) {
    console.error('[AdminDataService] Booking events fetch failed:', error)
    return []
  }
}

// ============================================================================
// CALENDAR QUERIES
// ============================================================================

/**
 * Fetch all calendar events
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<CalendarEvent[]>
 */
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const result = await query('calendar_events', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('date', { ascending: false })
      .limit(1000)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as CalendarEvent[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch calendar events:', error)
    return []
  }
}

/**
 * Fetch flagged events with reporter details
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<FlaggedEventRow[]>
 */
export async function fetchFlaggedEvents() {
  try {
    // Simplified query without joins - avoid foreign key relationship errors
    // Flagged events can be enriched client-side if needed by matching event_id and user_id
    const result = await query('event_flags', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return result.data || []
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch flagged events:', error)
    return []
  }
}

// ============================================================================
// BUSINESS APPLICATION QUERIES
// ============================================================================

/**
 * Fetch all business applications
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<BusinessApplicationRow[]>
 */
export async function fetchBusinessApplications(): Promise<BusinessApplicationRow[]> {
  try {
    const result = await query('contact_leads', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as BusinessApplicationRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch business applications:', error)
    return []
  }
}

/**
 * Update business application status
 * Uses centralized query utility with automatic retry logic
 * @param id Application ID
 * @param status New status
 * @returns Promise<boolean>
 */
export async function updateBusinessApplicationStatus(
  id: string,
  status: string
): Promise<boolean> {
  try {
    const result = await update(
      'contact_leads',
      { status },
      { id },
      { logPrefix: '[AdminDataService]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return false
    }
    
    return true
  } catch (error) {
    console.error('[AdminDataService] Failed to update application status:', error)
    return false
  }
}

// ============================================================================
// CONTACT LEAD QUERIES
// ============================================================================

/**
 * Fetch all contact leads
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<ContactLeadRow[]>
 */
export async function fetchContactLeads(): Promise<ContactLeadRow[]> {
  try {
    const result = await query('contact_leads', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ContactLeadRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch contact leads:', error)
    return []
  }
}

// ============================================================================
// USER/PROFILE QUERIES
// ============================================================================

/**
 * Fetch all user profiles
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<ProfileRow[]>
 */
export async function fetchProfiles(): Promise<ProfileRow[]> {
  try {
    const result = await query('profiles', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('email')
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProfileRow[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch profiles:', error)
    return []
  }
}

// ============================================================================
// PROVIDER CHANGE REQUEST QUERIES
// ============================================================================

/**
 * Fetch all provider change requests with details
 * Uses centralized query utility with automatic retry logic
 * @returns Promise<ProviderChangeRequestWithDetails[]>
 */
export async function fetchProviderChangeRequests(): Promise<ProviderChangeRequestWithDetails[]> {
  try {
    // Simplified query without joins - avoid foreign key relationship errors
    // Change requests can be enriched client-side if needed by matching IDs
    const result = await query('provider_change_requests', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProviderChangeRequestWithDetails[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch change requests:', error)
    return []
  }
}

// ============================================================================
// JOB POST QUERIES
// ============================================================================

/**
 * Fetch all provider job posts with details
 * @returns Promise<ProviderJobPostWithDetails[]>
 */
export async function fetchProviderJobPosts(): Promise<ProviderJobPostWithDetails[]> {
  try {
    // Simplified query without joins - avoid foreign key relationship errors
    // Job posts can be enriched client-side if needed by matching IDs
    const result = await query('provider_job_posts', { logPrefix: '[AdminDataService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProviderJobPostWithDetails[]
  } catch (error) {
    console.error('[AdminDataService] Failed to fetch job posts:', error)
    return []
  }
}

// ============================================================================
// COMBINED DATA LOADING
// ============================================================================

/**
 * Load all admin data in parallel
 * Useful for initial page load
 * 
 * @returns Promise with all admin data
 */
export async function loadAllAdminData() {
  console.log('[AdminDataService] Loading all admin data...')
  
  const [
    providers,
    funnels,
    bookings,
    bookingEvents,
    calendarEvents,
    flaggedEvents,
    businessApplications,
    contactLeads,
    profiles,
    changeRequests,
    jobPosts
  ] = await Promise.all([
    fetchProviders(),
    fetchFunnels(),
    fetchBookings(),
    fetchBookingEvents(),
    fetchCalendarEvents(),
    fetchFlaggedEvents(),
    fetchBusinessApplications(),
    fetchContactLeads(),
    fetchProfiles(),
    fetchProviderChangeRequests(),
    fetchProviderJobPosts()
  ])
  
  console.log('[AdminDataService] All admin data loaded')
  
  return {
    providers,
    funnels,
    bookings,
    bookingEvents,
    calendarEvents,
    flaggedEvents,
    businessApplications,
    contactLeads,
    profiles,
    changeRequests,
    jobPosts
  }
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

export const AdminDataService = {
  // Providers
  fetchProviders,
  updateProvider,
  deleteProvider,
  
  // Funnels
  fetchFunnels,
  
  // Bookings
  fetchBookings,
  fetchBookingEvents,
  
  // Calendar
  fetchCalendarEvents,
  fetchFlaggedEvents,
  
  // Business Applications
  fetchBusinessApplications,
  updateBusinessApplicationStatus,
  
  // Contact Leads
  fetchContactLeads,
  
  // Users/Profiles
  fetchProfiles,
  
  // Change Requests
  fetchProviderChangeRequests,
  
  // Job Posts
  fetchProviderJobPosts,
  
  // Combined
  loadAllAdminData
}

export default AdminDataService

