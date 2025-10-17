/**
 * UTILITY HELPERS
 * 
 * Centralized utility functions used across the application.
 * This file contains common helper functions to avoid duplication
 * and maintain consistency across components.
 * 
 * Categories:
 * - Local Storage Utilities
 * - String/Slug Utilities
 * - Provider/Business Utilities
 * - Admin/Auth Utilities
 */

import type { CategoryKey, Provider } from '../types'

// Re-export types for backward compatibility
export type { CategoryKey, Provider }

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

/**
 * Safely get and parse JSON from localStorage with type safety
 * 
 * @param key - The localStorage key to retrieve
 * @param defaultValue - The default value to return if key doesn't exist or parsing fails
 * @returns The parsed JSON value or the default value
 * 
 * @example
 * const settings = getLocalStorageJSON<Settings>('user-settings', { theme: 'light' })
 */
export function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item) as T
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e)
    return defaultValue
  }
}

/**
 * Save current URL to localStorage for redirect after authentication
 * Used to remember where the user was before signing in
 * 
 * @example
 * // Before redirecting to sign-in page
 * saveReturnUrl()
 * navigate('/signin')
 */
export function saveReturnUrl(): void {
  try {
    const url = window.location.pathname + window.location.search + window.location.hash
    localStorage.setItem('bf-return-url', url)
  } catch (e) {
    console.warn('Failed to save return URL:', e)
  }
}

/**
 * Get the saved return URL from localStorage and remove it
 * Returns null if no URL was saved
 * 
 * @returns The saved return URL or null
 * 
 * @example
 * const returnUrl = getAndClearReturnUrl()
 * navigate(returnUrl || '/account')
 */
export function getAndClearReturnUrl(): string | null {
  try {
    const url = localStorage.getItem('bf-return-url')
    if (url) {
      localStorage.removeItem('bf-return-url')
      return url
    }
    return null
  } catch {
    return null
  }
}

// ============================================================================
// STRING/SLUG UTILITIES
// ============================================================================

/**
 * Generate a URL-friendly slug from a business name
 * 
 * Converts business names into clean, URL-safe slugs by:
 * - Converting to lowercase
 * - Removing special characters
 * - Replacing spaces with hyphens
 * - Removing multiple/leading/trailing hyphens
 * 
 * @param name - The business name to convert
 * @returns A URL-friendly slug
 * 
 * @example
 * generateSlug("Flora Cafe") // returns "flora-cafe"
 * generateSlug("Bob's Auto Shop & Repair") // returns "bobs-auto-shop-repair"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

// ============================================================================
// PROVIDER/BUSINESS UTILITIES
// ============================================================================

/**
 * Check if a provider is a featured business
 * 
 * Featured businesses are those with active memberships (isMember === true).
 * This provides a consistent way to identify featured providers across the app.
 * 
 * @param provider - The provider to check
 * @returns true if the provider is featured, false otherwise
 * 
 * @example
 * if (isFeaturedProvider(provider)) {
 *   // Show featured badge
 * }
 */
export function isFeaturedProvider(provider: Provider): boolean {
  return Boolean(provider.isMember)
}

/**
 * Ensure demo members exist in each category for development/demo purposes
 * 
 * This function ensures the first 3 providers in each category are marked
 * as members for demonstration purposes. Useful for local development.
 * 
 * @param input - Record of providers by category
 * @returns Updated record with demo members
 * 
 * @example
 * const providers = ensureDemoMembers(loadedProviders)
 */
export function ensureDemoMembers(input: Record<CategoryKey, Provider[]>): Record<CategoryKey, Provider[]> {
  const out: Record<CategoryKey, Provider[]> = {
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  };
  (Object.keys(input) as CategoryKey[]).forEach((k: CategoryKey) => {
    const key = k
    const arr = input[key] || []
    out[key] = arr.map((p: Provider, idx: number) => ({ ...p, isMember: Boolean(p.isMember) || idx < 3 }))
  })
  return out
}

/**
 * Get all providers from all categories combined into a single array
 * 
 * @param providersByCategory - Record of providers organized by category
 * @returns Flat array of all providers
 * 
 * @example
 * const allProviders = getAllProviders(providersByCategory)
 * console.log(`Total: ${allProviders.length} businesses`)
 */
export function getAllProviders(providersByCategory: Record<CategoryKey, Provider[]>): Provider[] {
  const categories: CategoryKey[] = ['real-estate', 'home-services', 'health-wellness', 'restaurants-cafes', 'professional-services']
  return categories.flatMap((cat) => providersByCategory[cat] || [])
}

// ============================================================================
// ADMIN/AUTH UTILITIES
// ============================================================================

/**
 * Get list of admin emails from environment variable
 * 
 * Reads VITE_ADMIN_EMAILS from environment and returns an array of email addresses.
 * Falls back to a default admin email if none are configured.
 * 
 * @returns Array of admin email addresses (lowercase, trimmed)
 * 
 * @example
 * const admins = getAdminList()
 * if (admins.includes(user.email)) {
 *   // Show admin features
 * }
 */
export function getAdminList(): string[] {
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
}

/**
 * Check if a user email is in the admin list
 * 
 * @param email - The email address to check
 * @returns true if the email is an admin, false otherwise
 * 
 * @example
 * if (isUserAdmin(user.email)) {
 *   navigate('/admin')
 * }
 */
export function isUserAdmin(email: string | undefined): boolean {
  if (!email) return false
  const adminList = getAdminList()
  return adminList.includes(email.toLowerCase())
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 * 
 * @param email - The email address to validate
 * @returns true if email format is valid, false otherwise
 * 
 * @example
 * if (!isValidEmail(userInput)) {
 *   showError('Please enter a valid email')
 * }
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (US format)
 * Accepts various formats: (123) 456-7890, 123-456-7890, 1234567890
 * 
 * @param phone - The phone number to validate
 * @returns true if phone format is valid, false otherwise
 * 
 * @example
 * if (!isValidPhone(phoneInput)) {
 *   showError('Please enter a valid phone number')
 * }
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)]+$/
  const digitCount = phone.replace(/\D/g, '').length
  return phoneRegex.test(phone) && digitCount >= 10 && digitCount <= 11
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format a date string to a human-readable format
 * 
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2024-01-15') // returns "January 15, 2024"
 * formatDate(new Date(), { dateStyle: 'short' }) // returns "1/15/24"
 */
export function formatDate(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date)
  } catch {
    return 'Invalid date'
  }
}

/**
 * Check if a date is in the past
 * 
 * @param dateString - ISO date string or Date object
 * @returns true if date is in the past, false otherwise
 * 
 * @example
 * if (isDatePast(coupon.expires_at)) {
 *   // Show expired message
 * }
 */
export function isDatePast(dateString: string | Date): boolean {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return date < new Date()
  } catch {
    return false
  }
}

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Ensure a URL has a protocol (http:// or https://)
 * 
 * @param url - The URL to normalize
 * @returns URL with protocol
 * 
 * @example
 * ensureProtocol('example.com') // returns "https://example.com"
 * ensureProtocol('http://example.com') // returns "http://example.com"
 */
export function ensureProtocol(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

/**
 * Extract domain from URL
 * 
 * @param url - The URL to extract domain from
 * @returns Domain name without protocol
 * 
 * @example
 * extractDomain('https://www.example.com/page') // returns "example.com"
 */
export function extractDomain(url: string): string {
  try {
    const urlWithProtocol = ensureProtocol(url)
    const domain = new URL(urlWithProtocol).hostname
    return domain.replace(/^www\./, '')
  } catch {
    return url
  }
}

