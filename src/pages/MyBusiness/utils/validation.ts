import type { BusinessListing } from '../types'

/**
 * Validation utilities for business data
 */

/**
 * Validates business listing data before submission
 * 
 * @param data - Partial business listing data to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateBusinessListing(data: Partial<BusinessListing>): string[] {
  const errors: string[] = []

  // Required fields
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Business name must be at least 2 characters')
  }

  if (!data.category_key) {
    errors.push('Category is required')
  }

  // Email validation
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format')
  }

  // Phone validation (if provided)
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format')
  }

  // Website URL validation (if provided)
  if (data.website && !isValidUrl(data.website)) {
    errors.push('Invalid website URL')
  }

  // Description length
  if (data.description && data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters')
  }

  return errors
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone number format (allows various formats)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Check if it's between 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validates Google Calendar URL
 */
export function isValidGoogleCalendarUrl(url: string): boolean {
  if (!isValidUrl(url)) return false
  
  const urlObj = new URL(url)
  return urlObj.hostname === 'calendar.google.com' || 
         urlObj.hostname === 'www.google.com'
}

/**
 * Validates Google Maps URL
 */
export function isValidGoogleMapsUrl(url: string): boolean {
  if (!isValidUrl(url)) return false
  
  const urlObj = new URL(url)
  return urlObj.hostname.includes('google.com') && 
         (urlObj.pathname.includes('/maps') || urlObj.hostname.includes('maps.google'))
}

/**
 * Validates job post data
 */
export function validateJobPost(data: {
  provider_id?: string
  title?: string
  description?: string
  apply_url?: string
  salary_range?: string
}): string[] {
  const errors: string[] = []

  if (!data.provider_id) {
    errors.push('Please select a business listing')
  }

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Job title must be at least 3 characters')
  }

  if (data.apply_url && !isValidUrl(data.apply_url)) {
    errors.push('Invalid application URL')
  }

  if (data.description && data.description.length > 1000) {
    errors.push('Job description must be less than 1000 characters')
  }

  return errors
}

