/**
 * Backfill Event Image Types
 * 
 * Fixes legacy events where image_url exists but image_type is null
 * Sets image_type based on image_url format:
 * - URLs starting with 'http' → 'image'
 * - Strings starting with 'linear-gradient' → 'gradient'
 * 
 * This prevents cascading failure where events with database images
 * fall back to gradients because image_type is null.
 * 
 * Usage:
 *   npm run backfill:event-image-types
 *   or
 *   tsx scripts/backfill-event-image-types.ts
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

async function backfillImageTypes() {
  console.log('🚀 Starting event image type backfill...\n')

  try {
    // Fetch all events with image_url but null image_type
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, image_url, image_type')
      .not('image_url', 'is', null)
      .is('image_type', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch events: ${fetchError.message}`)
    }

    if (!events || events.length === 0) {
      console.log('✅ All events already have image_type set!')
      return
    }

    console.log(`📊 Found ${events.length} events with image_url but null image_type\n`)

    let successCount = 0
    let errorCount = 0

    // Process each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const progress = `[${i + 1}/${events.length}]`

      try {
        // Infer image_type from image_url format
        // URLs starting with 'http' are 'image' type
        // Strings starting with 'linear-gradient' are 'gradient' type
        const inferredType = event.image_url?.startsWith('http') ? 'image' : 'gradient'

        console.log(`${progress} Processing: "${event.title?.substring(0, 50) || 'Untitled'}"`)
        console.log(`   image_url: ${event.image_url?.substring(0, 60)}...`)
        console.log(`   inferred type: ${inferredType}`)

        // Update database
        const { data: updateData, error: updateError } = await supabase
          .from('calendar_events')
          .update({
            image_type: inferredType
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

        console.log(`   ✅ Set image_type to '${inferredType}'\n`)
        successCount++

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
backfillImageTypes()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

