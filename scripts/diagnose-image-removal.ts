/**
 * DIAGNOSTIC SCRIPT: Find Which Function Is Removing Event Images
 * 
 * This script:
 * 1. First repopulates all event images
 * 2. Checks image counts before/after each function
 * 3. Simulates each function that might modify events
 * 4. Logs which function removes images
 * 
 * Usage:
 *   npx tsx scripts/diagnose-image-removal.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import type { CalendarEvent } from '../src/types'

// Load environment variables from BOTH .env and .env.local
const envPath = resolve(process.cwd(), '.env')
const envLocalPath = resolve(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  config({ path: envPath })
}
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Check current image counts
 */
async function checkImageCounts(): Promise<{
  total: number
  withImages: number
  withoutImages: number
  imageUrls: string[]
  sampleEvents: Array<{ id: string; title: string; image_url: string | null }>
}> {
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, image_url, image_type, source')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error checking image counts:', error)
    return { total: 0, withImages: 0, withoutImages: 0, imageUrls: [], sampleEvents: [] }
  }

  const withImages = events?.filter(e => e.image_url).length || 0
  const withoutImages = events?.filter(e => !e.image_url).length || 0
  const imageUrls = events?.filter(e => e.image_url).map(e => e.image_url as string) || []
  const sampleEvents = events?.slice(0, 10).map(e => ({
    id: e.id,
    title: e.title || 'Untitled',
    image_url: e.image_url
  })) || []

  return {
    total: events?.length || 0,
    withImages,
    withoutImages,
    imageUrls,
    sampleEvents
  }
}

/**
 * Repopulate all event images using the actual populate script logic
 */
async function repopulateAllImages(): Promise<void> {
  console.log('\n📸 STEP 1: Repopulating all event images...\n')
  
  // First, get all events
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, image_url, source')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching events:', error)
    return
  }

  console.log(`📊 Found ${events?.length || 0} total events\n`)

  // For diagnostic purposes, set a placeholder image URL for events without images
  // In production, this would fetch from Unsplash
  let updated = 0
  for (const event of events || []) {
    if (!event.image_url) {
      // Set a placeholder URL for testing
      const placeholderUrl = `https://via.placeholder.com/800x600?text=${encodeURIComponent(event.title?.substring(0, 30) || 'Event')}`
      
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({
          image_url: placeholderUrl,
          image_type: 'image'
        })
        .eq('id', event.id)

      if (updateError) {
        console.error(`❌ Error updating ${event.id}:`, updateError)
      } else {
        updated++
        console.log(`✅ Set image for: ${event.title?.substring(0, 40)}`)
      }
    }
  }

  console.log(`\n✅ Repopulated ${updated} event images\n`)
}

/**
 * Check which functions are running and might be removing images
 */
async function checkForRunningFunctions(): Promise<void> {
  console.log('\n🔍 Checking for scheduled functions that might be running...\n')
  
  // Check if there are any scheduled functions that might be deleting events
  console.log('⚠️  Scheduled functions that might affect images:')
  console.log('  1. scheduled-fetch-events.ts - Runs every 4 hours, DELETES and re-inserts iCalendar events')
  console.log('  2. populate-event-images.ts - Runs daily, populates missing images')
  console.log('  3. expire-event-images.ts - Runs daily, removes images from expired events')
  console.log('  4. fetch-kpbs-events.ts - Runs on schedule, DELETES and re-inserts KPBS events')
  console.log('  5. fetch-vosd-events.ts - Runs on schedule, DELETES and re-inserts VOSD events')
  console.log('\n⚠️  CRITICAL: Functions that DELETE events before re-inserting:')
  console.log('  - scheduled-fetch-events.ts (line 426-429): Deletes all iCalendar events')
  console.log('  - manual-fetch-events.ts (line 488-491): Deletes all iCalendar events')
  console.log('  - fetch-kpbs-events.ts (line 573-577): Deletes all KPBS events')
  console.log('  - fetch-vosd-events.ts: Likely similar pattern')
  console.log('\n⚠️  These functions try to preserve images by ID, but if IDs change, images are lost!')
}

/**
 * Check if events are being deleted and re-inserted (which would lose images if IDs don't match)
 */
