import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import ICAL from 'ical.js'
import { filterEventsByZipCode } from './utils/zipCodeFilter'
import { removeDuplicateEvents } from './utils/eventDuplicateDetection'

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
 * Extract time from description text
 * Handles: "10:00 a.m.", "10:30 and 11:00 am", "10:30-11:45 a.m.", etc.
 */
const extractTimeFromDescription = (description: string, eventTitle?: string): string | null => {
  if (!description) {
    console.log(`[Time Extract] No description provided`)
    return null
  }
  
  console.log(`[Time Extract] ========================================`)
  console.log(`[Time Extract] Event: ${eventTitle || 'Unknown'}`)
  console.log(`[Time Extract] Description (first 200 chars): "${description.substring(0, 200)}"`)
  
  // Extract first 500 chars (times are usually at the beginning)
  const text = description.substring(0, 500)
  
  // Comprehensive time patterns - handle ranges and multiple times
  const timePatterns = [
    // "10:00 a.m." or "10:00 AM" or "10:00am" or "10:00 a.m" (with or without dots/spaces)
    /(\d{1,2}):(\d{2})\s*([ap]\.?\s*m\.?)/gi,
    // "10 a.m." or "10 AM" or "10am" (hour without minutes)
    /(\d{1,2})\s*([ap]\.?\s*m\.?)/gi,
  ]
  
  const times: { time: string, index: number, hours24: number, minutes: number, original: string }[] = []
  
  for (let i = 0; i < timePatterns.length; i++) {
    const pattern = timePatterns[i]
    let match
    const regex = new RegExp(pattern)
    
    console.log(`[Time Extract] Testing pattern ${i + 1}: ${pattern}`)
    
    while ((match = regex.exec(text)) !== null) {
      const hours = parseInt(match[1])
      const minutes = parseInt(match[2] || '0')
      const ampmRaw = match[match.length - 1]
      const ampm = ampmRaw.replace(/[\.\s]/g, '').toUpperCase()
      
      console.log(`[Time Extract]   - Found match: "${match[0]}" at index ${match.index}`)
      console.log(`[Time Extract]     Hours: ${hours}, Minutes: ${minutes}, AM/PM: ${ampm}`)
      
      // Skip if hours are invalid (e.g., matched a date like "October 9")
      if (hours < 1 || hours > 12) {
        console.log(`[Time Extract]     ✗ SKIPPED: Invalid hour (${hours})`)
        continue
      }
      
      // Convert to 24-hour format
      let hours24 = hours
      if (ampm.startsWith('P') && hours !== 12) {
        hours24 = hours + 12
      } else if (ampm.startsWith('A') && hours === 12) {
        hours24 = 0
      }
      
      const timeStr = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      console.log(`[Time Extract]     ✓ Converted to 24-hour: ${timeStr}`)
      
      times.push({ 
        time: timeStr, 
        index: match.index,
        hours24: hours24,
        minutes: minutes,
        original: match[0]
      })
    }
  }
  
  // Return the earliest time found (sorted by actual time value, not text position)
  if (times.length > 0) {
    // Sort by actual time value (hours then minutes)
    times.sort((a, b) => {
      if (a.hours24 !== b.hours24) {
        return a.hours24 - b.hours24
      }
      return a.minutes - b.minutes
    })
    console.log(`[Time Extract] FOUND ${times.length} total times:`)
    times.forEach((t, i) => {
      console.log(`[Time Extract]   ${i + 1}. "${t.original}" → ${t.time} (${t.hours24}:${t.minutes.toString().padStart(2, '0')}) at text position ${t.index}`)
    })
    console.log(`[Time Extract] ✓ USING EARLIEST TIME: ${times[0].time} from "${times[0].original}"`)
    return times[0].time
  }
  
  console.log(`[Time Extract] ✗ No valid times found in description`)
  return null
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
        
        let startDate = startTime.toJSDate()
        const originalTime = startDate.toISOString()
        
        console.log(`[iCal Parse] Event "${summary}"`)
        console.log(`[iCal Parse]   Original iCal time: ${originalTime}`)
        console.log(`[iCal Parse]   Is all-day in iCal: ${startTime.isDate}`)
        
        // ALWAYS try to extract time from description FIRST (description is more accurate than iCal times)
        const extractedTime = extractTimeFromDescription(description, summary)
        if (extractedTime) {
          console.log(`[iCal Parse]   ✓ FOUND time in description: ${extractedTime}`)
          const [hours, minutes] = extractedTime.split(':')
          const dateWithTime = new Date(startDate)
          dateWithTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          startDate = dateWithTime
          console.log(`[iCal Parse]   ✓ USING description time, updated to: ${startDate.toISOString()}`)
        } else {
          console.log(`[iCal Parse]   ✗ No time in description, using iCal time: ${originalTime}`)
        }
        
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
          allDay: !extractedTime // If we extracted a time from description, it's not all-day
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
    
    // Check if content is valid iCalendar format
    if (!content.trim().startsWith('BEGIN:VCALENDAR')) {
      // Check if it's HTML
      if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
        throw new Error('Feed returned HTML instead of iCalendar data - URL may be incorrect or feed may be unavailable')
      }
      throw new Error('Invalid iCalendar format - content does not start with BEGIN:VCALENDAR')
    }
    
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
  console.log(`[DB Convert] ========================================`)
  console.log(`[DB Convert] Converting event: "${icalEvent.title}"`)
  console.log(`[DB Convert] Start date: ${icalEvent.startDate.toISOString()}`)
  console.log(`[DB Convert] All-day flag: ${icalEvent.allDay}`)
  
  // Extract time from startDate in consistent 24-hour format
  let timeStr: string | undefined
  
  if (!icalEvent.allDay) {
    const hours = icalEvent.startDate.getHours()
    const minutes = icalEvent.startDate.getMinutes()
    timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    console.log(`[DB Convert] ✓ Using time from startDate: ${timeStr}`)
  } else {
    console.log(`[DB Convert] Event is all-day, trying to extract from description...`)
    // For all-day events, try to extract time from description as fallback
    const extractedTime = extractTimeFromDescription(icalEvent.description || '', icalEvent.title)
    if (extractedTime) {
      timeStr = extractedTime
      console.log(`[DB Convert] ✓ Using extracted time: ${timeStr}`)
    } else {
      console.log(`[DB Convert] ✗ No time extracted, will be undefined`)
    }
  }
  
  console.log(`[DB Convert] FINAL TIME VALUE: ${timeStr || 'undefined'}`)
  
  return {
    // Don't use the iCal UID directly - generate a proper UUID from it
    // This ensures the ID is a valid UUID while remaining deterministic
    id: generateUuidFromString(icalEvent.id),
    title: icalEvent.title,
    description: icalEvent.description,
    date: icalEvent.startDate.toISOString(),
    time: timeStr, // Use extracted 24-hour format time
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
 * Manual trigger for fetching iCalendar events
 * GET /manual-fetch-events
 */
export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  console.log('Starting manual iCalendar fetch...')
  
  try {
    const allEvents: any[] = []
    const enabledFeeds = ICAL_FEEDS.filter(feed => feed.enabled)
    const results: any[] = []
    
    console.log(`Processing ${enabledFeeds.length} iCalendar feeds...`)
    
    // Process each feed
    for (const feed of enabledFeeds) {
      try {
        console.log(`Fetching feed: ${feed.source} (${feed.url})`)
        
        const icsContent = await fetchICalContent(feed.url)
        const events = parseICalContent(icsContent, feed.source, feed.category)
        const dbEvents = events.map(convertToDatabaseEvent)
        
        allEvents.push(...dbEvents)
        results.push({
          source: feed.source,
          url: feed.url,
          success: true,
          eventCount: events.length
        })
        
        console.log(`Successfully processed ${events.length} events from ${feed.source}`)
        
      } catch (error) {
        console.error(`Failed to process feed ${feed.source}:`, error)
        results.push({
          source: feed.source,
          url: feed.url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    if (allEvents.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'No events found in any feeds',
          results,
          processedFeeds: enabledFeeds.length,
          totalEvents: 0
        })
      }
    }
    
    // Enhanced duplicate detection using shared utility
    const uniqueEvents = removeDuplicateEvents(allEvents, 'iCalendar Feeds')
    
    // Filter by allowed zip codes (Chula Vista area ~20 min radius)
    const filteredEvents = filterEventsByZipCode(uniqueEvents, 'iCalendar Feeds')
    
    if (filteredEvents.length === 0) {
      console.log('No events remaining after zip code filtering')
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No events in allowed geographic area',
          processedFeeds: results.length,
          totalEvents: 0,
          filteredOut: uniqueEvents.length,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // Clear existing iCalendar events (those from external sources)
    const icalSources = enabledFeeds.map(feed => feed.source)
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .in('source', icalSources)
    
    if (deleteError) {
      console.error('Error clearing existing iCalendar events:', deleteError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to clear existing events',
          message: deleteError.message,
          results
        })
      }
    }
    
    console.log('Cleared existing iCalendar events')
    
    // Before inserting, check for and remove any existing duplicates in database
    // This handles cases where events might have been added from different sources
    console.log('Checking for existing duplicates in database...')
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('id, title, date, source')
    
    if (existingEvents && existingEvents.length > 0) {
      const duplicateIds: string[] = []
      
      for (const newEvent of filteredEvents) {
        for (const existing of existingEvents) {
          const normalizeTitle = (title: string) => title.toLowerCase().trim().replace(/[^\w\s]/g, '')
          const title1 = normalizeTitle(newEvent.title)
          const title2 = normalizeTitle(existing.title)
          
          const titleMatch = title1 === title2 || title1.includes(title2) || title2.includes(title1)
          const date1 = new Date(newEvent.date).getTime()
          const date2 = new Date(existing.date).getTime()
          const dateMatch = Math.abs(date1 - date2) < 60 * 60 * 1000 // Within 1 hour
          
          if (titleMatch && dateMatch && newEvent.source !== existing.source) {
            duplicateIds.push(existing.id)
          }
        }
      }
      
      if (duplicateIds.length > 0) {
        console.log(`Removing ${duplicateIds.length} duplicate events from database`)
        await supabase
          .from('calendar_events')
          .delete()
          .in('id', duplicateIds)
      }
    }
    
    // Insert new events
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(filteredEvents)
    
    if (insertError) {
      console.error('Error inserting new events:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to insert new events',
          message: insertError.message,
          results
        })
      }
    }
    
    console.log(`Successfully processed ${filteredEvents.length} events from ${enabledFeeds.length} feeds`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Successfully processed iCalendar feeds',
        results,
        processedFeeds: enabledFeeds.length,
        totalEvents: uniqueEvents.length,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error in manual iCalendar fetch:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to process iCalendar feeds',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
