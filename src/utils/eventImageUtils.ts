/**
 * Event Image Utilities
 * 
 * Provides header images for calendar events using:
 * 1. Unsplash API for dynamic, high-quality photos
 * 2. Category-based gradient fallbacks for offline/error cases
 */

import type { CalendarEvent } from '../types'

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || 'demo_key'
const UNSPLASH_API_URL = 'https://api.unsplash.com'

// localStorage key for image cache
const STORAGE_KEY = 'bf-event-images-cache'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

// Type for cached image data
interface CachedImage {
  url: string
  timestamp: number
  keyword: string
}

// In-memory cache (for current session performance)
const memoryCache = new Map<string, string>()

/**
 * Load image cache from localStorage
 */
function loadCacheFromStorage(): Map<string, CachedImage> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return new Map(Object.entries(data))
    }
  } catch (error) {
    console.warn('[ImageCache] Error loading from localStorage:', error)
  }
  return new Map()
}

/**
 * Save image cache to localStorage
 */
function saveCacheToStorage(cache: Map<string, CachedImage>): void {
  try {
    const data = Object.fromEntries(cache)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('[ImageCache] Error saving to localStorage:', error)
  }
}

/**
 * Get cached image URL if available and not expired
 */
function getCachedImage(keyword: string): string | null {
  // Check memory cache first (fastest)
  if (memoryCache.has(keyword)) {
    return memoryCache.get(keyword)!
  }
  
  // Check localStorage
  const cache = loadCacheFromStorage()
  const cached = cache.get(keyword)
  
  if (cached) {
    const age = Date.now() - cached.timestamp
    
    // If not expired, use it
    if (age < CACHE_DURATION) {
      // Add to memory cache for faster subsequent access
      memoryCache.set(keyword, cached.url)
      return cached.url
    } else {
      // Expired, remove it
      cache.delete(keyword)
      saveCacheToStorage(cache)
    }
  }
  
  return null
}

/**
 * Save image URL to cache
 */
function cacheImage(keyword: string, url: string): void {
  // Save to memory cache
  memoryCache.set(keyword, url)
  
  // Save to localStorage
  const cache = loadCacheFromStorage()
  cache.set(keyword, {
    url,
    timestamp: Date.now(),
    keyword
  })
  saveCacheToStorage(cache)
}

/**
 * Category-based gradient fallbacks
 * Beautiful gradients that match event types
 */
