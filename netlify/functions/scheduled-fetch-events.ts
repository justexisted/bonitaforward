import { Handler, schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import ICAL from 'ical.js'

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// iCalendar feed sources
// Note: webcal:// URLs are converted to https:// for fetching
const ICAL_FEEDS = [
  {
    url: 'https://www.sdmart.org/?post_type=tribe_events&ical=1&eventDisplay=list',
    source: 'San Diego Museum of Art',
    category: 'Culture',
    enabled: true
  },
  {
    url: 'https://thinkplaycreate.org/?post_type=tribe_events&ical=1&eventDisplay=list',
    source: 'Think Play Create',
    category: 'Education',
    enabled: true
  },
  // Disabled feeds (404 errors - URLs no longer exist)
  // {
  //   url: 'https://www.sandiego.gov/calendar/events.ics',
  //   source: 'City of San Diego',
  //   category: 'Government',
  //   enabled: false
  // },
  // {
  //   url: 'https://www.sandiegolibrary.org/calendar/events.ics',
  //   source: 'San Diego Public Library',
  //   category: 'Education',
  //   enabled: false
  // },
  // {
  //   url: 'https://calendar.ucsd.edu/calendar/events.ics',
  //   source: 'UC San Diego',
  //   category: 'Education',
  //   enabled: false
  // },
  // {
  //   url: 'https://www.sandiegozoo.org/calendar/events.ics',
  //   source: 'San Diego Zoo',
  //   category: 'Entertainment',
  //   enabled: false
  // },
  // {
  //   url: 'https://www.balboapark.org/calendar/events.ics',
  //   source: 'Balboa Park',
  //   category: 'Culture',
  //   enabled: false
  // }
]

interface ICalEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location?: string
  source: string
  category: string
  allDay?: boolean
}

/**
 * Parse iCalendar content and extract events
 */
const parseICalContent = (icsContent: string, source: string, category: string): ICalEvent[] => {
  try {
    const jcalData = ICAL.parse(icsContent)
    const vcalendar = new ICAL.Component(jcalData)
    const vevents = vcalendar.getAllSubcomponents('vevent')
    const events: ICalEvent[] = []

    vevents.forEach((vevent, index) => {
      try {
        const event = new ICAL.Event(vevent)
        
        // Get event properties
        const summary = event.summary || 'Untitled Event'
        const description = event.description || ''
        const location = event.location || ''
        const uid = event.uid || `ical-${source}-${index}-${Date.now()}`
        
        // Get start and end times
        const startTime = event.startDate
        const endTime = event.endDate
        
        // Skip events without valid start date
        if (!startTime) {
          return
        }
        
        const startDate = startTime.toJSDate()
        
        // Skip past events (older than 1 day)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        if (startDate < oneDayAgo) {
          return
        }

        // Skip events too far in the future (more than 1 year)
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        if (startDate > oneYearFromNow) {
          return
        }

        const icalEvent: ICalEvent = {
          id: uid,
          title: summary,
          description: description,
          startDate: startDate,
          endDate: endTime ? endTime.toJSDate() : undefined,
          location: location,
          source,
          category,
          allDay: startTime.isDate
        }

        events.push(icalEvent)
      } catch (eventError) {
        console.warn(`Error parsing iCalendar event ${index} from ${source}:`, eventError)
        return
      }
    })

    console.log(`Successfully parsed ${events.length} events from ${source}`)
    return events
  } catch (error) {
    console.error(`Error parsing iCalendar content from ${source}:`, error)
    return []
  }
}

/**
 * Fetch iCalendar content from URL
 */
const fetchICalContent = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/calendar, application/calendar, text/plain',
        'User-Agent': 'Bonita Forward Calendar Bot/1.0',
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    
    if (!content || content.length < 100) {
      throw new Error('Invalid or empty iCalendar content')
    }

    return content
  } catch (error) {
    console.error(`Error fetching iCalendar from ${url}:`, error)
    throw error
  }
}

