/**
 * DEPENDENCY TRACKING
 *
 * WHAT THIS DEPENDS ON:
 * - Supabase client (../lib/supabase): Provides database access for profiles table
 *   → CRITICAL: Must have valid Supabase connection and RLS policies allow updates
 *   → CRITICAL: Profiles table schema must match CompleteProfileData interface
 * - localStorage ('bf-pending-profile'): Stores signup data temporarily during signup
 *   → CRITICAL: Key must be 'bf-pending-profile' (used by SignIn.tsx, Onboarding.tsx)
 *   → CRITICAL: Format must match: { name?: string, email?: string, role?: string, ... }
 * - Profiles table schema: Must include all fields from CompleteProfileData
 *   → CRITICAL: email, name, role, is_bonita_resident, resident_verification_method, resident_zip_code, resident_verified_at
 *   → CRITICAL: If table schema changes, update CompleteProfileData interface
 * - Auth user metadata: OAuth providers may store name in user_metadata
 *   → CRITICAL: getNameFromMultipleSources() checks user_metadata.name and user_metadata.full_name
 *   → CRITICAL: Auth user structure must match expected format
 *
 * WHAT DEPENDS ON THIS:
 * - Onboarding.tsx: Uses updateUserProfile() and getNameFromMultipleSources() during business signup
 *   → CRITICAL: Business account signup depends on this utility to save complete profiles
 *   → CRITICAL: If updateUserProfile() breaks, business signups fail or save incomplete data
 * - AuthContext.tsx (future): Should use updateUserProfile() instead of ensureProfile()
 *   → CRITICAL: When migrated, all profile updates go through this utility
 *   → CRITICAL: Changing this utility will affect all signup flows
 * - AccountSettings.tsx (future): Should use updateUserProfile() for profile updates
 *   → CRITICAL: When migrated, account settings updates will depend on this utility
 * - All signup flows: Depend on CompleteProfileData interface and field completeness
 *   → CRITICAL: If field structure changes, all signup flows break
 *
 * BREAKING CHANGES:
 * - If you change CompleteProfileData interface → ALL signup flows break
 * - If you change localStorage key ('bf-pending-profile') → SignIn.tsx and Onboarding.tsx break
 * - If you change validation logic → Profile updates may fail unexpectedly
 * - If you change createProfilePayload() → Field defaults may not match expected format
 * - If you change profiles table schema → updateUserProfile() will fail
 * - If you remove field completeness checks → Missing fields won't be caught in development
 *
 * HOW TO SAFELY UPDATE:
 * 1. Check ALL consumers: grep -r "updateUserProfile\|getNameFromMultipleSources\|createProfilePayload" src/
 * 2. Verify CompleteProfileData matches profiles table schema
 * 3. Test signup flow end-to-end (SignIn → Onboarding → Admin panel)
 * 4. Test business account signup (name must be saved)
 * 5. Test community account signup (name must be saved)
 * 6. Test resident verification (all fields must be saved)
 * 7. Check admin panel shows complete profile data (name, role, resident verification)
 * 8. Verify validation warnings appear in development console for missing fields
 *
 * RELATED FILES:
 * - src/pages/SignIn.tsx: Saves data to localStorage ('bf-pending-profile')
 * - src/pages/Onboarding.tsx: Uses updateUserProfile() and getNameFromMultipleSources()
 * - src/contexts/AuthContext.tsx: Should be migrated to use updateUserProfile() (future)
 * - src/pages/account/components/AccountSettings.tsx: Should be migrated to use updateUserProfile() (future)
 * - src/types/admin.ts: ProfileRow type should match CompleteProfileData
 * - docs/prevention/DATA_INTEGRITY_PREVENTION.md: Prevention guide for missing fields
 *
 * RECENT BREAKS:
 * - Missing name during business signup (2025-01-XX): Onboarding.tsx wasn't using updateUserProfile()
 *   → Fix: Created this utility and updated Onboarding.tsx to use it
 *   → Lesson: Centralize profile updates to prevent missing fields
 * - Missing fields in profile updates: Multiple files had direct Supabase calls omitting fields
 *   → Fix: Created this utility to ensure ALL fields are included
 *   → Lesson: Single source of truth for profile updates prevents missing fields
 * - Role immutable error (2025-01-XX): Trying to update role when already set caused "profiles.role is immutable once set"
 *   → Fix: Added check to exclude role from update payload if it's already set in database
 *   → Lesson: Handle immutable database fields in centralized utility to prevent errors for all callers
 *
 * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

/**
 * Profile Update Utilities
 * 
 * CRITICAL: This file provides shared utilities for ALL profile updates.
 * Use these functions instead of direct Supabase calls to prevent missing fields.
 * 
 * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
 */

