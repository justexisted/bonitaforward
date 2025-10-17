/**
 * Image URL utilities
 * 
 * Handles normalization and proxying of image URLs from various sources:
 * - Google user content (proxied through Netlify function)
 * - Supabase storage paths
 * - External URLs
 * - Relative paths
 */

import { supabase } from '../lib/supabase'

/**
 * Fix and normalize image URLs
 * Handles full URLs, Supabase storage paths, relative paths, and Google user content
 * 
 * @param url - The image URL to normalize
 * @returns Normalized URL ready for display
 */
export function fixImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    console.log('[imageUtils] fixImageUrl: empty or invalid URL', url)
    return ''
  }
  
  // If it's a Google user content URL, proxy it through our Netlify function
  // to bypass CORS and hot-linking restrictions
  if (url.startsWith('https://lh3.googleusercontent.com/')) {
    const proxyUrl = `/.netlify/functions/image-proxy?url=${encodeURIComponent(url)}`
    console.log('[imageUtils] fixImageUrl: proxying Google image', url, '→', proxyUrl)
    return proxyUrl
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

