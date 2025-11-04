/**
 * Verification Script: Check Event Images in Database
 * 
 * Verifies that all calendar events have images in the database.
 * Run this to check the actual database state.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
const envPath = resolve(process.cwd(), '.env')
const envLocalPath = resolve(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  config({ path: envPath })
}

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyEventImages() {
  console.log('🔍 Verifying Event Images in Database\n')
  console.log('=' .repeat(60))
  
  try {
    // Query all events
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, image_url, image_type, date')
      .order('date', { ascending: true })
    
    if (error) {
      console.error('❌ Query error:', error)
      process.exit(1)
    }
    
    if (!events || events.length === 0) {
      console.log('⚠️  No events found in database')
      process.exit(0)
    }
    
    const total = events.length
    const withImages = events.filter(e => e.image_url && e.image_type).length
    const withoutImages = events.filter(e => !e.image_url || !e.image_type).length
    
    console.log(`\n📊 RESULTS:`)
    console.log(`   Total events: ${total}`)
    console.log(`   ✅ With images: ${withImages} (${Math.round(withImages / total * 100)}%)`)
    console.log(`   ❌ Without images: ${withoutImages} (${Math.round(withoutImages / total * 100)}%)`)
    
    if (withoutImages > 0) {
      console.log(`\n⚠️  Events WITHOUT images:`)
      const missing = events.filter(e => !e.image_url || !e.image_type)
      missing.forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title}" (ID: ${event.id})`)
        console.log(`      image_url: ${event.image_url || 'NULL'}`)
        console.log(`      image_type: ${event.image_type || 'NULL'}`)
      })
    } else {
      console.log(`\n✅ SUCCESS! All ${total} events have images!`)
    }
    
    // Sample events with images
    console.log(`\n📋 Sample events WITH images (first 5):`)
    const withImagesEvents = events.filter(e => e.image_url && e.image_type).slice(0, 5)
    withImagesEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title}"`)
      console.log(`      image_url: ${event.image_url.substring(0, 60)}...`)
      console.log(`      image_type: ${event.image_type}`)
    })
    
    console.log('\n' + '='.repeat(60))
    
    if (withoutImages === 0) {
      console.log('✅ VERIFICATION PASSED: All events have images!')
      process.exit(0)
    } else {
      console.log(`⚠️  VERIFICATION FAILED: ${withoutImages} events missing images`)
      process.exit(1)
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run verification
verifyEventImages()

