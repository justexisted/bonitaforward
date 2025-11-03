import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Populate images for upcoming events that lack images (runs daily)
export const config = {
  schedule: '0 4 * * *', // 04:00 UTC daily
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const UNSPLASH_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY

const handler: Handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase env (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' })
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    // Fetch upcoming events that are missing images
    const todayIso = new Date().toISOString().slice(0, 10)
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .or('image_url.is.null,image_type.is.null')
      .gte('date', todayIso)
      .order('date', { ascending: true })
      .limit(100)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    if (!events || events.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ updated: 0 }) }
    }

    // Lazy import to reuse existing keyword/gradient helpers
    const { extractSearchKeywords, getEventGradient } = await import('../../src/utils/eventImageUtils')

    let updated = 0
    for (const event of events as any[]) {
      // If we don't have an Unsplash key, save gradient to avoid blanks
      let type: 'image' | 'gradient' = 'gradient'
      let value = getEventGradient(event)

      if (UNSPLASH_KEY) {
        // Fetch Unsplash once per event
        const keywords = extractSearchKeywords(event)
        const resp = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&orientation=landscape&per_page=1&content_filter=high`,
          { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
        )
        if (resp.ok) {
          const data = await resp.json()
          if (data.results && data.results.length > 0) {
            type = 'image'
            value = data.results[0].urls.regular
          }
        }
      }

      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({ image_url: value, image_type: type })
        .eq('id', event.id)

      if (!updateError) updated++

      // small delay to be gentle on Unsplash
      await new Promise(r => setTimeout(r, 200))
    }

    return { statusCode: 200, body: JSON.stringify({ updated }) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || String(err) }) }
  }
}

export { handler }


