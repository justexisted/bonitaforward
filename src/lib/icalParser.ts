// Import browser-compatible ical.js library
import ICAL from 'ical.js'

export interface ICalEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location?: string
  url?: string
  source: string
  allDay?: boolean
}

export interface ICalFeed {
  url: string
  source: string
  category: string
  enabled: boolean
}

// Known iCalendar feeds for Bonita/San Diego area
export const ICAL_FEEDS: ICalFeed[] = [
  {
    url: 'https://www.sandiego.gov/sites/default/files/calendar.ics',
    source: 'City of San Diego',
    category: 'Government',
    enabled: true
  },
  {
    url: 'https://www.sandiegolibrary.org/events.ics',
    source: 'San Diego Public Library',
    category: 'Education',
    enabled: true
  },
  {
    url: 'https://calendar.ucsd.edu/events.ics',
    source: 'UC San Diego',
    category: 'Education',
    enabled: true
  },
  {
    url: 'https://www.sandiegozoo.org/events.ics',
    source: 'San Diego Zoo',
    category: 'Entertainment',
    enabled: true
  },
  {
    url: 'https://www.balboapark.org/events.ics',
    source: 'Balboa Park',
    category: 'Culture',
    enabled: true
  }
]

/**
 * Parse iCalendar feed from URL
 */
export const parseICalFeed = async (feedUrl: string, source: string): Promise<ICalEvent[]> => {
  try {
    console.log(`Fetching iCalendar feed: ${feedUrl}`)
    
    // Fetch the iCalendar content
    const response = await fetch(feedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/calendar, application/calendar, text/plain',
        'User-Agent': 'Bonita Forward Calendar/1.0'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const icsContent = await response.text()
    
    if (!icsContent || icsContent.length < 100) {
      throw new Error('Invalid or empty iCalendar content')
    }

    // Parse the iCalendar content using ICAL.js
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
        const uid = event.uid || `ical-${source}-${index}`
        
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
          url: '', // URL not available in ICAL.js Event object
          source,
          allDay: startTime.isDate
        }

        events.push(icalEvent)
      } catch (eventError) {
        console.warn(`Error parsing iCalendar event ${index}:`, eventError)
        return
      }
    })

    console.log(`Successfully parsed ${events.length} events from ${source}`)
    return events
  } catch (error) {
    console.error(`Error parsing iCalendar feed ${feedUrl}:`, error)
    return []
  }
}

/**
 * Parse multiple iCalendar feeds
 */
export const parseMultipleICalFeeds = async (feeds: ICalFeed[]): Promise<ICalEvent[]> => {
  const enabledFeeds = feeds.filter(feed => feed.enabled)
  
  console.log(`Parsing ${enabledFeeds.length} iCalendar feeds...`)
  
  const feedPromises = enabledFeeds.map(feed => 
    parseICalFeed(feed.url, feed.source)
      .then(events => events.map(event => ({ ...event, category: feed.category })))
      .catch(error => {
        console.error(`Failed to parse feed ${feed.source}:`, error)
        return []
      })
  )

  const results = await Promise.allSettled(feedPromises)
  const allEvents = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => (result as PromiseFulfilledResult<ICalEvent[]>).value)

  // Remove duplicates based on title, date, and source
  const uniqueEvents = allEvents.filter((event, index, self) => 
    index === self.findIndex(e => 
      e.title === event.title && 
      e.startDate.getTime() === event.startDate.getTime() &&
      e.source === event.source
    )
  )

  console.log(`Total unique events from iCalendar feeds: ${uniqueEvents.length}`)
  return uniqueEvents
}

/**
 * Convert iCalendar event to calendar event format
 */
export const convertICalToCalendarEvent = (icalEvent: ICalEvent): any => {
  return {
    id: icalEvent.id,
    title: icalEvent.title,
    description: icalEvent.description,
    date: icalEvent.startDate.toISOString(),
    time: icalEvent.allDay ? undefined : icalEvent.startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    location: icalEvent.location,
    address: icalEvent.location, // Use location as address for now
    category: icalEvent.source.includes('City') ? 'Government' :
              icalEvent.source.includes('Library') ? 'Education' :
              icalEvent.source.includes('UC') ? 'Education' :
              icalEvent.source.includes('Zoo') ? 'Entertainment' :
              icalEvent.source.includes('Park') ? 'Recreation' :
              'Community',
    source: icalEvent.source,
    upvotes: 0,
    downvotes: 0,
    created_at: new Date().toISOString()
  }
}
