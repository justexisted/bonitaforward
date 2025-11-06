import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { filterEventsByZipCode } from './utils/zipCodeFilter'

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Voice of San Diego API configuration
const VOSD_API_BASE = 'https://voiceofsandiego.org/wp-json/tribe/events/v1/events'
const SOURCE_NAME = 'Voice of San Diego'

interface VosdEvent {
  id: number
  title: string
  description: string
  start_date: string
  end_date: string
  all_day: boolean
  venue?: {
    venue: string
    address: string
    city: string
    zip: string
    country: string
  }
  categories?: Array<{
    name: string
  }>
  url: string
  cost?: string
}

interface VosdApiResponse {
  events: VosdEvent[]
  total: number
  total_pages: number
  next_rest_url?: string
}

/**
 * Strip HTML tags from description
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8230;/g, '...')
    .trim()
}

/**
 * Extract time in HH:MM format from datetime string
 */
const extractTime = (datetime: string): string | null => {
  try {
    const date = new Date(datetime)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return null
  }
}

/**
 * Fetch events from Voice of San Diego API
 */
const fetchVosdEvents = async (page: number = 1, perPage: number = 50): Promise<VosdEvent[]> => {
  const now = new Date()
  // Look back 6 months to catch recent past events, and forward 1 year for future events
  const startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0]
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]
  
  const url = `${VOSD_API_BASE}?per_page=${perPage}&page=${page}&start_date=${startDate}&end_date=${endDate}&status=publish`
  
  console.log(`Fetching Voice of San Diego events from: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bonita Forward Calendar Bot/1.0',
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: VosdApiResponse = await response.json()
    console.log(`Fetched ${data.events.length} events (page ${page} of ${data.total_pages}, total: ${data.total})`)
    
    // If there are more pages, fetch them recursively
    if (data.next_rest_url && page < data.total_pages) {
      const nextPageEvents = await fetchVosdEvents(page + 1, perPage)
      return [...data.events, ...nextPageEvents]
    }
    
    return data.events
  } catch (error) {
    console.error(`Error fetching Voice of San Diego events:`, error)
    throw error
  }
}

/**
 * Generate a deterministic UUID from event data
 * CRITICAL: This ensures same event always gets same ID for image preservation
 */
const generateEventId = (title: string, date: string, source: string): string => {
  // Create a deterministic string from event properties
  const idString = `${source}|${title}|${date}`
  
  // Hash-based UUID generation (same as other fetch functions)
  let hash = 0
  for (let i = 0; i < idString.length; i++) {
    const char = idString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  const part1 = hex.slice(0, 8)
  const part2 = hex.slice(4, 8) || '0000'
  const part3 = `4${hex.slice(0, 3)}`
  const part4 = `${(hash & 0x0fff).toString(16).padStart(4, '0')}`
  const part5 = `${hex.slice(0, 4)}${hex.slice(4, 8) || '0000'}`
  
  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

/**
 * Transform Voice of San Diego event to database format
 * CRITICAL FIX: Now generates deterministic ID for image preservation
 */
const transformEvent = (event: VosdEvent) => {
  const description = stripHtml(event.description)
  const time = extractTime(event.start_date)
  const dateStr = event.start_date.split(' ')[0] // Extract just the date part (YYYY-MM-DD)
  
  // Format address
  let address = ''
  if (event.venue) {
    const parts = [
      event.venue.address,
      event.venue.city,
      'CA',
      event.venue.zip
    ].filter(Boolean)
    address = parts.join(', ')
  }
  
  // Get category from first category or default to 'Community'
  const category = event.categories && event.categories.length > 0 
    ? event.categories[0].name 
    : 'Community'
  
  // CRITICAL FIX: Generate deterministic ID from event properties
  const id = generateEventId(event.title, dateStr, SOURCE_NAME)
  
  return {
    id: id, // CRITICAL: Deterministic ID for image preservation
    title: event.title,
    description: description,
    date: dateStr,
    time: time,
    location: event.venue?.venue || '',
    address: address,
    category: category,
    source: SOURCE_NAME,
    upvotes: 0,
    downvotes: 0,
    created_at: new Date().toISOString()
  }
}

/**
 * Function to fetch Voice of San Diego events
 * Can be triggered manually or run on schedule
 */
export const handler: Handler = async (event, context) => {
  console.log('Starting Voice of San Diego event fetch...')
  
  try {
    // Fetch events from Voice of San Diego API
    const vosdEvents = await fetchVosdEvents()
    
    if (vosdEvents.length === 0) {
      console.log('No events found from Voice of San Diego')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No events found',
          source: SOURCE_NAME,
          totalEvents: 0
        })
      }
    }
    
    // Transform events to database format
    const dbEvents = vosdEvents.map(transformEvent)
    
    console.log(`Transformed ${dbEvents.length} events for database insertion`)
    
    // Filter by allowed zip codes (Chula Vista area ~20 min radius)
    const filteredEvents = filterEventsByZipCode(dbEvents, SOURCE_NAME)
    
    if (filteredEvents.length === 0) {
      console.log('No events remaining after zip code filtering')
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          success: true,
          message: 'No events in allowed geographic area',
          source: SOURCE_NAME,
          totalEvents: 0,
          filteredOut: dbEvents.length,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // BULLETPROOF: Use UPSERT instead of DELETE + INSERT
    // Database trigger automatically preserves images at DB level
    console.log(`[fetch-vosd-events] Using UPSERT to preserve images (bulletproof method)`)
    
    // Upsert events in batches - database trigger preserves images
    const batchSize = 100
    let upsertedCount = 0
    
    for (let i = 0; i < filteredEvents.length; i += batchSize) {
      const batch = filteredEvents.slice(i, i + batchSize)
      
      // Use upsert - database trigger will preserve existing images
      const { data, error: upsertError } = await supabase
        .from('calendar_events')
        .upsert(batch, {
          onConflict: 'title,date,source',
          ignoreDuplicates: false
        })
        .select()
      
      if (upsertError) {
        console.error(`[fetch-vosd-events] Error upserting batch ${i}-${i + batch.length}:`, upsertError)
        // Fallback: Try regular insert if upsert fails
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(batch)
          .select()
        
        if (insertError) {
          console.error(`[fetch-vosd-events] Fallback insert also failed:`, insertError)
          throw insertError
        } else {
          upsertedCount += data?.length || batch.length
          console.log(`[fetch-vosd-events] Fallback insert succeeded for batch ${i}-${i + batch.length}`)
        }
      } else {
        upsertedCount += data?.length || batch.length
        console.log(`[fetch-vosd-events] Upserted batch ${i}-${i + batch.length} (${upsertedCount} total)`)
        
        // Verify images were preserved
        const eventsWithImages = data?.filter(e => e.image_url && e.image_url !== '').length || 0
        if (eventsWithImages > 0) {
          console.log(`[fetch-vosd-events] ✅ ${eventsWithImages} events in this batch have images preserved`)
        }
      }
    }
    
    const insertedCount = upsertedCount
    
    console.log(`Successfully inserted ${insertedCount} Voice of San Diego events`)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Voice of San Diego events fetched and stored successfully',
        source: SOURCE_NAME,
        totalEvents: insertedCount,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error in Voice of San Diego fetch:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: SOURCE_NAME
      })
    }
  }
}

