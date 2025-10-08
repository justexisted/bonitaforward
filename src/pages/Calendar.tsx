import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { ChevronUp, ChevronDown, MapPin, Calendar, Clock } from 'lucide-react'
import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'

export type CalendarEvent = {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  address?: string
  category: string
  source: string
  upvotes: number
  downvotes: number
  created_at: string
  updated_at?: string
}

// RSS Feed parser for local event feeds
const parseRSSFeed = async (feedUrl: string, source: string): Promise<CalendarEvent[]> => {
  try {
    // Try multiple CORS proxy services for better reliability
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
      `https://cors-anywhere.herokuapp.com/${feedUrl}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`
    ]
    
    let rssText = ''
    let success = false
    
    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        
        if (!response.ok) {
          console.warn(`Proxy ${proxyUrl} failed with status: ${response.status}`)
          continue
        }
        
        const data = await response.json()
        rssText = data.contents || data
        
        // Check if we got valid content
        if (rssText && !rssText.includes('<html') && !rssText.includes('<!DOCTYPE')) {
          success = true
          break
        }
      } catch (proxyError) {
        console.warn(`Proxy ${proxyUrl} failed:`, proxyError)
        continue
      }
    }
    
    if (!success || !rssText) {
      console.warn(`All proxies failed for RSS feed: ${feedUrl}`)
      return []
    }
    
    // Parse RSS XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(rssText, 'text/xml')
    
    // Handle RSS parsing errors
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      console.warn(`RSS parsing error for ${feedUrl}:`, parseError.textContent)
      return []
    }
    
    const items = xmlDoc.querySelectorAll('item')
    const events: CalendarEvent[] = []
    
    items.forEach((item, index) => {
      try {
        const title = item.querySelector('title')?.textContent || 'Untitled Event'
        const description = item.querySelector('description')?.textContent || ''
        const pubDate = item.querySelector('pubDate')?.textContent
        // const link = item.querySelector('link')?.textContent || '' // Reserved for future use
        
        // Skip if title is empty or too short
        if (!title || title.length < 3) {
          return
        }
        
        // Try to extract date from various fields
        let eventDate = new Date()
        if (pubDate) {
          const parsedDate = new Date(pubDate)
          if (!isNaN(parsedDate.getTime())) {
            eventDate = parsedDate
          }
        }
        
        // Create event object
        const event: CalendarEvent = {
          id: `rss-${source}-${index}-${Date.now()}`,
          title: title.substring(0, 100), // Limit title length
          description: description.substring(0, 500), // Limit description length
          date: eventDate.toISOString(),
          time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          location: 'See event details',
          address: '',
          category: 'Community',
          source: source,
          upvotes: 0,
          downvotes: 0,
          created_at: new Date().toISOString(),
        }
        
        events.push(event)
      } catch (itemError) {
        console.warn(`Error parsing RSS item ${index} from ${feedUrl}:`, itemError)
      }
    })
    
    console.log(`Successfully parsed ${events.length} events from ${source}`)
    return events
  } catch (error) {
    console.warn(`Error fetching RSS feed ${feedUrl}:`, error)
    return []
  }
}

// RSS feeds disabled - all CORS proxies are blocked or unreliable
// Focus on database-driven events for reliable calendar management
const RSS_FEEDS: Array<{url: string, source: string, category: string}> = []