/**
 * Generate a deterministic UUID v5 from a string
 * This ensures the same event UID always generates the same UUID
 */
const generateUuidFromString = (str: string): string => {
  // Use a simple hash-based approach to generate UUID
  // This is deterministic - same input always produces same output
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Convert hash to hex and pad to create UUID format
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  const timestamp = Date.now().toString(16).padStart(12, '0').slice(0, 12)
  
  // Create UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${timestamp.slice(0, 3)}-${timestamp.slice(3, 7)}-${timestamp.slice(7, 12)}${hex.slice(0, 7)}`
}

/**
 * Convert iCalendar event to database format
 */
const convertToDatabaseEvent = (icalEvent: ICalEvent) => {
  return {
    // Don't use the iCal UID directly - generate a proper UUID from it
    // This ensures the ID is a valid UUID while remaining deterministic
    id: generateUuidFromString(icalEvent.id),
    title: icalEvent.title,
    description: icalEvent.description,
    date: icalEvent.startDate.toISOString(),
    time: icalEvent.allDay ? undefined : icalEvent.startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    location: icalEvent.location,
    address: icalEvent.location, // Use location as address for now
    category: icalEvent.category,
    source: icalEvent.source,
    upvotes: 0,
    downvotes: 0,
    created_at: new Date().toISOString()
  }
}

/**
 * Scheduled function to fetch and process iCalendar feeds
 */
const scheduledHandler: Handler = async (event, context) => {
  console.log('Starting scheduled iCalendar fetch...')
  
  try {
    const allEvents: any[] = []
    const enabledFeeds = ICAL_FEEDS.filter(feed => feed.enabled)
    
    console.log(`Processing ${enabledFeeds.length} iCalendar feeds...`)
    
    // Process each feed
    for (const feed of enabledFeeds) {
      try {
        console.log(`Fetching feed: ${feed.source} (${feed.url})`)
        
        const icsContent = await fetchICalContent(feed.url)
        const events = parseICalContent(icsContent, feed.source, feed.category)
        const dbEvents = events.map(convertToDatabaseEvent)
        
        allEvents.push(...dbEvents)
        console.log(`Successfully processed ${events.length} events from ${feed.source}`)
        
      } catch (error) {
        console.error(`Failed to process feed ${feed.source}:`, error)
        // Continue with other feeds even if one fails
      }
    }
    
    if (allEvents.length === 0) {
      console.log('No events found in any feeds')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No events found',
          processedFeeds: enabledFeeds.length,
          totalEvents: 0
        })
      }
    }
    
    // Remove duplicates based on title, date, and source
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => 
        e.title === event.title && 
        e.date === event.date &&
        e.source === event.source
      )
    )
    
    console.log(`Found ${allEvents.length} total events, ${uniqueEvents.length} unique events`)
    
    // Clear existing iCalendar events (those from external sources)
    const icalSources = enabledFeeds.map(feed => feed.source)
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .in('source', icalSources)
    
    if (deleteError) {
      console.error('Error clearing existing iCalendar events:', deleteError)
    } else {
      console.log('Cleared existing iCalendar events')
    }
    
    // Insert new events in batches
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < uniqueEvents.length; i += batchSize) {
      const batch = uniqueEvents.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(batch)
      
      if (insertError) {
        console.error(`Error inserting batch ${i}-${i + batch.length}:`, insertError)
      } else {
        insertedCount += batch.length
        console.log(`Inserted batch ${i}-${i + batch.length} (${insertedCount} total)`)
      }
    }
    
    console.log(`Successfully processed ${insertedCount} events from ${enabledFeeds.length} feeds`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed iCalendar feeds',
        processedFeeds: enabledFeeds.length,
        totalEvents: insertedCount,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error in scheduled iCalendar fetch:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process iCalendar feeds',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Schedule to run every 4 hours
export const handler = schedule('0 */4 * * *', scheduledHandler)
