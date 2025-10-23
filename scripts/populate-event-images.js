/**
 * Populate Calendar Event Images
 * 
 * This script fetches all calendar events from the database and populates
 * the image_url and image_type columns with either:
 * 1. Unsplash image URLs (if API key configured)
 * 2. Category-based gradient strings (fallback)
 * 
 * IMPORTANT: Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS policies
 * for bulk database updates.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from both .env and .env.local
const envPath = resolve(process.cwd(), '.env')
const envLocalPath = resolve(process.cwd(), '.env.local')

config({ path: envPath })
config({ path: envLocalPath, override: true })

// Supabase configuration - MUST use service role key for updates
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const UNSPLASH_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Category-based gradient fallbacks (same as frontend)
const CATEGORY_GRADIENTS = {
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
 */
function extractSearchKeywords(event) {
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
function getEventGradient(event) {
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
 */
async function fetchUnsplashImage(searchQuery) {
  // Skip if no API key
  if (!UNSPLASH_KEY || UNSPLASH_KEY === 'demo_key') {
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
          'Authorization': `Client-ID ${UNSPLASH_KEY}`
        }
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular
    }
    
    return null
  } catch (error) {
    console.warn(`⚠️  Unsplash error for "${searchQuery}":`, error.message)
    return null
  }
}

/**
 * Get event header image (Unsplash or gradient)
 */
async function getEventHeaderImage(event) {
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
 * Main function
 */
async function main() {
  console.log('🎨 Populating Calendar Event Images\n')
  console.log('Configuration:')
  console.log(`  Supabase URL: ${SUPABASE_URL}`)
  console.log(`  Using Service Role Key: ${SUPABASE_SERVICE_KEY ? '✓' : '✗'}`)
  console.log(`  Unsplash API Key: ${UNSPLASH_KEY ? '✓ (will fetch images)' : '✗ (gradients only)'}\n`)
  
  // Fetch all calendar events
  console.log('📥 Fetching calendar events...')
  const { data: events, error: fetchError } = await supabase
    .from('calendar_events')
    .select('*')
    .order('date', { ascending: true })
  
  if (fetchError) {
    console.error('❌ Error fetching events:', fetchError)
    process.exit(1)
  }
  
  if (!events || events.length === 0) {
    console.log('ℹ️  No events found in database')
    return
  }
  
  console.log(`✓ Found ${events.length} events\n`)
  
  // Process events in batches to avoid rate limits
  const batchSize = 5
  let updated = 0
  let skipped = 0
  let failed = 0
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(events.length/batchSize)}...`)
    
    for (const event of batch) {
      // Skip if already has image data
      if (event.image_url && event.image_type) {
        console.log(`  ⏭️  Skipped: ${event.title} (already has image)`)
        skipped++
        continue
      }
      
      try {
        // Get image data
        const imageData = await getEventHeaderImage(event)
        
        // Update database
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({
            image_url: imageData.value,
            image_type: imageData.type
          })
          .eq('id', event.id)
        
        if (updateError) {
          console.error(`  ❌ Failed: ${event.title}`, updateError.message)
          failed++
        } else {
          const icon = imageData.type === 'image' ? '🖼️' : '🎨'
          console.log(`  ${icon} Updated: ${event.title} (${imageData.type})`)
          updated++
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`  ❌ Error processing ${event.title}:`, error.message)
        failed++
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log(`  ✓ Updated: ${updated}`)
  console.log(`  ⏭️  Skipped: ${skipped} (already had images)`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log('='.repeat(60))
  
  if (updated > 0) {
    console.log('\n✅ Image population complete!')
    console.log('   The calendar events now have permanent header images.')
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

