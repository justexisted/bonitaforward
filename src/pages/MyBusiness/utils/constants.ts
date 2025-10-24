/**
 * Constants and configuration for MyBusiness page
 */

/**
 * Business category options
 */
export const BUSINESS_CATEGORIES = [
  { key: 'real-estate', name: 'Real Estate' },
  { key: 'home-services', name: 'Home Services' },
  { key: 'health-wellness', name: 'Health & Wellness' },
  { key: 'restaurants-cafes', name: 'Restaurants & Cafes' },
  { key: 'professional-services', name: 'Professional Services' },
  { key: 'automotive', name: 'Automotive' },
  { key: 'retail-shopping', name: 'Retail & Shopping' },
  { key: 'beauty-personal-care', name: 'Beauty & Personal Care' },
  { key: 'education-tutoring', name: 'Education & Tutoring' },
  { key: 'entertainment-events', name: 'Entertainment & Events' },
  { key: 'pet-services', name: 'Pet Services' },
  { key: 'travel-tourism', name: 'Travel & Tourism' },
] as const

/**
 * Restaurant tag options for filtering and categorization
 */
export const RESTAURANT_TAG_OPTIONS = {
  cuisine: [
    'American',
    'Italian',
    'Mexican',
    'Chinese',
    'Japanese',
    'Thai',
    'Indian',
    'Mediterranean',
    'French',
    'Korean',
    'Vietnamese',
    'Greek',
    'Spanish',
    'Middle Eastern',
    'Caribbean',
    'Latin American',
    'Fusion',
    'Seafood',
    'Steakhouse',
    'BBQ',
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Other'
  ],
  occasion: [
    'Casual',
    'Family',
    'Date Night',
    'Business',
    'Special Occasion',
    'Quick Bite',
    'Late Night',
    'Brunch',
    'Happy Hour',
    'Group Dining'
  ],
  priceRange: ['$', '$$', '$$$', '$$$$'],
  diningType: [
    'Dine-in',
    'Takeout',
    'Delivery',
    'Drive-through',
    'Curbside Pickup',
    'Outdoor Seating',
    'Bar',
    'Buffet',
    'Food Truck'
  ]
} as const

/**
 * Featured account pricing
 */
export const FEATURED_ACCOUNT_PRICE = {
  annual: 97,
  currency: 'USD',
  display: '$97/year'
} as const

/**
 * Upload limits
 */
export const UPLOAD_LIMITS = {
  freeAccount: {
    maxImages: 1,
    maxFileSize: 5 * 1024 * 1024 // 5MB
  },
  featuredAccount: {
    maxImages: 20,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
} as const

/**
 * Accepted image file types
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic'
] as const

/**
 * Dashboard tab configuration
 */
export const DASHBOARD_TABS = [
  { key: 'listings', label: 'Business Listings', icon: 'building' },
  { key: 'applications', label: 'Applications', icon: 'document' },
  { key: 'jobs', label: 'Job Posts', icon: 'briefcase' },
  { key: 'change-requests', label: 'Change Requests', icon: 'clock' },
] as const

/**
 * Status badge colors
 */
export const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  live: 'bg-green-100 text-green-800',
  draft: 'bg-neutral-100 text-neutral-800',
  featured: 'bg-yellow-100 text-yellow-800',
  free: 'bg-green-100 text-green-800'
} as const

/**
 * Default business hours (closed all days)
 */
export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '', close: '', closed: true },
  tuesday: { open: '', close: '', closed: true },
  wednesday: { open: '', close: '', closed: true },
  thursday: { open: '', close: '', closed: true },
  friday: { open: '', close: '', closed: true },
  saturday: { open: '', close: '', closed: true },
  sunday: { open: '', close: '', closed: true }
} as const

/**
 * Common time options for business hours
 */
export const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM',
  '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
] as const

/**
 * Contact method toggles
 */
export const CONTACT_METHODS = [
  { key: 'phone_enabled', label: 'Phone', icon: 'phone' },
  { key: 'email_enabled', label: 'Email', icon: 'mail' },
  { key: 'website_enabled', label: 'Website', icon: 'globe' }
] as const

