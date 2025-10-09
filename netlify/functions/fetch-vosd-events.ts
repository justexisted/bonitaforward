import { Handler, schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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
  const startDate = now.toISOString().split('T')[0] // Today
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0] // 1 year from now
  
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
 * Transform Voice of San Diego event to database format
 */
const transformEvent = (event: VosdEvent) => {
  const description = stripHtml(event.description)
  const time = extractTime(event.start_date)
  
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
  
  return {
    title: event.title,
    description: description,
    date: event.start_date.split(' ')[0], // Extract just the date part (YYYY-MM-DD)
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
 * Scheduled function to fetch Voice of San Diego events
 */
const scheduledHandler: Handler = async (event, context) => {
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
    
    // Delete existing Voice of San Diego events to avoid duplicates
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', SOURCE_NAME)
    
    if (deleteError) {
      console.error('Error deleting old events:', deleteError)
      throw deleteError
    }
    
    console.log(`Deleted old ${SOURCE_NAME} events`)
    
    // Insert new events in batches of 100 to avoid payload size limits
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < dbEvents.length; i += batchSize) {
      const batch = dbEvents.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        throw error
      }
      
      insertedCount += data?.length || 0
      console.log(`Inserted batch ${i / batchSize + 1}: ${data?.length} events`)
    }
    
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

// Export both scheduled and manual handlers
export const handler = scheduledHandler

// For scheduled runs
export { scheduledHandler as schedule }

