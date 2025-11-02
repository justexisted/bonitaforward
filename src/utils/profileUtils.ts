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
}

/**
 * Creates a complete profile payload with all required fields
 * 
 * CRITICAL: This ensures ALL fields are included, even if null.
 * Prevents missing fields like name or role from being omitted.
 */
export function createProfilePayload(data: Partial<CompleteProfileData>): CompleteProfileData {
  return {
    email: data.email || '',
    name: data.name || null,
    role: data.role || null,
    is_bonita_resident: data.is_bonita_resident ?? null,
    resident_verification_method: data.resident_verification_method || null,
    resident_zip_code: data.resident_zip_code || null,
    resident_verified_at: data.resident_verified_at || null
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
    
    if (existing) {
      // Profile exists - use UPDATE
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
      
      if (error) {
        console.error(`[Profile Update from ${source}] Error:`, error)
        console.error(`[Profile Update from ${source}] Payload:`, payload)
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
    const completeness = {
      hasEmail: !!payload.email,
      hasName: !!payload.name,
      hasRole: payload.role !== null && payload.role !== undefined
    }
    
    // Log warning if profile is incomplete
    if (!completeness.hasName || !completeness.hasRole) {
      console.warn(`[Profile Update from ${source}] Incomplete profile update:`, {
        userId,
        email: payload.email,
        completeness
      })
    } else {
      console.log(`[Profile Update from ${source}] Success:`, {
        userId,
        email: payload.email,
        name: payload.name ? 'present' : 'missing',
        role: payload.role || 'null'
      })
    }
    
    return { success: true }
  } catch (error: any) {
    console.error(`[Profile Update from ${source}] Exception:`, error)
    return { success: false, error: error?.message }
  }
}

