/**
 * ONE-TIME SCRIPT: Populate Event Images
 * 
 * Fetches images for all existing calendar events and saves them to the database.
 * Run this once after adding image_url column to calendar_events table.
 * 
 * Usage:
 *   npm run populate:event-images
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { CalendarEvent } from '../src/types'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Category gradient fallbacks (copied from eventImageUtils to avoid import.meta.env issues)
const CATEGORY_GRADIENTS: Record<string, string> = {
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

// Load environment variables from BOTH .env and .env.local
// .env first (base), then .env.local (overrides)
const envPath = resolve(process.cwd(), '.env')
const envLocalPath = resolve(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  config({ path: envPath })
}
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true })
}

if (!existsSync(envPath) && !existsSync(envLocalPath)) {
  console.error('❌ No .env or .env.local file found')
  process.exit(1)
}

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const UNSPLASH_ACCESS_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file')
  console.error('The SERVICE_ROLE_KEY is required to bypass RLS policies for bulk updates')
  process.exit(1)
}

if (!UNSPLASH_ACCESS_KEY) {
  console.log('⚠️  No Unsplash API key found - will use gradients only')
  console.log('To use Unsplash images, add VITE_UNSPLASH_ACCESS_KEY to your .env file\n')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Extract keywords from event for image search
function extractSearchKeywords(event: CalendarEvent): string {
  const title = event.title.toLowerCase()
  const description = (event.description || '').toLowerCase()
  const category = event.category.toLowerCase()
  const combined = `${title} ${description} ${category}`
  
  const keywords = [
    'workshop', 'art', 'music', 'kids', 'ceramics', 'drawing',
    'theater', 'book', 'community', 'festival', 'market',
    'dance', 'yoga', 'fitness', 'food', 'cooking', 'garden'
  ]
  
  for (const keyword of keywords) {
    if (combined.includes(keyword)) {
      return keyword
    }
  }
  
  if (category && category !== 'community') {
    return category
  }
  
  return event.title.split(' ')[0] || 'community'
}

// Get gradient fallback based on event keywords
function getEventGradient(event: CalendarEvent): string {
  const text = `${event.title} ${event.description || ''} ${event.category}`.toLowerCase()
  
  for (const [keyword, gradient] of Object.entries(CATEGORY_GRADIENTS)) {
    if (text.includes(keyword)) {
      return gradient
    }
  }
  
  return CATEGORY_GRADIENTS.default
}

// Fetch image from Unsplash API
async function fetchUnsplashImage(searchQuery: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    return null
  }
  
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?` +
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
      console.warn(`   ⚠️  Unsplash API failed: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular
    }
    
    return null
  } catch (error) {
    console.warn('   ⚠️  Unsplash error:', error)
    return null
  }
}

// Download image from URL and upload to Supabase Storage
async function downloadAndStoreImage(imageUrl: string, eventId: string): Promise<string | null> {
  try {
    console.log(`   📥 Downloading image from Unsplash...`)
    
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`   ❌ Failed to download image: ${response.status}`)
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
    
    console.log(`   📤 Uploading to Supabase Storage: ${path}`)
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, blob, {
        contentType: `image/${extension}`,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      })
    
    if (uploadError) {
      console.error(`   ❌ Upload failed:`, uploadError)
      // Check if bucket doesn't exist
      if (uploadError.message.includes('Bucket') || uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        console.error(`   ❌❌❌ CRITICAL: Storage bucket "event-images" does not exist!`)
        console.error(`   ❌❌❌ Create it in Supabase Dashboard → Storage → Create bucket "event-images" (public)`)
        console.error(`   ❌❌❌ Full error:`, JSON.stringify(uploadError, null, 2))
      }
      return null
    }
    
    // Get public URL from Supabase Storage
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(path)
    
    if (!urlData?.publicUrl) {
      console.error(`   ❌ Failed to get public URL`)
      return null
    }
    
    console.log(`   ✅ Image stored in Supabase Storage: ${urlData.publicUrl.substring(0, 60)}...`)
    return urlData.publicUrl
    
  } catch (error: any) {
    console.error(`   ❌ Error downloading/storing image:`, error)
    return null
  }
}

// Get event header image
async function getEventHeaderImage(event: CalendarEvent): Promise<{
  type: 'image' | 'gradient'
  value: string
}> {
  const keywords = extractSearchKeywords(event)
  const unsplashUrl = await fetchUnsplashImage(keywords)
  
  if (unsplashUrl) {
    // CRITICAL: Download and store in Supabase Storage - NEVER save Unsplash URLs directly
    // If storage fails, use gradient - NEVER fall back to Unsplash URL
    const storageUrl = await downloadAndStoreImage(unsplashUrl, event.id)
    
    if (storageUrl && storageUrl.includes('supabase.co/storage')) {
      // Successfully stored in Supabase Storage
      return { type: 'image', value: storageUrl }
    } else {
      // Storage failed - use gradient, NEVER save Unsplash URL
      console.warn(`   ⚠️  Failed to store in Supabase Storage, using gradient fallback (NOT saving Unsplash URL)`)
      return { type: 'gradient', value: getEventGradient(event) }
    }
  }
  
  // No Unsplash image available - use gradient
  return { type: 'gradient', value: getEventGradient(event) }
}

async function populateEventImages() {
  console.log('🚀 Starting event image population...\n')

  try {
    // BULLETPROOF: Fetch ALL events to ensure every single one gets an image
    // This ensures all 74 events get images, not just the ones missing them
    console.log('📋 Fetching ALL events to populate images...')
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    if (!events || events.length === 0) {
      console.log('✅ All events already have images!')
      return
    }

    console.log(`📊 Found ${events.length} events without images\n`)

    let successCount = 0
    let errorCount = 0

    // Process each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i] as CalendarEvent
      const progress = `[${i + 1}/${events.length}]`

      try {
        console.log(`${progress} Processing: "${event.title}"`)

        // BULLETPROOF: If event already has a valid Supabase Storage image, skip it
        // Only process events that don't have valid Supabase Storage images
        if (event.image_url && 
            event.image_url.includes('supabase.co/storage') && 
            event.image_type === 'image' &&
            !event.image_url.includes('linear-gradient')) {
          console.log(`   ✅ Already has valid Supabase Storage image, skipping...\n`)
          successCount++
          continue
        }

        // CRITICAL: Check if event already has Unsplash URL - convert it to Supabase Storage
        // NEVER keep Unsplash URLs - always convert to Supabase Storage
        if (event.image_url && event.image_url.includes('images.unsplash.com')) {
          console.log(`   🔄 Converting Unsplash URL to Supabase Storage...`)
          const storageUrl = await downloadAndStoreImage(event.image_url, event.id)
          
          if (storageUrl && storageUrl.includes('supabase.co/storage')) {
            // Successfully converted - update with Supabase Storage URL
            const { data: updateData, error: updateError } = await supabase
              .from('calendar_events')
              .update({
                image_url: storageUrl,
                image_type: 'image'
              })
              .eq('id', event.id)
              .select()

            if (updateError) {
              console.error(`   ❌ UPDATE ERROR:`, updateError)
              throw updateError
            }
            
            if (!updateData || updateData.length === 0) {
              console.error(`   ❌ UPDATE FAILED: No rows affected. Likely RLS policy blocking update.`)
              throw new Error('RLS policy blocking update')
            }

            console.log(`   ✅ Converted to Supabase Storage URL: ${storageUrl.substring(0, 60)}...\n`)
            successCount++
            continue // Skip to next event
          } else {
            // Storage failed - remove Unsplash URL and set image_url to null
            // CRITICAL: Never save gradient strings to image_url - the frontend computes gradients when image_url is null
            console.warn(`   ⚠️  Failed to convert to Supabase Storage, removing Unsplash URL and setting image_url to null...`)
            const { data: updateData, error: updateError } = await supabase
              .from('calendar_events')
              .update({
                image_url: null,
                image_type: null
              })
              .eq('id', event.id)
              .select()

            if (updateError) {
              console.error(`   ❌ UPDATE ERROR:`, updateError)
              throw updateError
            }
            
            console.log(`   ✅ Removed Unsplash URL, set image_url to null (frontend will compute gradient)\n`)
            successCount++
            continue
          }
        }

        // Get image (Unsplash or gradient)
        const image = await getEventHeaderImage(event)

        // CRITICAL: Never save gradient strings to image_url
        // If image.type is 'gradient', set image_url to null instead
        // The frontend will compute gradients dynamically when image_url is null
        const imageUrl = image.type === 'image' ? image.value : null
        const imageType = image.type === 'image' ? 'image' : null

        // Update database
        const { data: updateData, error: updateError } = await supabase
          .from('calendar_events')
          .update({
            image_url: imageUrl,
            image_type: imageType
          })
          .eq('id', event.id)
          .select()

        if (updateError) {
          console.error(`   ❌ UPDATE ERROR:`, updateError)
          throw updateError
        }
        
        if (!updateData || updateData.length === 0) {
          console.error(`   ❌ UPDATE FAILED: No rows affected. Likely RLS policy blocking update.`)
          throw new Error('RLS policy blocking update')
        }

        if (image.type === 'image') {
          // CRITICAL: Verify it's actually a Supabase Storage URL, not Unsplash URL
          if (image.value.includes('supabase.co/storage')) {
            console.log(`   ✅ Image stored in Supabase Storage: ${image.value.substring(0, 60)}...\n`)
          } else {
            console.error(`   ❌❌❌ CRITICAL ERROR: Trying to save Unsplash URL instead of Supabase Storage URL!`)
            console.error(`   ❌❌❌ This should NEVER happen - storage failed but we're saving Unsplash URL`)
            console.error(`   ❌❌❌ URL: ${image.value.substring(0, 80)}...`)
            throw new Error('Cannot save Unsplash URL - must store in Supabase Storage')
          }
        } else {
          // CRITICAL: We set image_url to null (not a gradient string) - frontend will compute gradient
          console.log(`   ✅ Set image_url to null (frontend will compute gradient)\n`)
        }
        successCount++

        // Rate limiting: wait 1 second between Unsplash calls
        if (image.type === 'image' && i < events.length - 1) {
          console.log('   ⏳ Waiting 1s for rate limit...\n')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 SUMMARY:')
    console.log('='.repeat(50))
    console.log(`✅ Success: ${successCount} events`)
    console.log(`❌ Errors: ${errorCount} events`)
    console.log(`📈 Total: ${events.length} events`)
    console.log('='.repeat(50))

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the script
populateEventImages()
  .then(() => {
    console.log('\n✨ Done!')
    // Use setTimeout to avoid Node.js assertion error on Windows
    // This is a known issue with tsx/Node.js async handle cleanup
    setTimeout(() => {
      process.exit(0)
    }, 100)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    setTimeout(() => {
      process.exit(1)
    }, 100)
  })

