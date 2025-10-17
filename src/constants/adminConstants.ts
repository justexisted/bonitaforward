/**
 * ADMIN CONSTANTS
 * 
 * Centralized constants for the admin panel
 */

import type { AdminSection } from '../types/admin'

// Admin section definitions
export const ADMIN_SECTIONS: Record<AdminSection, { label: string; description: string }> = {
  'providers': {
    label: 'Providers',
    description: 'Manage business providers and listings'
  },
  'contact-leads': {
    label: 'Contact / Get Featured',
    description: 'Manage contact leads and featured requests'
  },
  'customer-users': {
    label: 'Customer Users',
    description: 'View customer user accounts'
  },
  'business-accounts': {
    label: 'Business Accounts',
    description: 'Manage business user accounts'
  },
  'business-owners': {
    label: 'Business Owners',
    description: 'View business owner accounts'
  },
  'users': {
    label: 'Users',
    description: 'Manage all user accounts'
  },
  'business-applications': {
    label: 'Business Applications',
    description: 'Review business listing applications'
  },
  'owner-change-requests': {
    label: 'Owner Change Requests',
    description: 'Review provider ownership change requests'
  },
  'job-posts': {
    label: 'Job Posts',
    description: 'Manage job postings'
  },
  'funnel-responses': {
    label: 'Funnel Responses',
    description: 'View user funnel responses'
  },
  'bookings': {
    label: 'Bookings',
    description: 'Manage booking requests'
  },
  'blog': {
    label: 'Blog Manager',
    description: 'Manage blog posts'
  },
  'calendar-events': {
    label: 'Calendar Events',
    description: 'Manage calendar events'
  },
  'flagged-events': {
    label: 'Flagged Events',
    description: 'Review flagged calendar events'
  }
}

// Provider filter options
export const PROVIDER_FILTERS = {
  ALL: 'all',
  FEATURED: 'featured',
  NON_FEATURED: 'non-featured'
} as const

export type ProviderFilter = typeof PROVIDER_FILTERS[keyof typeof PROVIDER_FILTERS]

// Status options
export const STATUS_OPTIONS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
} as const

// Application status options
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

// Change request types
export const CHANGE_REQUEST_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
} as const

// Pagination
export const ITEMS_PER_PAGE = {
  DEFAULT: 20,
  EVENTS: 50,
  PROVIDERS: 50
} as const

// Status colors for badges
export const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800'
} as const

