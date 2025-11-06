/**
 * Cleanup Script: Remove gradient strings from image_url column
 * 
 * CRITICAL: Gradient strings should NEVER be stored in image_url
 * The frontend computes gradients dynamically when image_url is null
 * 
 * Usage:
 *   npm run cleanup:gradient-strings
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Required: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupGradientStrings() {
  console.log('🧹 Starting cleanup of gradient strings from image_url...\n')

  try {
    // First, check how many events have gradient strings
    const { data: eventsWithGradients, error: countError } = await supabase
      .from('calendar_events')
      .select('id, title, image_url, image_type')
      .like('image_url', 'linear-gradient%')

    if (countError) {
      console.error('❌ Error checking for gradient strings:', countError)
      throw countError
    }

    const count = eventsWithGradients?.length || 0

    if (count === 0) {
      console.log('✅ No gradient strings found in image_url column - nothing to clean up!')
      return
    }

    console.log(`📊 Found ${count} event(s) with gradient strings in image_url`)
    console.log('\nSample events that will be cleaned up:')
    eventsWithGradients?.slice(0, 5).forEach((event, i) => {
      console.log(`   ${i + 1}. "${event.title?.substring(0, 50)}"`)
      console.log(`      Current image_url: ${event.image_url?.substring(0, 60)}...`)
    })
    if (count > 5) {
      console.log(`   ... and ${count - 5} more`)
    }

    console.log('\n🧹 Cleaning up gradient strings...')

    // Update all events with gradient strings to have null image_url
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        image_url: null,
        image_type: null
      })
      .like('image_url', 'linear-gradient%')

    if (updateError) {
      console.error('❌ Error updating events:', updateError)
      throw updateError
    }

    // Verify cleanup was successful
    const { count: remainingCount } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .like('image_url', 'linear-gradient%')

    if (remainingCount === 0) {
      console.log(`\n✅ Successfully cleaned up ${count} event(s)`)
      console.log('   All gradient strings have been removed from image_url')
      console.log('   Events will now use frontend-computed gradients when image_url is null')
    } else {
      console.warn(`\n⚠️  Warning: ${remainingCount} events still have gradient strings`)
    }

    console.log('\n✨ Cleanup complete!')
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the cleanup
cleanupGradientStrings()


