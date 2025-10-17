/**
 * Image URL utilities
 * 
 * Handles normalization of image URLs from various sources:
 * - Supabase storage paths
 * - External URLs
 * - Relative paths
 * 
 * Note: Google user content images (lh3.googleusercontent.com) cannot be
 * reliably displayed due to hot-linking restrictions. These will return
 * empty string and should be handled with fallback UI.
 */

import { supabase } from '../lib/supabase'

// Track which Google image URLs we've already warned about to reduce console noise
const warnedUrls = new Set<string>()

/**
 * Fix and normalize image URLs
 * Handles full URLs, Supabase storage paths, and relative paths
 * 
 * @param url - The image URL to normalize
 * @returns Normalized URL ready for display, or empty string for unsupported URLs
 */
export function fixImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  // Google user content images cannot be reliably hot-linked
  // Return empty to trigger fallback UI
  if (url.startsWith('https://lh3.googleusercontent.com/')) {
    // Only warn once per unique URL to reduce console noise
    if (!warnedUrls.has(url)) {
      warnedUrls.add(url)
      if (warnedUrls.size === 1) {
        // Show helpful message on first Google image encountered
        console.info(
          '%c🖼️ Google Images Notice',
          'background: #4285f4; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold',
          '\nGoogle blocks hot-linking of their images. Showing placeholders instead.',
          '\n💡 Run "npm run migrate:images" to permanently fix this by uploading images to Supabase.'
        )
      }
    }
    return ''
  }
  
  // If it's already a full URL (non-Google), return as-is
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

