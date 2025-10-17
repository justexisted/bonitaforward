/**
 * Image URL utilities
 * 
 * Handles normalization of image URLs from various sources:
 * - Supabase storage paths
 * - External URLs (including Google user content)
 * - Relative paths
 */

import { supabase } from '../lib/supabase'

/**
 * Fix and normalize image URLs
 * Handles full URLs, Supabase storage paths, and relative paths
 * 
 * @param url - The image URL to normalize
 * @returns Normalized URL ready for display
 */
export function fixImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  // If it's already a full URL (including Google images), return as-is
  // Let the browser try to load it; onError handlers will catch failures
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // For relative paths or storage bucket paths, convert to public URL
  let path = url
  
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  
  // If path doesn't start with bucket name, prepend it
  if (!path.startsWith('business-images/')) {
    path = `business-images/${path}`
  }
  
  // Get public URL from Supabase
  const { data } = supabase.storage.from('business-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Get the first valid image URL from a provider's images array
 * 
 * @param images - Array of image URLs
 * @returns First valid image URL or empty string
 */
export function getFirstImage(images: string[] | null | undefined): string {
  if (!images || images.length === 0) {
    return ''
  }
  return fixImageUrl(images[0])
}

