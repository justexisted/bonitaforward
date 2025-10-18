/**
 * PROVIDER SERVICE
 * 
 * Service layer for loading and managing provider data.
 * This module encapsulates all provider data loading logic,
 * including Supabase database queries and Google Sheets fallback.
 * 
 * Features:
 * - Load providers from Supabase database
 * - Fallback to Google Sheets if Supabase fails
 * - Provider data normalization and transformation
 * - Featured/Member status handling
 * - Event dispatching for data updates
 * 
 * Usage:
 * ```typescript
 * import { loadProviders } from './services/providerService'
 * 
 * const success = await loadProviders(setProvidersByCategory)
 * ```
 */

import type { CategoryKey, Provider } from '../types'
import { fetchProvidersFromSupabase } from '../lib/supabaseData'
import { fetchSheetRows, mapRowsToProviders, type SheetProvider } from '../lib/sheets'
import { generateSlug, ensureDemoMembers, coerceBoolean } from '../utils/helpers'

// ============================================================================
// PROVIDER LOADING - SUPABASE
// ============================================================================

/**
 * Coerce provider featured/member status from database fields
 * Uses the shared coerceBoolean helper for consistency across the app
 * 
 * @param r Raw provider record from database
 * @returns True if provider is featured or a member
 */
function coerceIsMember(r: any): boolean {
  // Check both is_featured and is_member fields using shared helper
  const isFeatured = coerceBoolean(r.is_featured)
  const isMember = coerceBoolean(r.is_member)
  
  // Return true if EITHER field indicates featured status
  return isFeatured || isMember
}

/**
 * Load providers from Supabase database
 * 
 * This function fetches all providers from the Supabase database,
 * transforms them into the Provider type, groups them by category,
 * and dispatches an event to notify the app of the update.
 * 
 * @param setProvidersByCategory State setter function from App component
 * @returns Promise<boolean> True if successful, false if failed
 */
export async function loadProvidersFromSupabase(
  setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void
): Promise<boolean> {
  console.log('[Supabase] Starting to load providers from Supabase...')
  
  try {
    const rows = await fetchProvidersFromSupabase()
    console.log('[Supabase] fetchProvidersFromSupabase returned:', rows?.length || 0, 'providers')
    
    if (!rows || rows.length === 0) {
      console.warn('[Supabase] No providers found or failed to load')
      return false
    }
    
    console.log(`[Supabase] Loaded ${rows.length} providers from database`)
    
    // Initialize grouped providers by category
    const grouped: Record<CategoryKey, Provider[]> = {
      'real-estate': [],
      'home-services': [],
      'health-wellness': [],
      'restaurants-cafes': [],
      'professional-services': [],
    }
    
    // Transform and group providers
    rows.forEach((r) => {
      const key = r.category_key as CategoryKey
      if (!grouped[key]) return
      
      // Combine tags and badges to preserve featured/member flags
      const combinedTags = Array.from(new Set([
        ...((r.tags as string[] | null) || []),
        ...((r.badges as string[] | null) || []),
      ].flat().map((s) => String(s).trim()).filter(Boolean)))
      
      grouped[key].push({
        id: r.id,
        name: r.name,
        slug: generateSlug(r.name), // Generate URL-friendly slug from business name
        category_key: key,
        tags: combinedTags,
        rating: r.rating ?? undefined,
        phone: r.phone ?? null,
        email: r.email ?? null,
        website: r.website ?? null,
        address: r.address ?? null,
        isMember: coerceIsMember(r),
        // Enhanced business fields
        description: r.description ?? null,
        specialties: r.specialties ?? null,
        social_links: r.social_links ?? null,
        business_hours: r.business_hours ?? null,
        service_areas: r.service_areas ?? null,
        google_maps_url: r.google_maps_url ?? null,
        images: r.images ?? null,
        badges: r.badges ?? null,
        published: r.published ?? null,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
        // Featured provider tracking
        featured_since: r.featured_since ?? null,
        subscription_type: r.subscription_type ?? null,
        // Booking system fields
        booking_enabled: r.booking_enabled ?? null,
        booking_type: r.booking_type ?? null,
        booking_instructions: r.booking_instructions ?? null,
        booking_url: r.booking_url ?? null,
        // Contact method toggles
        enable_calendar_booking: r.enable_calendar_booking ?? null,
        enable_call_contact: r.enable_call_contact ?? null,
        enable_email_contact: r.enable_email_contact ?? null,
        // Coupon fields
        coupon_code: r.coupon_code ?? null,
        coupon_discount: r.coupon_discount ?? null,
        coupon_description: r.coupon_description ?? null,
        coupon_expires_at: r.coupon_expires_at ?? null,
        bonita_resident_discount: r.bonita_resident_discount ?? null,
      })
    })
    
    setProvidersByCategory(grouped)
    
    // Dispatch event to notify app of provider update
    try {
      window.dispatchEvent(new CustomEvent('bf-providers-updated'))
    } catch (error) {
      console.warn('[Supabase] Failed to dispatch providers-updated event', error)
    }
    
    return true
  } catch (error) {
    console.error('[Supabase] Error loading providers:', error)
    return false
  }
}