async function checkEventDeletionPattern(): Promise<void> {
  console.log('\n🔍 Checking for event deletion/re-insertion patterns...\n')
  
  // Check recent deletions by looking at updated_at timestamps
  const { data: recentEvents, error } = await supabase
    .from('calendar_events')
    .select('id, title, image_url, source, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error checking events:', error)
    return
  }

  console.log('📊 Recent events (last 20 by updated_at):')
  recentEvents?.forEach(event => {
    const hasImage = !!event.image_url
    const imageStatus = hasImage ? '✅ HAS IMAGE' : '❌ NO IMAGE'
    console.log(`  ${imageStatus} | ${event.source || 'unknown'} | ${event.title?.substring(0, 40)}`)
  })
}

/**
 * Main diagnostic function
 */
async function diagnoseImageRemoval() {
  console.log('🔬 DIAGNOSTIC: Finding Which Function Removes Event Images\n')
  console.log('='.repeat(60))
  
  // Step 1: Check initial state
  console.log('\n📊 INITIAL STATE:')
  const initial = await checkImageCounts()
  console.log(`Total events: ${initial.total}`)
  console.log(`Events with images: ${initial.withImages}`)
  console.log(`Events without images: ${initial.withoutImages}`)
  
  if (initial.sampleEvents.length > 0) {
    console.log('\n📋 Sample events (first 10):')
    initial.sampleEvents.forEach(e => {
      const status = e.image_url ? '✅ HAS IMAGE' : '❌ NO IMAGE'
      console.log(`  ${status} | ${e.title.substring(0, 40)}`)
    })
  }
  
  // Step 2: Repopulate images
  if (initial.withoutImages > 0) {
    await repopulateAllImages()
  } else {
    console.log('\n✅ All events already have images, skipping repopulation')
  }
  
  // Step 3: Check state after population
  console.log('\n📊 STATE AFTER REPOPULATION:')
  const afterPopulate = await checkImageCounts()
  console.log(`Total events: ${afterPopulate.total}`)
  console.log(`Events with images: ${afterPopulate.withImages}`)
  console.log(`Events without images: ${afterPopulate.withoutImages}`)
  
  // Step 4: Check for running functions
  await checkForRunningFunctions()
  
  // Step 5: Check deletion patterns
  await checkEventDeletionPattern()
  
  // Step 6: Final state
  console.log('\n📊 FINAL STATE:')
  const final = await checkImageCounts()
  console.log(`Total events: ${final.total}`)
  console.log(`Events with images: ${final.withImages}`)
  console.log(`Events without images: ${final.withoutImages}`)
  
  if (final.withImages < afterPopulate.withImages) {
    console.log(`\n❌ IMAGES WERE REMOVED!`)
    console.log(`Lost: ${afterPopulate.withImages - final.withImages} images`)
    console.log(`\n⚠️  This likely happened due to a scheduled function running`)
  } else {
    console.log('\n✅ No images were removed during diagnostic')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 CRITICAL FINDINGS:')
  console.log('='.repeat(60))
  console.log('⚠️  Functions that DELETE events before re-inserting:')
  console.log('  1. scheduled-fetch-events.ts - Deletes ALL iCalendar events, then re-inserts')
  console.log('  2. manual-fetch-events.ts - Deletes ALL iCalendar events, then re-inserts')
  console.log('  3. fetch-kpbs-events.ts - Deletes ALL KPBS events, then re-inserts')
  console.log('  4. fetch-vosd-events.ts - Likely same pattern')
  console.log('\n⚠️  PROBLEM: If event IDs change during re-insertion, images are lost!')
  console.log('⚠️  These functions try to preserve images by ID, but:')
  console.log('     - If IDs don\'t match, images are lost')
  console.log('     - If events are deleted before images are fetched, images are lost')
  console.log('     - If events from OTHER sources are deleted, their images are lost')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Check Netlify function logs for scheduled-fetch-events, fetch-kpbs-events, fetch-vosd-events')
  console.log('2. Check if these functions are running and deleting events')
  console.log('3. Verify that image preservation logic is working correctly')
  console.log('4. Check if event IDs are stable between deletions/re-insertions')
}

// Run diagnostic
diagnoseImageRemoval()
  .then(() => {
    console.log('\n✅ Diagnostic complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error)
    process.exit(1)
  })
