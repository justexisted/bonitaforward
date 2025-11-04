/**
 * Event Image Storage Utilities
 * 
 * Downloads images from Unsplash and stores them in Supabase Storage
 * Returns Supabase Storage URLs instead of Unsplash URLs
 * 
 * CRITICAL: Images are stored in YOUR Supabase Storage, not referenced from Unsplash
 */

import { supabase } from '../lib/supabase'

/**
 * Download image from URL and upload to Supabase Storage
 * @param imageUrl - URL of the image to download (e.g., from Unsplash)
 * @param eventId - Event ID for organizing storage
 * @returns Supabase Storage public URL or null if failed
 */
export async function downloadAndStoreImage(imageUrl: string, eventId: string): Promise<string | null> {
  try {
    console.log('[EventImageStorage] Downloading image from:', imageUrl.substring(0, 60) + '...')
    
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error('[EventImageStorage] Failed to download image:', response.status)
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
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `event-${eventId}-${timestamp}.${extension}`
    const path = `event-images/${filename}`
    
    console.log('[EventImageStorage] Uploading to Supabase Storage:', path)
    
    // Upload to Supabase Storage (use blob directly, not Buffer)
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, blob, {
        contentType: `image/${extension}`,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      })
    
    if (uploadError) {
      console.error('[EventImageStorage] Upload failed:', uploadError)
      // Check if bucket doesn't exist
      if (uploadError.message.includes('Bucket') || uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        console.error('[EventImageStorage] ❌ Storage bucket "event-images" does not exist. Create it in Supabase Dashboard → Storage → Create bucket "event-images" (public)')
        console.error('[EventImageStorage] Full error:', JSON.stringify(uploadError, null, 2))
      } else {
        console.error('[EventImageStorage] Upload error details:', JSON.stringify(uploadError, null, 2))
      }
      return null
    }
    
    // Get public URL from Supabase Storage
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(path)
    
    if (!urlData?.publicUrl) {
      console.error('[EventImageStorage] Failed to get public URL')
      return null
    }
    
    console.log('[EventImageStorage] ✅ Image stored in Supabase Storage:', urlData.publicUrl)
    return urlData.publicUrl
    
  } catch (error: any) {
    console.error('[EventImageStorage] Error:', error)
    return null
  }
}