// ============================================================================
// PROVIDER LOADING - GOOGLE SHEETS FALLBACK
// ============================================================================

/**
 * Load providers from Google Sheets (fallback)
 * 
 * This function is used as a fallback when Supabase is unavailable.
 * It fetches provider data from Google Sheets, transforms it,
 * and ensures demo members are present for development.
 * 
 * @param setProvidersByCategory State setter function from App component
 * @returns Promise<void>
 */
export async function loadProvidersFromSheet(
  setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void
): Promise<void> {
  try {
    const rows = await fetchSheetRows()
    const mapped = mapRowsToProviders(rows)
    
    const grouped: Record<CategoryKey, Provider[]> = {
      'real-estate': [],
      'home-services': [],
      'health-wellness': [],
      'restaurants-cafes': [],
      'professional-services': [],
    }
    
    mapped.forEach((sp: SheetProvider) => {
      const cat = sp.category_key as CategoryKey
      if (grouped[cat]) {
        grouped[cat].push({
          id: sp.id,
          name: sp.name,
          slug: generateSlug(sp.name),
          category_key: cat,
          tags: sp.tags.length ? sp.tags : (sp.details.badges || []),
          rating: sp.rating,
        })
      }
    })
    
    setProvidersByCategory(ensureDemoMembers(grouped))
    
    // Dispatch event to notify app of provider update
    try {
      window.dispatchEvent(new CustomEvent('bf-providers-updated'))
    } catch (error) {
      console.warn('[Sheets] Failed to dispatch providers-updated event', error)
    }
  } catch (err) {
    console.warn('[Sheets] Failed to load providers from Google Sheets, using defaults', err)
  }
}

// ============================================================================
// COMBINED LOADER WITH FALLBACK
// ============================================================================

/**
 * Load providers with automatic fallback
 * 
 * Attempts to load from Supabase first, falls back to Google Sheets if that fails.
 * This is the recommended entry point for loading provider data.
 * 
 * @param setProvidersByCategory State setter function from App component
 * @returns Promise<boolean> True if Supabase succeeded, false if fell back to Sheets
 */
export async function loadProviders(
  setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void
): Promise<boolean> {
  console.log('[ProviderService] Starting provider data loading...')
  
  const supabaseSuccess = await loadProvidersFromSupabase(setProvidersByCategory)
  console.log('[ProviderService] Supabase loading result:', supabaseSuccess)
  
  if (!supabaseSuccess) {
    console.log('[ProviderService] Supabase failed, trying Google Sheets fallback...')
    await loadProvidersFromSheet(setProvidersByCategory)
    console.log('[ProviderService] Google Sheets fallback completed')
    return false
  }
  
  return true
}

// ============================================================================
// REFRESH FUNCTIONALITY
// ============================================================================

/**
 * Refresh provider data
 * 
 * Re-loads provider data from Supabase (or Sheets if Supabase fails).
 * Useful for updating data after admin changes or user actions.
 * 
 * @param setProvidersByCategory State setter function from App component
 * @returns Promise<void>
 */
export async function refreshProviders(
  setProvidersByCategory: (providers: Record<CategoryKey, Provider[]>) => void
): Promise<void> {
  console.log('[ProviderService] Refreshing provider data...')
  await loadProviders(setProvidersByCategory)
}

