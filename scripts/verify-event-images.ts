/**
 * Verify Event Images Script
 * 
 * This script queries the database to verify that events have actual image URLs
 * instead of gradient strings. Use this to verify claims about image population.
 * 
 * Usage:
 *   npx tsx scripts/verify-event-images.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env and .env.local (local overrides)
config({ path: path.join(__dirname, '..', '.env') })
config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyEventImages() {
  console.log('🔍 Verifying event images in database...\n')

  try {
    // Get all events with image_url
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, image_url, image_type')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    if (!events || events.length === 0) {
      console.log('❌ No events with image_url found in database')
      return
    }

    console.log(`📊 Total events with image_url: ${events.length}\n`)

    // Categorize events
    const eventsWithUrls = events.filter(e => e.image_url?.startsWith('http'))
    const eventsWithGradients = events.filter(e => e.image_url?.startsWith('linear-gradient'))
    const eventsWithOther = events.filter(e => 
      e.image_url && 
      !e.image_url.startsWith('http') && 
      !e.image_url.startsWith('linear-gradient')
    )

    const eventsWithImageType = events.filter(e => e.image_type === 'image')
    const eventsWithGradientType = events.filter(e => e.image_type === 'gradient')

    console.log('📈 BREAKDOWN BY URL TYPE:')
    console.log(`   ✅ Events with HTTP URLs (actual images): ${eventsWithUrls.length}`)
    console.log(`   🎨 Events with gradient strings: ${eventsWithGradients.length}`)
    console.log(`   ❓ Events with other URL types: ${eventsWithOther.length}`)
    console.log('')

    console.log('📈 BREAKDOWN BY image_type FIELD:')
    console.log(`   ✅ Events with image_type='image': ${eventsWithImageType.length}`)
    console.log(`   🎨 Events with image_type='gradient': ${eventsWithGradientType.length}`)
    console.log(`   ❓ Events with null/other image_type: ${events.length - eventsWithImageType.length - eventsWithGradientType.length}`)
    console.log('')

    // Show sample events
    console.log('📋 SAMPLE EVENTS (first 10):')
    console.log('─'.repeat(80))
    events.slice(0, 10).forEach((event, i) => {
      const urlType = event.image_url?.startsWith('http') ? 'URL' : 
                     event.image_url?.startsWith('linear-gradient') ? 'GRADIENT' : 'OTHER'
      const urlPreview = event.image_url ? event.image_url.substring(0, 60) + '...' : 'null'
      console.log(`${i + 1}. ${event.title?.substring(0, 40) || 'Untitled'}`)
      console.log(`   URL Type: ${urlType}`)
      console.log(`   image_type: ${event.image_type || 'null'}`)
      console.log(`   image_url: ${urlPreview}`)
      console.log('')
    })

    // Verification result
    console.log('─'.repeat(80))
    console.log('✅ VERIFICATION RESULT:')
    
    if (eventsWithGradients.length > 0) {
      console.log(`❌ FAILED: ${eventsWithGradients.length} events still have gradient strings instead of image URLs`)
      console.log('   These events need to be populated with actual images')
    } else if (eventsWithUrls.length === 0) {
      console.log('❌ FAILED: No events have HTTP URLs (actual images)')
      console.log('   All events may need to be populated with images')
    } else {
      console.log(`✅ PASSED: ${eventsWithUrls.length} events have actual image URLs`)
      console.log(`   All events with image_url have HTTP URLs (actual images)`)
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run verification
verifyEventImages()
  .then(() => {
    console.log('\n✨ Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })
