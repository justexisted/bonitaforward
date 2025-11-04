/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - Supabase Storage bucket "event-images": Must exist for image deletion
 *   → CRITICAL: Bucket must be created in Supabase Dashboard → Storage
 *   → CRITICAL: Uses service role key to bypass RLS for deletion
 * - calendar_events table: Must have date, image_url, image_type columns
 *   → CRITICAL: Queries events by date and image_type
 * 
 * WHAT DEPENDS ON THIS:
 * - Netlify Scheduled Functions: Runs daily at 05:00 UTC
 *   → CRITICAL: Must be configured in netlify.toml or Netlify dashboard
 * 
 * BREAKING CHANGES:
 * - If bucket name changes → Deletion fails
 * - If storage API changes → Deletion fails
 * - If event date format changes → Query fails
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Test manually: Run cleanup-expired-event-images.ts script first
 * 2. Verify bucket exists: Check Supabase Dashboard → Storage
 * 3. Test deletion: Verify files are actually deleted from storage
 * 4. Check database: Verify image_url is set to null after deletion
 * 
 * RELATED FILES:
 * - scripts/cleanup-expired-event-images.ts: Manual cleanup script (same logic)
 * - scripts/populate-event-images.ts: Populates images (downloads and stores)
 * - src/utils/eventImageStorage.ts: Frontend image storage utility
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs daily via Netlify Scheduled Functions to delete images from expired events
export const config = {
  schedule: '0 5 * * *', // 05:00 UTC daily (runs at midnight PST / 5am UTC)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    console.error('[expire-event-images] Error extracting storage path:', error)
    return null
  }
}

const handler: Handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[expire-event-images] Missing Supabase env variables')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase env (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' })
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  })

  try {
    // Calculate the cutoff date: events that expired more than 10 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 10)
    const cutoffISO = cutoffDate.toISOString()
    
    console.log(`[expire-event-images] Looking for events that expired before: ${cutoffISO}`)
    
    // Find expired events with Supabase Storage images
    const { data: expiredEvents, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, date, image_url, image_type')
      .lt('date', cutoffISO) // Event date is in the past
      .eq('image_type', 'image') // Only events with actual images (not gradients)
      .not('image_url', 'is', null) // Must have image_url
      .like('image_url', '%supabase.co/storage%') // Only Supabase Storage URLs

    if (fetchError) {
      console.error('[expire-event-images] Error fetching expired events:', fetchError)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: `Failed to fetch events: ${fetchError.message}` }) 
      }
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      console.log('[expire-event-images] No expired events with images to clean up')
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          ok: true, 
          deleted: 0,
          updated: 0,
          cutoffDate: cutoffISO
        }) 
      }
    }

    console.log(`[expire-event-images] Found ${expiredEvents.length} expired events with images`)

    // Extract storage paths from image URLs
    const filesToDelete: string[] = []
    const eventIdsToUpdate: string[] = []

    for (const event of expiredEvents) {
      if (!event.image_url) continue

      const storagePath = extractStoragePath(event.image_url)
      if (storagePath) {
        filesToDelete.push(storagePath)
        eventIdsToUpdate.push(event.id)
      } else {
        console.warn(`[expire-event-images] Could not extract storage path from: ${event.image_url} (event: ${event.id})`)
      }
    }

    let deletedCount = 0
    let updatedCount = 0

    // Delete files from Supabase Storage
    if (filesToDelete.length > 0) {
      console.log(`[expire-event-images] Deleting ${filesToDelete.length} image file(s) from Supabase Storage...`)
      
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('event-images')
        .remove(filesToDelete)

      if (deleteError) {
        console.error('[expire-event-images] Error deleting files:', deleteError)
        return { 
          statusCode: 500, 
          body: JSON.stringify({ error: `Failed to delete files: ${deleteError.message}` }) 
        }
      }

      // Count successfully deleted files
      const deletedFiles = deleteData?.filter(file => file.name) || []
      deletedCount = deletedFiles.length
      console.log(`[expire-event-images] Successfully deleted ${deletedCount} image file(s)`)
    }

    // Update database records to remove image_url
    if (eventIdsToUpdate.length > 0) {
      console.log(`[expire-event-images] Updating ${eventIdsToUpdate.length} database records...`)
      
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({ 
          image_url: null,
          image_type: null
        })
        .in('id', eventIdsToUpdate)

      if (updateError) {
        console.error('[expire-event-images] Error updating database:', updateError)
        return { 
          statusCode: 500, 
          body: JSON.stringify({ error: `Failed to update database: ${updateError.message}` }) 
        }
      }

      updatedCount = eventIdsToUpdate.length
      console.log(`[expire-event-images] Successfully updated ${updatedCount} database record(s)`)
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        deleted: deletedCount,
        updated: updatedCount,
        cutoffDate: cutoffISO
      }) 
    }
  } catch (err: any) {
    console.error('[expire-event-images] Fatal error:', err)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err?.message || String(err) }) 
    }
  }
}

export { handler }


