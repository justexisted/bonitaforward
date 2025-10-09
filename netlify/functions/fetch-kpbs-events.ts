import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import ICAL from 'ical.js'

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const SOURCE_NAME = 'KPBS'
const CATEGORY = 'Community'
const EVENTS_PAGE_URL = 'https://www.kpbs.org/events/'

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
 * Scrape KPBS events page to get list of event detail page URLs
 */
const scrapeKpbsEventLinks = async (): Promise<string[]> => {
  console.log(`Scraping KPBS events from: ${EVENTS_PAGE_URL}`)
  
  try {
    const response = await fetch(EVENTS_PAGE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bonita Forward Calendar Bot/1.0',
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Find all event links using the selector from the plan
    const eventLinks: string[] = []
    $('h3.event-story__title a').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        // Convert relative URLs to absolute
        const absoluteUrl = href.startsWith('http') 
          ? href 
          : `https://www.kpbs.org${href}`
        eventLinks.push(absoluteUrl)
      }
    })
    
    console.log(`Found ${eventLinks.length} event links on KPBS events page`)
    return eventLinks
    
  } catch (error) {
    console.error('Error scraping KPBS events page:', error)
    throw error
  }
}

/**
 * Fetch the ICS file URL from an individual event detail page
 */
const fetchIcsFileUrl = async (eventPageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(eventPageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bonita Forward Calendar Bot/1.0',
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.warn(`Failed to fetch event page ${eventPageUrl}: HTTP ${response.status}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Find the "Download ICS file" link
    const icsLink = $('a:contains("Download ICS file")').first()
    const href = icsLink.attr('href')
    
    if (!href) {
      console.warn(`No ICS download link found on ${eventPageUrl}`)
      return null
    }
    
    // Convert to absolute URL if necessary
    const absoluteUrl = href.startsWith('http') 
      ? href 
      : `https://www.kpbs.org${href}`
    
    console.log(`Found ICS file URL: ${absoluteUrl}`)
    return absoluteUrl
    
  } catch (error) {
    console.error(`Error fetching ICS URL from ${eventPageUrl}:`, error)
    return null
  }
}

/**
 * Process a single KPBS event: fetch ICS file and parse it
 */
const processKpbsEvent = async (eventPageUrl: string): Promise<ICalEvent[]> => {
  try {
    console.log(`Processing event page: ${eventPageUrl}`)
    
    // Get the ICS file URL from the event page
    const icsUrl = await fetchIcsFileUrl(eventPageUrl)
    if (!icsUrl) {
      console.warn(`Skipping ${eventPageUrl} - no ICS file found`)
      return []
    }
    
    // Fetch and parse the ICS content
    const icsContent = await fetchICalContent(icsUrl)
    const events = parseICalContent(icsContent, SOURCE_NAME, CATEGORY)
    
    return events
    
  } catch (error) {
    console.error(`Error processing KPBS event ${eventPageUrl}:`, error)
    return []
  }
}

/**
 * Main handler function
 */
export const handler: Handler = async (event, context) => {
  console.log('Starting KPBS event fetch...')
  
  try {
    // Step 1: Scrape the main events page to get all event URLs
    const eventUrls = await scrapeKpbsEventLinks()
    
    if (eventUrls.length === 0) {
      console.log('No event URLs found on KPBS events page')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No event URLs found',
          source: SOURCE_NAME,
          totalEvents: 0
        })
      }
    }
    
    console.log(`Processing ${eventUrls.length} KPBS event pages...`)
    
    // Step 2: Process all events concurrently (with individual error handling)
    const results = await Promise.allSettled(
      eventUrls.map(url => processKpbsEvent(url))
    )
    
    // Step 3: Flatten results and filter out failures
    const allEvents: ICalEvent[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value)
      } else {
        console.error(`Failed to process event ${eventUrls[index]}:`, result.reason)
      }
    })
    
    console.log(`Successfully parsed ${allEvents.length} events from ${eventUrls.length} pages`)
    
    if (allEvents.length === 0) {
      console.log('No valid events found')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No valid events found',
          source: SOURCE_NAME,
          processedPages: eventUrls.length,
          totalEvents: 0
        })
      }
    }
    
    // Step 4: Convert to database format
    const dbEvents = allEvents.map(convertToDatabaseEvent)
    
    // Step 5: Apply duplicate detection
    const uniqueEvents = dbEvents.filter((event, index, self) => {
      return index === self.findIndex(e => {
        // Exact match on title and source
        if (e.title === event.title && e.source === event.source && e.date === event.date) {
          return true
        }
        
        // Fuzzy match: similar title (case-insensitive, normalized) and date within 1 hour
        const normalizeTitle = (title: string) => title.toLowerCase().trim().replace(/[^\w\s]/g, '')
        const e1Title = normalizeTitle(e.title)
        const e2Title = normalizeTitle(event.title)
        
        // Check if titles are very similar (>80% match or one contains the other)
        const titleMatch = e1Title === e2Title || 
                          e1Title.includes(e2Title) || 
                          e2Title.includes(e1Title)
        
        // Check if dates are within 1 hour of each other
        const date1 = new Date(e.date).getTime()
        const date2 = new Date(event.date).getTime()
        const oneHour = 60 * 60 * 1000
        const dateMatch = Math.abs(date1 - date2) < oneHour
        
        return titleMatch && dateMatch
      })
    })
    
    console.log(`Found ${dbEvents.length} total events, ${uniqueEvents.length} unique events (removed ${dbEvents.length - uniqueEvents.length} duplicates)`)
    
    // Step 6: Delete existing KPBS events from database
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', SOURCE_NAME)
    
    if (deleteError) {
      console.error('Error deleting old KPBS events:', deleteError)
      throw deleteError
    }
    
    console.log(`Deleted old ${SOURCE_NAME} events`)
    
    // Step 7: Insert new events in batches
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
    
    console.log(`Successfully inserted ${insertedCount} KPBS events`)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true,
        message: 'KPBS events fetched and stored successfully',
        source: SOURCE_NAME,
        processedPages: eventUrls.length,
        totalEvents: insertedCount,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error in KPBS fetch:', error)
    
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

