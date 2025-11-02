/**
 * Shared admin utilities for Netlify functions
 * Handles admin verification (email list + database flag)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface AdminCheckResult {
  isAdmin: boolean
  method?: 'email' | 'database' | 'fallback'
  userId?: string
  email?: string
}

/**
 * Check if user is admin via email list
 */
export function checkEmailAdmin(
  email: string | null | undefined,
  adminEmails?: string[]
): boolean {
  if (!email) return false
  
  const normalizedEmail = email.toLowerCase().trim()
  
  // Use provided admin emails list if available
  if (adminEmails && adminEmails.length > 0) {
    return adminEmails.includes(normalizedEmail)
  }
  
  // Fallback to default admin email
  return normalizedEmail === 'justexisted@gmail.com'
}

/**
 * Check if user is admin via database flag
 */
export async function checkDatabaseAdmin(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
    
    if (error || !profile) {
      return false
    }
    
    return Boolean(profile.is_admin)
  } catch {
    // Column might not exist yet, that's okay
    return false
  }
}

/**
 * Get admin emails from environment variables
 */
export function getAdminEmailsFromEnv(): string[] {
  const emails = process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || ''
  return emails
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Comprehensive admin check (email + database)
 */
export async function checkIsAdmin(
  userId: string,
  email: string | null | undefined,
  supabaseClient: SupabaseClient,
  adminEmails?: string[]
): Promise<AdminCheckResult> {
  // Use provided admin emails or get from env
  const emails = adminEmails || getAdminEmailsFromEnv()
  
  // Check email-based admin
  const isEmailAdmin = checkEmailAdmin(email, emails.length > 0 ? emails : undefined)
  
  // Check database-based admin
  const isDatabaseAdmin = await checkDatabaseAdmin(userId, supabaseClient)
  
  const isAdmin = isEmailAdmin || isDatabaseAdmin
  
  return {
    isAdmin,
    method: isDatabaseAdmin ? 'database' : isEmailAdmin ? 'email' : undefined,
    userId,
    email: email || undefined
  }
}

