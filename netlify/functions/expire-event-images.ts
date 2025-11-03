import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs daily via Netlify Scheduled Functions to expire old event images
export const config = {
  schedule: '0 5 * * *', // 05:00 UTC daily
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const handler: Handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase env (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' })
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    // Calculate the cutoff date: events that expired more than 10 days ago
    // Example: if today is 2025-11-03, remove images from events with date < 2025-10-24
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 10)
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10) // YYYY-MM-DD format
    
    // Find and expire images for past events (only real images, not gradients)
    // Events scheduled far in the future keep their images until they expire
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ image_url: null, image_type: null })
      .lt('date', cutoffDateStr)
      .eq('image_type', 'image')
      .select('id')

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    const expiredCount = data?.length || 0
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        expired: expiredCount,
        cutoffDate: cutoffDateStr
      }) 
    }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || String(err) }) }
  }
}

export { handler }


