/**
 * Admin Data Loader Hook
 * 
 * This hook manages all data loading for the admin panel.
 * It was extracted from Admin.tsx to improve code organization.
 * 
 * Responsibilities:
 * - Load funnel responses (with user filtering)
 * - Load bookings (with user filtering)
 * - Load business applications (pending only)
 * - Load contact leads
 * - Load providers (admin only)
 * - Load flagged events (admin only)
 * - Load user profiles (admin only)
 * - Load change requests via Netlify function
 * - Load job posts via Netlify function
 * - Load booking events via Netlify function
 * 
 * Features:
 * - Parallel data fetching with Promise.all
 * - Proper error handling and logging
 * - Cancellation support (cleanup)
 * - Conditional loading based on admin status
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  created_at: string
  tier_requested: string | null
  status: string | null
}

type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

type ProviderRow = {
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
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null
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
}

type FlaggedEvent = {
  id: string
  event_id: string
  user_id: string
  reason: string
  details: string | null
  created_at: string
  event?: any
  reporter_email?: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

interface UseAdminDataLoaderOptions {
  userEmail: string | null
  isAdmin: boolean
  selectedUser: string | null
  section: string
  loadChangeRequests: () => Promise<void>
  loadJobPosts: () => Promise<void>
  loadBookingEvents: () => Promise<void>
}

interface UseAdminDataLoaderReturn {
  funnels: FunnelRow[]
  bookings: BookingRow[]
  bizApps: BusinessApplicationRow[]
  contactLeads: ContactLeadRow[]
  providers: ProviderRow[]
  flaggedEvents: FlaggedEvent[]
  profiles: ProfileRow[]
  loading: boolean
  error: string | null
  setFunnels: (funnels: FunnelRow[]) => void
  setBookings: (bookings: BookingRow[]) => void
  setBizApps: (apps: BusinessApplicationRow[]) => void
  setContactLeads: (leads: ContactLeadRow[]) => void
  setProviders: (providers: ProviderRow[]) => void
  setFlaggedEvents: (events: FlaggedEvent[]) => void
  setProfiles: (profiles: ProfileRow[]) => void
  setError: (error: string | null) => void
}

/**
 * USE ADMIN DATA LOADER
 * 
 * Loads all data needed for the admin panel.
 * Handles conditional loading, user filtering, and error states.
 */
export function useAdminDataLoader(
  options: UseAdminDataLoaderOptions
): UseAdminDataLoaderReturn {
  const { userEmail, isAdmin, selectedUser, section, loadChangeRequests, loadJobPosts, loadBookingEvents } = options

  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [flaggedEvents, setFlaggedEvents] = useState<FlaggedEvent[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!userEmail) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build queries
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', userEmail)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', userEmail)

        // CRITICAL: Only load PENDING applications (not approved/rejected)
        // This prevents showing already-processed applications in the admin panel
        const bizQuery = supabase
          .from('business_applications')
          .select('*')
          .or('status.eq.pending,status.is.null')  // Include pending OR null (legacy apps)
          .order('created_at', { ascending: false })

        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })

        // Enhanced providers query with all featured tracking fields
        const provQuery = isAdmin ? supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url, enable_calendar_booking, enable_call_contact, enable_email_contact, coupon_code, coupon_discount, coupon_description, coupon_expires_at')
          .order('name', { ascending: true }) : null

        // Execute all queries in parallel
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }, provRes] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
          provQuery as any,
        ])

        if (cancelled) return

        // Handle errors
        if (fErr) { console.error('[Admin] funnels error', fErr); setError(fErr.message) }
        if (bErr) { console.error('[Admin] bookings error', bErr); setError((prev) => prev ?? bErr.message) }
        if (bizErr) { console.error('[Admin] business_applications error', bizErr); setError((prev) => prev ?? bizErr.message) }
        if (conErr) { console.error('[Admin] contact_leads error', conErr); setError((prev) => prev ?? conErr.message) }

        console.log('[Admin] business_applications', bizData)  // KEPT: Business application logging

        // Set data
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])

        if (provRes && 'data' in (provRes as any)) {
          const { data: pData, error: pErr } = (provRes as any)
          if (pErr) { console.error('[Admin] providers error', pErr); setError((prev) => prev ?? pErr.message) }
          setProviders((pData as ProviderRow[]) || [])
        }

        // Load flagged events (admin only)
        try {
          if (isAdmin) {
            const { data: flags, error: flagsError } = await supabase
              .from('event_flags')
              .select('*, calendar_events(*), profiles(email)')
              .order('created_at', { ascending: false })

            if (flagsError) {
              console.warn('[Admin] Could not load flagged events (table may not exist yet):', flagsError.message, flagsError.code)
              setFlaggedEvents([])
            } else {
              const transformedFlags = (flags || []).map((flag: any) => ({
                id: flag.id,
                event_id: flag.event_id,
                user_id: flag.user_id,
                reason: flag.reason,
                details: flag.details,
                created_at: flag.created_at,
                event: flag.calendar_events,
                reporter_email: flag.profiles?.email || 'Unknown'
              }))
              setFlaggedEvents(transformedFlags)
            }
          }
        } catch (err) {
          console.warn('[Admin] Exception loading flagged events:', err)
          setFlaggedEvents([])
        }

        // Load profiles (admin only)
        try {
          if (isAdmin) {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            if (token) {
              const url = '/.netlify/functions/admin-list-profiles'
              const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              if (res.ok) {
                const payload = await res.json() as { profiles?: ProfileRow[] }
                if (payload?.profiles) setProfiles(payload.profiles)
              }
            }
          }
        } catch { }

        // Load additional admin data via Netlify functions
        try {
          await loadChangeRequests()
        } catch { }
        try {
          await loadJobPosts()
        } catch { }
        try {
          await loadBookingEvents()
        } catch { }

      } catch (err: any) {
        console.error('[Admin] unexpected failure', err)
        if (!cancelled) setError(err?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userEmail, isAdmin, selectedUser, section, loadChangeRequests, loadJobPosts, loadBookingEvents])

  return {
    funnels,
    bookings,
    bizApps,
    contactLeads,
    providers,
    flaggedEvents,
    profiles,
    loading,
    error,
    setFunnels,
    setBookings,
    setBizApps,
    setContactLeads,
    setProviders,
    setFlaggedEvents,
    setProfiles,
    setError
  }
}