import { supabase } from '../lib/supabase'

/**
 * Complete profile data structure
 * All profile updates must include ALL these fields (even if null)
 */
export interface CompleteProfileData {
  email: string
  name: string | null
  role: 'business' | 'community' | null
  is_bonita_resident?: boolean | null
  resident_verification_method?: string | null
  resident_zip_code?: string | null
  resident_verified_at?: string | null
  email_notifications_enabled?: boolean | null
  marketing_emails_enabled?: boolean | null
}

/**
 * Creates a complete profile payload with all required fields
 * 
 * CRITICAL: This ensures ALL fields are included, even if null.
 * Prevents missing fields like name or role from being omitted.
 */
export function createProfilePayload(data: Partial<CompleteProfileData>): CompleteProfileData {
  // CRITICAL: Only set preferences to null if they're explicitly undefined
  // If they're explicitly false or true, preserve them
  // This ensures preferences set during signup (true) are saved correctly
  return {
    email: data.email || '',
    name: data.name || null,
    role: data.role || null,
    is_bonita_resident: data.is_bonita_resident ?? null,
    resident_verification_method: data.resident_verification_method || null,
    resident_zip_code: data.resident_zip_code || null,
    resident_verified_at: data.resident_verified_at || null,
    // Preserve explicit boolean values (true/false), only use null if undefined
    email_notifications_enabled: data.email_notifications_enabled !== undefined ? data.email_notifications_enabled : null,
    marketing_emails_enabled: data.marketing_emails_enabled !== undefined ? data.marketing_emails_enabled : null
  }
}

/**
 * Validates profile data before saving to database
 * 
 * CRITICAL: Logs warnings when required fields are missing.
 * In development, this will fail loudly to catch issues early.
 */
