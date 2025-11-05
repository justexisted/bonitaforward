import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Populate images for upcoming events that lack images (runs daily)
export const config = {
  schedule: '0 4 * * *', // 04:00 UTC daily
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const UNSPLASH_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY

/**
 * Download image from URL and upload to Supabase Storage
 * CRITICAL: Never save Unsplash URLs directly - always download and store in Supabase Storage
 */
async function downloadAndStoreImage(imageUrl: string, eventId: string, supabase: any): Promise<string | null> {
  try {
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`[populate-event-images] Failed to download image: ${response.status}`)
      return null
    }
    
    // Get image as blob
    const blob = await response.blob()
    
    // Determine file extension from Content-Type or URL
    let extension = 'jpg'
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('png')) extension = 'png'
    else if (contentType?.includes('webp')) extension = 'webp'
    else if (contentType?.includes('gif')) extension = 'gif'
    else if (imageUrl.includes('.png')) extension = 'png'
    else if (imageUrl.includes('.webp')) extension = 'webp'
    else if (imageUrl.includes('.gif')) extension = 'gif'
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `event-${eventId}-${timestamp}.${extension}`
    const path = `event-images/${filename}`
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, blob, {
        contentType: `image/${extension}`,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      })
    
    if (uploadError) {
      console.error(`[populate-event-images] Upload failed:`, uploadError)
      return null
    }
    
    // Get public URL from Supabase Storage
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(path)
    
    if (!urlData?.publicUrl) {
      console.error(`[populate-event-images] Failed to get public URL`)
      return null
    }
    
    return urlData.publicUrl
  } catch (error: any) {
    console.error(`[populate-event-images] Error downloading/storing image:`, error)
    return null
  }
}

const handler: Handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase env (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' })
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    // Fetch upcoming events that are missing images
    // CRITICAL: Only fetch events with null image_url (not gradient strings)
    // Events with gradient strings in image_url should be cleaned up separately
    const todayIso = new Date().toISOString().slice(0, 10)
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .or('image_url.is.null,image_type.is.null')
      .gte('date', todayIso)
      .order('date', { ascending: true })
      .limit(100)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    if (!events || events.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ updated: 0 }) }
    }

    // Lazy import to reuse existing keyword helpers
    const { extractSearchKeywords } = await import('../../src/utils/eventImageUtils')

    let updated = 0
    let skipped = 0
    
    for (const event of events as any[]) {
      // CRITICAL: Skip events that already have gradient strings in image_url
      // These should be cleaned up separately - we never want gradient strings in the database
      if (event.image_url && event.image_url.startsWith('linear-gradient')) {
        console.warn(`[populate-event-images] Skipping event "${event.title?.substring(0, 30)}" - has gradient string in image_url (should be cleaned up)`)
        skipped++
        continue
      }

      // Try to fetch and store an image
      let imageUrl: string | null = null
      let imageType: 'image' | null = null

      if (UNSPLASH_KEY) {
        try {
          // Fetch Unsplash image URL
          const keywords = extractSearchKeywords(event)
          const resp = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&orientation=landscape&per_page=1&content_filter=high`,
            { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
          )
          
          if (resp.ok) {
            const data = await resp.json()
            if (data.results && data.results.length > 0) {
              const unsplashUrl = data.results[0].urls.regular
              
              // CRITICAL: Download and store in Supabase Storage (never save Unsplash URLs)
              const storageUrl = await downloadAndStoreImage(unsplashUrl, event.id, supabase)
              
              if (storageUrl && storageUrl.includes('supabase.co/storage')) {
                imageUrl = storageUrl
                imageType = 'image'
                console.log(`[populate-event-images] ✅ Stored image for "${event.title?.substring(0, 30)}"`)
              } else {
                console.warn(`[populate-event-images] ⚠️ Failed to store image for "${event.title?.substring(0, 30)}" - keeping image_url as null`)
              }
            }
          }
        } catch (err: any) {
          console.error(`[populate-event-images] Error fetching Unsplash image:`, err)
        }
      }

      // CRITICAL: Never save gradient strings to image_url
      // If we couldn't fetch/store an image, set image_url to null
      // The frontend will compute gradients dynamically when image_url is null
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({ 
          image_url: imageUrl, // null if no image, Supabase Storage URL if successful
          image_type: imageType // null if no image, 'image' if successful
        })
        .eq('id', event.id)

      if (!updateError) {
        updated++
      } else {
        console.error(`[populate-event-images] Update error for event ${event.id}:`, updateError)
      }

      // Small delay to be gentle on Unsplash and Supabase
      await new Promise(r => setTimeout(r, 200))
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        updated, 
        skipped,
        message: `Updated ${updated} events, skipped ${skipped} events with gradient strings` 
      }) 
    }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || String(err) }) }
  }
}

export { handler }