// Export function to fetch events for use in other components
export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // Load events from database
    const { data: dbEvents, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })
    
    if (dbError) {
      console.warn('Database events error:', dbError)
    }
    
    // Fetch events from RSS feeds (disabled - all proxies failing)
    const rssPromises = RSS_FEEDS.map(feed => 
      parseRSSFeed(feed.url, feed.source).then(events => 
        events.map(event => ({
          ...event,
          category: feed.category
        }))
      )
    )
    
    const rssEventsArrays = await Promise.allSettled(rssPromises)
    const rssEvents = rssEventsArrays
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<CalendarEvent[]>).value)
    
    // Load events from iCalendar feeds
    console.log('Fetching events from iCalendar feeds...')
    const icalEvents = await parseMultipleICalFeeds(ICAL_FEEDS)
    const calendarEvents = icalEvents.map(convertICalToCalendarEvent)
    
    // Combine database events, RSS events, and iCalendar events
    const allEvents = [
      ...(dbEvents || []),
      ...rssEvents,
      ...calendarEvents
    ]
    
    // Sort by date
    return allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } catch (err) {
    console.error('Error loading events:', err)
    return []
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()


  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const allEvents = await fetchCalendarEvents()
        setEvents(allEvents)
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  // Vote on an event
  const voteOnEvent = async (eventId: string, voteType: 'up' | 'down') => {
    if (!auth.isAuthed) {
      alert('Please sign in to vote on events')
      return
    }

    try {
      // Check if user already voted on this event
      const { data: existingVote } = await supabase
        .from('event_votes')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', auth.userId)
        .single()

      if (existingVote) {
        // Update existing vote
        if (existingVote.vote_type === voteType) {
          // Same vote type - remove vote
          await supabase
            .from('event_votes')
            .delete()
            .eq('id', existingVote.id)
        } else {
          // Different vote type - update
          await supabase
            .from('event_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id)
        }
      } else {
        // Create new vote
        await supabase
          .from('event_votes')
          .insert({
            event_id: eventId,
            user_id: auth.userId,
            vote_type: voteType
          })
      }

      // Refresh events to show updated vote counts
      const updatedEvents = events.map(event => {
        if (event.id === eventId) {
          if (existingVote) {
            if (existingVote.vote_type === voteType) {
              // Removing vote
              return {
                ...event,
                upvotes: voteType === 'up' ? event.upvotes - 1 : event.upvotes,
                downvotes: voteType === 'down' ? event.downvotes - 1 : event.downvotes
              }
            } else {
              // Changing vote
              return {
                ...event,
                upvotes: voteType === 'up' ? event.upvotes + 1 : event.upvotes - 1,
                downvotes: voteType === 'down' ? event.downvotes + 1 : event.downvotes - 1
              }
            }
          } else {
            // Adding new vote
            return {
              ...event,
              upvotes: voteType === 'up' ? event.upvotes + 1 : event.upvotes,
              downvotes: voteType === 'down' ? event.downvotes + 1 : event.downvotes
            }
          }
        }
        return event
      })

      setEvents(updatedEvents)
    } catch (error) {
      console.error('Error voting on event:', error)
      alert('Failed to vote on event')
    }
  }

  // Separate recurring/annual events from regular events
  const recurringEvents = events.filter(e => e.source === 'Recurring' || e.category === 'Recurring')
  const regularEvents = events.filter(e => e.source !== 'Recurring' && e.category !== 'Recurring')
  
  // Sort regular events by vote score (upvotes - downvotes) and date
  const sortedEvents = [...regularEvents].sort((a, b) => {
    const scoreA = a.upvotes - a.downvotes
    const scoreB = b.upvotes - b.downvotes
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA // Higher score first
    }
    
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
  
  // Sort recurring events by title
  const sortedRecurringEvents = [...recurringEvents].sort((a, b) => a.title.localeCompare(b.title))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight font-display mb-4">
            Bonita Calendar
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover local events in Bonita (91902). Currently featuring community events with plans to integrate additional sources. Help your community decide what matters most.
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading Bonita events...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Regular Events Section */}
            {sortedEvents.length > 0 && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight font-display mb-6">
                  Upcoming Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {sortedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-neutral-900 mb-2 line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="flex items-center text-sm text-neutral-500 mb-2">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(event.date)}
                          </div>
                          {event.time && (
                            <div className="flex items-center text-sm text-neutral-500 mb-2">
                              <Clock className="w-4 h-4 mr-2" />
                              {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-start text-sm text-neutral-500 mb-3">
                              <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-neutral-600 mb-4 line-clamp-3">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => voteOnEvent(event.id, 'up')}
                            className="flex items-center space-x-1 px-3 py-1 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                            disabled={!auth.isAuthed}
                          >
                            <ChevronUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">{event.upvotes}</span>
                          </button>
                          <button
                            onClick={() => voteOnEvent(event.id, 'down')}
                            className="flex items-center space-x-1 px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                            disabled={!auth.isAuthed}
                          >
                            <ChevronDown className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-600">{event.downvotes}</span>
                          </button>
                        </div>
                        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                          {event.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Recurring/Annual Events Section */}
            {sortedRecurringEvents.length > 0 && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight font-display mb-4">
                  Annual & Recurring Events
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  These events happen regularly throughout the year. Check with organizers for specific dates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedRecurringEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-neutral-900 mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center text-sm text-neutral-500 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(event.date)}
                      </div>
                      {event.time && (
                        <div className="flex items-center text-sm text-neutral-500 mb-2">
                          <Clock className="w-4 h-4 mr-2" />
                          {event.time}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start text-sm text-neutral-500 mb-3">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => voteOnEvent(event.id, 'up')}
                        className="flex items-center space-x-1 px-3 py-1 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                        disabled={!auth.isAuthed}
                      >
                        <ChevronUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">{event.upvotes}</span>
                      </button>
                      <button
                        onClick={() => voteOnEvent(event.id, 'down')}
                        className="flex items-center space-x-1 px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                        disabled={!auth.isAuthed}
                      >
                        <ChevronDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">{event.downvotes}</span>
                      </button>
                    </div>
                    <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                      {event.source}
                    </span>
                  </div>
                </div>
              ))}
                </div>
              </>
            )}

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No events found for Bonita (91902) at this time.</p>
                <p className="text-sm text-neutral-500 mt-2">Be the first to add an event to our community calendar!</p>
              </div>
            )}
          </>
        )}

        {/* Voting Explanation */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3 font-display">
            How Voting Works
          </h2>
          <div className="text-blue-800 space-y-2">
            <p>
              <strong>Upvote events</strong> you want to see more of in your community. 
              Events with higher scores appear first and get better visibility.
            </p>
            <p>
              <strong>Downvote events</strong> that don't interest you or your neighbors. 
              This helps surface the most relevant events for Bonita residents.
            </p>
            <p>
              <strong>Priority placement:</strong> Events are sorted by vote score (upvotes - downvotes), 
              so the most popular community events always appear at the top.
            </p>
            {!auth.isAuthed && (
              <p className="text-blue-600 font-medium mt-3">
                Sign in to vote and help shape Bonita's event calendar!
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