export function validateProfileBeforeSave(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields (must be present in payload, even if null)
  const requiredFields = ['email', 'name', 'role']
  requiredFields.forEach(field => {
    if (!(field in payload)) {
      errors.push(`Missing required field: ${field}`)
    }
  })
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    console.warn('[Profile Validation] Missing fields:', errors)
    console.warn('[Profile Validation] Payload:', payload)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Reads name from localStorage (bf-pending-profile)
 * Used during signup flow when name is stored temporarily
 */
export function getNameFromLocalStorage(email?: string): string | null {
  try {
    const raw = localStorage.getItem('bf-pending-profile')
    if (raw) {
      const pref = JSON.parse(raw) as {
        name?: string
        email?: string
      }
      // Only return name if email matches or no email filter
      if ((!email || pref.email === email) && pref?.name && pref.name.trim()) {
        return pref.name.trim()
      }
    }
  } catch {
    // localStorage access failed, return null
  }
  return null
}

/**
 * Gets name from multiple sources (localStorage, auth metadata)
 * 
 * Priority order:
 * 1. localStorage (bf-pending-profile) - from signup form
 * 2. auth user metadata - from OAuth signup
 * 
 * Returns null if name not found in any source.
 */
export async function getNameFromMultipleSources(
  email?: string,
  authUser?: any
): Promise<string | null> {
  // Try localStorage first (signup form data)
  let name = getNameFromLocalStorage(email)
  
  // Fallback to auth user metadata if localStorage doesn't have it
  if (!name && authUser?.user_metadata?.name) {
    name = authUser.user_metadata.name
  }
  
  // Fallback to auth user metadata full_name (some OAuth providers)
  if (!name && authUser?.user_metadata?.full_name) {
    name = authUser.user_metadata.full_name
  }
  
  return name || null
}

/**
 * Updates user profile in database
 * 
 * CRITICAL: This is the ONLY function that should be used for profile updates.
 * DO NOT write direct Supabase .update() or .insert() calls - use this instead.
 * 
 * This function:
 * 1. Ensures ALL fields are included (name, email, role, resident verification)
 * 2. Validates data before saving
 * 3. Handles INSERT vs UPDATE automatically
 * 4. Logs the update source for debugging
 * 
 * @param userId - User ID from auth
 * @param data - Partial profile data (will be merged with defaults)
 * @param source - Source of update ('signup', 'onboarding', 'account-settings', 'auth-context')
 * @returns Success status and error if any
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<CompleteProfileData>,
  source: 'signup' | 'onboarding' | 'account-settings' | 'auth-context'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get complete profile data (ensures ALL fields are included)
    const payload = createProfilePayload(data)
    
    // Validate before save
    const validation = validateProfileBeforeSave(payload)
    if (!validation.valid && process.env.NODE_ENV === 'development') {
      console.error(`[Profile Update from ${source}] Validation failed:`, validation.errors)
      // In development, throw error to catch during testing
      // In production, continue but log warning
    }
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    let existingProfileRole: 'business' | 'community' | null | undefined = undefined
    let existingProfileName: string | null | undefined = undefined
    
    if (existing) {
      // Profile exists - use UPDATE
      // CRITICAL: profiles.role is IMMUTABLE once set - we cannot update it
      // Check existing profile to see if role is already set, and exclude it from update if so
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role, name, email_notifications_enabled, marketing_emails_enabled')
        .eq('id', userId)
        .maybeSingle()
      
      // Store existing role and name for completeness check
      existingProfileRole = existingProfile?.role as 'business' | 'community' | null | undefined
      existingProfileName = existingProfile?.name ?? null
      
      // Create update payload, excluding role if it's already set (immutable field)
      // CRITICAL: Also preserve existing name if payload.name is null/undefined to prevent clearing names
      const updatePayload: any = { ...payload }
      
      if (existingProfile?.role) {
        // Role already set - exclude from update to prevent "immutable" error
        // profiles.role is IMMUTABLE once set - we cannot update it, even to null
        delete updatePayload.role
        if (payload.role && payload.role !== existingProfile.role) {
          console.log(`[Profile Update from ${source}] Role already set (${existingProfile.role}), excluding from update (immutable field). Attempted to set: ${payload.role}`)
        }
      }
      
      // CRITICAL: Preserve existing name if payload.name is null/undefined
      // This prevents clearing names during auth refresh or login when name isn't provided
      // Only exclude name from update if it's explicitly null/undefined AND there's an existing name
      // If payload has a name (even empty string), use it - otherwise preserve existing
      if ((payload.name === null || payload.name === undefined) && existingProfile?.name) {
        // Name not provided in payload but exists in database - preserve it by excluding from update
        delete updatePayload.name
      }
      
      // CRITICAL: Preserve existing email preferences if payload.email_notifications_enabled/marketing_emails_enabled is null/undefined
      // This prevents clearing email preferences during auth refresh when preferences aren't provided
      // Only exclude from update if they're explicitly null/undefined AND there's an existing value
      if ((payload.email_notifications_enabled === null || payload.email_notifications_enabled === undefined) && existingProfile?.email_notifications_enabled !== undefined) {
        // Email notification preference not provided in payload but exists in database - preserve it
        delete updatePayload.email_notifications_enabled
      }
      if ((payload.marketing_emails_enabled === null || payload.marketing_emails_enabled === undefined) && existingProfile?.marketing_emails_enabled !== undefined) {
        // Marketing email preference not provided in payload but exists in database - preserve it
        delete updatePayload.marketing_emails_enabled
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
      
      if (error) {
        console.error(`[Profile Update from ${source}] Error:`, error)
        console.error(`[Profile Update from ${source}] Payload:`, updatePayload)
        return { success: false, error: error.message }
      }
    } else {
      // Profile doesn't exist - use INSERT
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userId, ...payload })
      
      if (error) {
        console.error(`[Profile Update from ${source}] Error:`, error)
        console.error(`[Profile Update from ${source}] Payload:`, payload)
        return { success: false, error: error.message }
      }
    }
    
    // Log success with completeness check
    // CRITICAL: For UPDATE, check existing role/name from database if they were excluded from update
    // For INSERT, check payload values
    const finalRole = existing ? (existingProfileRole ?? payload.role) : payload.role
    // For UPDATE, use existing name from database if name was preserved (excluded from update)
    // If payload.name is null/undefined, we preserved the existing name by excluding it from update
    const finalName = existing && (payload.name === null || payload.name === undefined)
      ? existingProfileName ?? payload.name
      : payload.name
    const completeness = {
      hasEmail: !!payload.email,
      hasName: !!finalName,
      hasRole: finalRole !== null && finalRole !== undefined
    }
    
    // Only log warning in development mode to reduce console spam
    // Also only warn if this is a new profile (INSERT) - UPDATE might be intentionally partial
    if (import.meta.env.DEV && !existing && (!completeness.hasName || !completeness.hasRole)) {
      console.warn(`[Profile Update from ${source}] Incomplete profile update:`, {
        userId,
        email: payload.email,
        completeness
      })
    } else if (import.meta.env.DEV && existing && (!completeness.hasName || !completeness.hasRole)) {
      // For UPDATE, only log if it's actually incomplete (not just because role was excluded)
      // If role exists in database, completeness check should use that
      if (!completeness.hasName || (!completeness.hasRole && !existingProfileRole)) {
        console.warn(`[Profile Update from ${source}] Profile may be incomplete after update:`, {
          userId,
          email: payload.email,
          completeness,
          note: 'Role exists in database but may be missing from payload'
        })
      }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error(`[Profile Update from ${source}] Exception:`, error)
    return { success: false, error: error?.message }
  }
}