export const CATEGORY_GRADIENTS: Record<string, string> = {
  // Kids & Family
  kids: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  children: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  family: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  
  // Art & Creativity
  art: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  ceramics: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
  pottery: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
  drawing: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  painting: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  
  // Textiles & Crafts
  textiles: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  sewing: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  fabric: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  
  // Music & Performance
  music: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  concert: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  band: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  orchestra: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  
  // Theater & Acting
  theater: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  theatre: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  acting: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  performance: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  
  // Education & Learning
  workshop: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  class: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  training: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  seminar: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  
  // Books & Reading
  book: 'linear-gradient(135deg, #c2e9fb 0%, #a1c4fd 100%)',
  reading: 'linear-gradient(135deg, #c2e9fb 0%, #a1c4fd 100%)',
  story: 'linear-gradient(135deg, #c2e9fb 0%, #a1c4fd 100%)',
  library: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  
  // Support & Community
  support: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  help: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  community: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  
  // Seasonal & Special
  halloween: 'linear-gradient(135deg, #fd746c 0%, #ff9068 100%)',
  holiday: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  
  // Default fallback
  default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

/**
 * Extract keywords from event for image search
 * Exported for use in populate script
 */
export function extractSearchKeywords(event: CalendarEvent): string {
  const title = event.title.toLowerCase()
  const description = (event.description || '').toLowerCase()
  const category = event.category.toLowerCase()
  const combined = `${title} ${description} ${category}`
  
  // Priority keywords for better image results
  const keywords = [
    'workshop', 'art', 'music', 'kids', 'ceramics', 'drawing',
    'theater', 'book', 'community', 'festival', 'market',
    'dance', 'yoga', 'fitness', 'food', 'cooking', 'garden'
  ]
  
  // Find the first matching keyword
  for (const keyword of keywords) {
    if (combined.includes(keyword)) {
      return keyword
    }
  }
  
  // Fallback to category or first word of title
  if (category && category !== 'community') {
    return category
  }
  
  return event.title.split(' ')[0] || 'community'
}

/**
 * Get gradient fallback based on event keywords
 */
export function getEventGradient(event: CalendarEvent): string {
  const text = `${event.title} ${event.description || ''} ${event.category}`.toLowerCase()
  
  // Check each gradient category
  for (const [keyword, gradient] of Object.entries(CATEGORY_GRADIENTS)) {
    if (text.includes(keyword)) {
      return gradient
    }
  }
  
  return CATEGORY_GRADIENTS.default
}

/**
 * Fetch image from Unsplash API
 * Returns image URL or null if failed
 * Checks cache first to avoid unnecessary API calls
 */
async function fetchUnsplashImage(searchQuery: string): Promise<string | null> {
  // Check cache first (localStorage + memory)
  const cachedUrl = getCachedImage(searchQuery)
  if (cachedUrl) {
    // Only log in development mode to reduce console spam
    if (import.meta.env.DEV) {
      console.log(`[Unsplash] Using cached image for "${searchQuery}"`)
    }
    return cachedUrl
  }
  
  // Skip if no API key (will use gradient fallback)
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'demo_key') {
    console.warn('[Unsplash] ❌ NO API KEY - Add VITE_UNSPLASH_ACCESS_KEY to environment variables')
    console.warn('[Unsplash] Get free key at: https://unsplash.com/developers')
    return null
  }
  
  try {
    // Only log in development mode to reduce console spam
    if (import.meta.env.DEV) {
      console.log(`[Unsplash] Fetching new image for "${searchQuery}"`)
    }
    
    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?` +
      `query=${encodeURIComponent(searchQuery)}` +
      `&orientation=landscape` +
      `&per_page=1` +
      `&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    )
    
    if (!response.ok) {
      console.warn(`[Unsplash] API request failed: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular
      
      // Save to cache (localStorage + memory)
      cacheImage(searchQuery, imageUrl)
      
      // Only log in development mode to reduce console spam
      if (import.meta.env.DEV) {
        console.log(`[Unsplash] Cached new image for "${searchQuery}"`)
      }
      return imageUrl
    }
    
    return null
  } catch (error) {
    console.warn('[Unsplash] Error fetching image:', error)
    return null
  }
}

/**
 * Get event header image
 * Tries Unsplash first, falls back to gradient
 */
export async function getEventHeaderImage(event: CalendarEvent): Promise<{
  type: 'image' | 'gradient'
  value: string
}> {
  // Extract search keywords
  const keywords = extractSearchKeywords(event)
  
  // Try Unsplash
  const imageUrl = await fetchUnsplashImage(keywords)
  
  if (imageUrl) {
    return {
      type: 'image',
      value: imageUrl
    }
  }
  
  // Fallback to gradient
  return {
    type: 'gradient',
    value: getEventGradient(event)
  }
}

/**
 * Preload images for multiple events (batch processing)
 * FRONTEND-ONLY: gradients fallback only. NO external API calls here.
 * Images must be pre-populated in DB via scripts/populate-event-images.*
 */
export async function preloadEventImages(events: CalendarEvent[]): Promise<Map<string, {
  type: 'image' | 'gradient'
  value: string
}>> {
  const imageMap = new Map<string, { type: 'image' | 'gradient', value: string }>()

  // Synchronous, no network calls: gradients only for events lacking DB images
  events.forEach((event) => {
    imageMap.set(event.id, {
      type: 'gradient',
      value: getEventGradient(event)
    })
  })

  return imageMap
}

/**
 * Clear image cache (useful for testing or refresh)
 * Clears both memory and localStorage
 */
export function clearImageCache(): void {
  memoryCache.clear()
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[ImageCache] Cache cleared')
  } catch (error) {
    console.warn('[ImageCache] Error clearing cache:', error)
  }
}

/**
 * Clear only expired images from cache
 */
export function clearExpiredImages(): void {
  const cache = loadCacheFromStorage()
  const now = Date.now()
  let removed = 0
  
  cache.forEach((value, key) => {
    const age = now - value.timestamp
    if (age >= CACHE_DURATION) {
      cache.delete(key)
      removed++
    }
  })
  
  if (removed > 0) {
    saveCacheToStorage(cache)
    console.log(`[ImageCache] Cleared ${removed} expired image(s)`)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalImages: number
  oldestImage: Date | null
  cacheSize: string
} {
  const cache = loadCacheFromStorage()
  let oldestTimestamp = Date.now()
  
  cache.forEach(value => {
    if (value.timestamp < oldestTimestamp) {
      oldestTimestamp = value.timestamp
    }
  })
  
  // Estimate cache size
  const cacheString = localStorage.getItem(STORAGE_KEY) || ''
  const sizeKB = (cacheString.length * 2 / 1024).toFixed(2) // UTF-16 = 2 bytes per char
  
  return {
    totalImages: cache.size,
    oldestImage: cache.size > 0 ? new Date(oldestTimestamp) : null,
    cacheSize: `${sizeKB} KB`
  }
}

