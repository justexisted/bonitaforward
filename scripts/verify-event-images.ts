/**
 * Verify Event Images Are Actually Stored in Supabase Storage
 * 
 * This script checks the actual state of the database to prove:
 * 1. Images are stored in Supabase Storage (not Unsplash URLs)
 * 2. No gradient strings are saved
 * 3. Images exist in the storage bucket
 * 
 * Usage:
 *   npx tsx scripts/verify-event-images.ts
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

async function verifyEventImages() {
  console.log('🔍 Verifying event images in database...\n')

  try {
    // Fetch all events
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, image_url, image_type')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching events:', error)
      throw error
    }

    if (!events || events.length === 0) {
      console.log('⚠️  No events found')
      return
    }

    console.log(`📊 Total events: ${events.length}\n`)

    // Categorize events by image type
    const withSupabaseStorage = events.filter(e => 
      e.image_url && e.image_url.includes('supabase.co/storage')
    )
    const withUnsplashUrl = events.filter(e => 
      e.image_url && e.image_url.includes('images.unsplash.com')
    )
    const withGradientString = events.filter(e => 
      e.image_url && e.image_url.startsWith('linear-gradient')
    )
    const withoutImage = events.filter(e => 
      !e.image_url || (!e.image_url.includes('supabase.co/storage') && !e.image_url.includes('images.unsplash.com') && !e.image_url.startsWith('linear-gradient'))
    )

    console.log('📈 IMAGE STATISTICS:')
    console.log(`   ✅ Supabase Storage URLs: ${withSupabaseStorage.length}`)
    console.log(`   ❌ Unsplash URLs: ${withUnsplashUrl.length}`)
    console.log(`   ⚠️  Gradient strings: ${withGradientString.length}`)
    console.log(`   ❌ No image: ${withoutImage.length}\n`)

    // Show sample events
    console.log('📋 SAMPLE EVENTS WITH SUPABASE STORAGE:')
    withSupabaseStorage.slice(0, 5).forEach((event, i) => {
      console.log(`   ${i + 1}. "${event.title?.substring(0, 50)}"`)
      console.log(`      URL: ${event.image_url?.substring(0, 80)}...`)
      console.log(`      Type: ${event.image_type || 'null'}\n`)
    })

    if (withUnsplashUrl.length > 0) {
      console.log('❌ EVENTS WITH UNSPLASH URLS (SHOULD BE CONVERTED):')
      withUnsplashUrl.slice(0, 5).forEach((event, i) => {
        console.log(`   ${i + 1}. "${event.title?.substring(0, 50)}"`)
        console.log(`      URL: ${event.image_url?.substring(0, 80)}...`)
        console.log(`      Type: ${event.image_type || 'null'}\n`)
      })
    }

    if (withGradientString.length > 0) {
      console.log('⚠️  EVENTS WITH GRADIENT STRINGS (SHOULD BE REPLACED):')
      withGradientString.slice(0, 5).forEach((event, i) => {
        console.log(`   ${i + 1}. "${event.title?.substring(0, 50)}"`)
        console.log(`      URL: ${event.image_url?.substring(0, 80)}...`)
        console.log(`      Type: ${event.image_type || 'null'}\n`)
      })
    }

    // Check storage bucket
    console.log('📦 CHECKING STORAGE BUCKET...\n')
    const { data: files, error: listError } = await supabase.storage
      .from('event-images')
      .list('event-images', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      console.error('❌ Error listing storage bucket:', listError)
      console.error('   Bucket might not exist or is not accessible')
    } else {
      console.log(`✅ Storage bucket "event-images" exists`)
      console.log(`   Files in bucket: ${files?.length || 0}`)
      if (files && files.length > 0) {
        console.log(`\n📁 Sample files:`)
        files.slice(0, 5).forEach((file, i) => {
          console.log(`   ${i + 1}. ${file.name}`)
          console.log(`      Size: ${(file.metadata?.size || 0) / 1024} KB`)
          console.log(`      Created: ${file.created_at}\n`)
        })
      }
    }

    // Final verdict
    console.log('\n' + '='.repeat(60))
    console.log('📊 FINAL VERDICT:')
    console.log('='.repeat(60))
    
    if (withSupabaseStorage.length === events.length) {
      console.log('✅ SUCCESS: All events have Supabase Storage URLs!')
    } else if (withSupabaseStorage.length > 0) {
      console.log(`⚠️  PARTIAL: ${withSupabaseStorage.length}/${events.length} events have Supabase Storage URLs`)
      if (withUnsplashUrl.length > 0) {
        console.log(`   ❌ ${withUnsplashUrl.length} events still have Unsplash URLs - run populate script`)
      }
      if (withGradientString.length > 0) {
        console.log(`   ⚠️  ${withGradientString.length} events have gradient strings - run populate script`)
      }
    } else {
      console.log('❌ FAILURE: No events have Supabase Storage URLs!')
      console.log('   Run: npx tsx scripts/create-event-images-bucket.ts')
      console.log('   Then: npx tsx scripts/populate-event-images.ts')
    }
    
    console.log('='.repeat(60) + '\n')

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the script
verifyEventImages()
  .then(() => {
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
