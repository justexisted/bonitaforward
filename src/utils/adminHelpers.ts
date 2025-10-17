/**
 * ADMIN HELPER UTILITIES
 * 
 * Utility functions for admin panel operations
 */

import { STATUS_COLORS } from '../constants/adminConstants'

/**
 * Format date for admin display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatAdminDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return dateString
  }
}

/**
 * Get status badge color classes
 * @param status Status string
 * @returns Tailwind CSS classes for badge
 */
export function getStatusColor(status: string): string {
  const normalizedStatus = status?.toLowerCase() || 'pending'
  return STATUS_COLORS[normalizedStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
}

/**
 * Parse JSON application details
 * @param challenge JSON string from application
 * @returns Parsed object or null
 */
export function parseApplicationDetails(challenge: string | null): Record<string, any> | null {
  if (!challenge) return null
  try {
    return JSON.parse(challenge)
  } catch {
    return null
  }
}

/**
 * Validate provider data before save
 * @param provider Provider data object
 * @returns Validation result with errors
 */
export function validateProviderData(provider: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!provider.name || provider.name.trim().length === 0) {
    errors.push('Provider name is required')
  }
  
  if (!provider.category_key) {
    errors.push('Category is required')
  }
  
  if (provider.email && !isValidEmail(provider.email)) {
    errors.push('Invalid email format')
  }
  
  if (provider.website && !isValidUrl(provider.website)) {
    errors.push('Invalid website URL')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate email format
 * @param email Email string
 * @returns True if valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 * @param url URL string
 * @returns True if valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

/**
 * Truncate text to specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Format phone number for display
 * @param phone Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'N/A'
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  // Format as (XXX) XXX-XXXX for 10-digit numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Get initials from name
 * @param name Full name
 * @returns Initials (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string | null): string {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Count days since date
 * @param dateString ISO date string
 * @returns Number of days since the date
 */
export function daysSince(dateString: string): number {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return 0
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param dateString ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const days = daysSince(dateString)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

/**
 * Sort array by date field
 * @param array Array to sort
 * @param dateField Field name containing date
 * @param ascending Sort order
 * @returns Sorted array
 */
export function sortByDate<T extends Record<string, any>>(
  array: T[],
  dateField: keyof T,
  ascending: boolean = false
): T[] {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateField] as string).getTime()
    const dateB = new Date(b[dateField] as string).getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

/**
 * Filter array by search term
 * @param array Array to filter
 * @param searchTerm Search term
 * @param searchFields Fields to search in
 * @returns Filtered array
 */
export function filterBySearch<T extends Record<string, any>>(
  array: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm || searchTerm.trim().length === 0) return array
  
  const term = searchTerm.toLowerCase().trim()
  
  return array.filter(item => {
    return searchFields.some(field => {
      const value = item[field]
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(term)
    })
  })
}

