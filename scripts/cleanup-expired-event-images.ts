/**
 * Cleanup Expired Event Images
 * 
 * Deletes images from Supabase Storage for events that expired more than 10 days ago.
 * This prevents storage bloat from old event images.
 * 
 * CRITICAL: This deletes the actual image files from Supabase Storage, not just database records.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-expired-event-images.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from BOTH .env and .env.local
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Extract file path from Supabase Storage URL
 * Example: https://xxx.supabase.co/storage/v1/object/public/event-images/event-123-456.jpg
 * Returns: event-images/event-123-456.jpg
 */
function extractStoragePath(imageUrl: string): string | null {
  try {
    // Supabase Storage URLs follow pattern: .../storage/v1/object/public/bucket-name/path
    const match = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+\/.+)$/)
    if (match) {
      return match[1]
    }
    
    // Fallback: try to extract after bucket name
    const bucketMatch = imageUrl.match(/event-images\/(.+)$/)
    if (bucketMatch) {
      return `event-images/${bucketMatch[1]}`
    }
    
    return null
  } catch (error) {
    console.error('Error extracting storage path:', error)
    return null
  }
}

async function cleanupExpiredEventImages() {
  console.log('🧹 Starting cleanup of expired event images...\n')

  try {
    // Calculate cutoff date: 10 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 10)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`📅 Looking for events that expired before: ${cutoffISO}\n`)

    // Find events that expired more than 10 days ago and have Supabase Storage images
    const { data: expiredEvents, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, date, image_url, image_type')
      .lt('date', cutoffISO) // Event date is in the past
      .eq('image_type', 'image') // Only events with actual images (not gradients)
      .not('image_url', 'is', null) // Must have image_url
      .like('image_url', '%supabase.co/storage%') // Only Supabase Storage URLs

    if (fetchError) {
      throw new Error(`Failed to fetch expired events: ${fetchError.message}`)
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      console.log('✅ No expired events with images to clean up!')
      return
    }

    console.log(`📊 Found ${expiredEvents.length} expired events with images\n`)

    let deletedCount = 0
    let errorCount = 0
    const filesToDelete: string[] = []

    // Extract storage paths from image URLs
    for (const event of expiredEvents) {
      if (!event.image_url) continue

      const storagePath = extractStoragePath(event.image_url)
      if (storagePath) {
        filesToDelete.push(storagePath)
        console.log(`   📋 Event "${event.title}" (${event.id}): ${storagePath}`)
      } else {
        console.warn(`   ⚠️  Could not extract storage path from: ${event.image_url}`)
        errorCount++
      }
    }

    if (filesToDelete.length === 0) {
      console.log('\n⚠️  No files to delete (could not extract storage paths)')
      return
    }

    console.log(`\n🗑️  Deleting ${filesToDelete.length} image file(s) from Supabase Storage...\n`)

    // Delete files from Supabase Storage
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('event-images')
      .remove(filesToDelete)

    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError)
      throw deleteError
    }

    // Count successfully deleted files
    const deletedFiles = deleteData?.filter(file => file.name) || []
    deletedCount = deletedFiles.length

    console.log(`\n✅ Successfully deleted ${deletedCount} image file(s)`)
    
    // Update database records to remove image_url for deleted events
    console.log('\n📝 Updating database records...')
    
    const expiredEventIds = expiredEvents.map(e => e.id)
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({ 
        image_url: null,
        image_type: null
      })
      .in('id', expiredEventIds)

    if (updateError) {
      console.error('❌ Error updating database records:', updateError)
      errorCount++
    } else {
      console.log(`✅ Updated ${expiredEventIds.length} database records`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 CLEANUP SUMMARY:')
    console.log('='.repeat(50))
    console.log(`✅ Deleted: ${deletedCount} image file(s)`)
    console.log(`📝 Updated: ${expiredEventIds.length} database record(s)`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log('='.repeat(50))

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the script
cleanupExpiredEventImages()
  .then(() => {
    console.log('\n✨ Cleanup complete!')
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

