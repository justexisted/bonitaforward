/**
 * Category Constants
 * 
 * Centralized category definitions used throughout the application.
 * Ensures consistency between admin panel, forms, and provider management.
 */

export interface CategoryOption {
  key: string
  name: string
}

/**
 * All available business categories
 * 
 * Used in:
 * - Admin panel for categorizing providers
 * - Business application forms
 * - Provider creation/editing
 * - Category filtering
 */
export const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'real-estate', name: 'Real Estate' },
  { key: 'home-services', name: 'Home Services' },
  { key: 'health-wellness', name: 'Health & Wellness' },
  { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
  { key: 'professional-services', name: 'Professional Services' },
]

/**
 * Get category name by key
 * @param key - Category key
 * @returns Category display name or the key if not found
 */
export function getCategoryName(key: string): string {
  const category = CATEGORY_OPTIONS.find(cat => cat.key === key)
  return category?.name || key
}

/**
 * Validate if a category key is valid
 * @param key - Category key to validate
 * @returns true if valid, false otherwise
 */
export function isValidCategory(key: string): boolean {
  return CATEGORY_OPTIONS.some(cat => cat.key === key)
}

