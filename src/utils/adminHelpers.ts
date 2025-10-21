/**
 * Admin Helper Utilities
 * 
 * This file contains small helper functions and utilities used throughout the admin panel.
 * These functions were extracted from Admin.tsx to improve code organization.
 * 
 * Functions included:
 * - clearSavedState: Clear localStorage admin state
 * - startCreateNewProvider: Initialize new provider creation form
 * - cancelCreateProvider: Cancel provider creation and reset form
 * - normalizeEmail: Normalize email addresses for comparison
 * - normalizeRole: Normalize role strings for comparison
 * - getBusinessEmails: Get set of business owner emails
 * - getCustomerUsers: Get list of customer user emails
 */

import type { ProviderRow } from './adminProviderUtils'

// Type definitions
type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type BookingEvent = {
  id: string
  provider_id: string
  customer_email: string
  customer_name: string | null
  booking_date: string
  booking_duration_minutes: number | null
  booking_notes: string | null
  status: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * CLEAR SAVED STATE
 * 
 * Clears the admin state from localStorage and resets selected provider.
 */
export function clearSavedState(
  setSelectedProviderId: (id: string | null) => void
) {
  localStorage.removeItem('admin-state')
  setSelectedProviderId(null)
}

/**
 * START CREATE NEW PROVIDER
 * 
 * Initializes the new provider creation form with default values.
 */
export function startCreateNewProvider(
  setIsCreatingNewProvider: (creating: boolean) => void,
  setSelectedProviderId: (id: string | null) => void,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setNewProviderForm: (form: Partial<ProviderRow>) => void
) {
  setIsCreatingNewProvider(true)
  setSelectedProviderId(null) // Clear any selected provider
  setMessage(null)
  setError(null)
  // Reset form to default values
  setNewProviderForm({
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
}

/**
 * CANCEL CREATE PROVIDER
 * 
 * Cancels the new provider creation and resets the form.
 */
export function cancelCreateProvider(
  setIsCreatingNewProvider: (creating: boolean) => void,
  setSelectedProviderId: (id: string | null) => void,
  setMessage: (msg: string | null) => void,
  setError: (err: string | null) => void,
  setNewProviderForm: (form: Partial<ProviderRow>) => void
) {
  setIsCreatingNewProvider(false)
  setSelectedProviderId(null)
  setMessage(null)
  setError(null)
  // Reset form to default values
  setNewProviderForm({
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
}

/**
 * NORMALIZE EMAIL
 * 
 * Normalizes email addresses for consistent comparison by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Handling null/undefined
 */
export function normalizeEmail(e?: string | null): string {
  return String(e || '').trim().toLowerCase()
}

/**
 * NORMALIZE ROLE
 * 
 * Normalizes role strings for consistent comparison by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Handling null/undefined
 */
export function normalizeRole(r?: string | null): string {
  return String(r || '').trim().toLowerCase()
}

/**
 * GET BUSINESS EMAILS
 * 
 * Returns a Set of normalized email addresses for all business owners.
 * Used to distinguish business accounts from customer accounts.
 */
export function getBusinessEmails(profiles: ProfileRow[]): Set<string> {
  return new Set(
    profiles
      .filter((p) => normalizeRole(p.role) === 'business')
      .map((p) => normalizeEmail(p.email))
      .filter(Boolean)
  )
}

/**
 * GET CUSTOMER USERS
 * 
 * Returns a sorted array of customer user emails.
 * Collects emails from:
 * - Funnel responses
 * - Bookings
 * - Booking events
 * - Profiles (non-business users)
 * 
 * Excludes business owner emails.
 */
export function getCustomerUsers(
  funnels: FunnelRow[],
  bookings: BookingRow[],
  bookingEvents: BookingEvent[],
  profiles: ProfileRow[],
  businessEmails: Set<string>
): string[] {
  const set = new Set<string>()
  
  // Add users from funnel responses
  funnels.forEach((f) => { 
    const e = normalizeEmail(f.user_email)
    if (e) set.add(e)
  })
  
  // Add users from bookings
  bookings.forEach((b) => { 
    const e = normalizeEmail(b.user_email)
    if (e) set.add(e)
  })
  
  // Add users from booking events
  bookingEvents.forEach((be) => { 
    const e = normalizeEmail(be.customer_email)
    if (e) set.add(e)
  })
  
  // Add users from profiles (non-business users)
  profiles.forEach((p) => { 
    const e = normalizeEmail(p.email)
    if (e && p.role !== 'business') set.add(e)
  })
  
  // Filter out business emails and sort
  return Array.from(set)
    .filter((e) => !businessEmails.has(normalizeEmail(e)))
    .sort()
}
