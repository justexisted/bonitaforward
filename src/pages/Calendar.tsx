import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { ChevronUp, ChevronDown, MapPin, Calendar, Clock, X } from 'lucide-react'
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
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

  // Get today's start of day for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Helper function to categorize events
  const categorizeEvent = (event: CalendarEvent): string => {
    const title = event.title.toLowerCase()
    const desc = (event.description || '').toLowerCase()
    const category = event.category.toLowerCase()
    
    // Museum events
    if (title.includes('museum') || desc.includes('museum') || category.includes('museum')) {
      return 'museum'
    }
    
    // Art events (film, music, art)
    if (
      title.includes('art') || title.includes('film') || title.includes('music') || 
      title.includes('concert') || title.includes('gallery') || title.includes('theater') ||
      title.includes('theatre') || title.includes('performance') || title.includes('cinema') ||
      desc.includes('art') || desc.includes('film') || desc.includes('music') ||
      category.includes('art') || category.includes('culture') || category.includes('music')
    ) {
      return 'art'
    }
    
    // Kids events
    if (
      title.includes('kids') || title.includes('children') || title.includes('family') ||
      title.includes('storytime') || title.includes('playground') ||
      desc.includes('kids') || desc.includes('children') || desc.includes('family') ||
      category.includes('kids') || category.includes('family') || category.includes('children')
    ) {
      return 'kids'
    }
    
    // Fundraiser events
    if (
      title.includes('fundrais') || title.includes('donation') || title.includes('charity') ||
      title.includes('benefit') || desc.includes('fundrais') || desc.includes('charity')
    ) {
      return 'fundraiser'
    }
    
    return 'other'
  }
  
  // Separate recurring/annual events from regular events
  const recurringEvents = events.filter(e => e.source === 'Recurring' || e.category === 'Recurring')
  const regularEvents = events.filter(e => e.source !== 'Recurring' && e.category !== 'Recurring')
  
  // Filter by date (past vs. upcoming)
  const upcomingEvents = regularEvents.filter(e => {
    const eventDate = new Date(e.date)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate >= today
  })
  
  const pastEvents = regularEvents.filter(e => {
    const eventDate = new Date(e.date)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate < today
  })
  
  // Filter by category
  const filterEventsByCategory = (events: CalendarEvent[]) => {
    if (categoryFilter === 'all') return events
    return events.filter(e => categorizeEvent(e) === categoryFilter)
  }
  
  // Apply category filter and sort
  const filteredUpcomingEvents = filterEventsByCategory(upcomingEvents).sort((a, b) => {
    // Sort by date first (earliest first)
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    
    if (dateA !== dateB) {
      return dateA - dateB
    }
    
    // Then by vote score
    const scoreA = a.upvotes - a.downvotes
    const scoreB = b.upvotes - b.downvotes
    return scoreB - scoreA
  })
  
  const filteredPastEvents = filterEventsByCategory(pastEvents).sort((a, b) => {
    // Sort past events by date (most recent first)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  // Sort recurring events by title
  const sortedRecurringEvents = [...recurringEvents].sort((a, b) => a.title.localeCompare(b.title))
  
  // Determine which events to display
  const displayEvents = showPastEvents 
    ? [...filteredUpcomingEvents, ...filteredPastEvents]
    : filteredUpcomingEvents

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
            {/* Info Card */}
            <div className="mb-6 md:mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 md:p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">Welcome to Bonita's Event Calendar</h3>
                  <p className="text-sm md:text-base text-blue-800">
                    Click on any event card to see full details. Use the category filters below to find events that interest you. 
                    All events are within 20 minutes of Chula Vista and have been curated for the Bonita community.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setCategoryFilter('museum')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'museum'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Museum
                </button>
                <button
                  onClick={() => setCategoryFilter('art')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'art'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Art & Culture
                </button>
                <button
                  onClick={() => setCategoryFilter('kids')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'kids'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Kids & Family
                </button>
                <button
                  onClick={() => setCategoryFilter('fundraiser')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'fundraiser'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Fundraisers
                </button>
                <button
                  onClick={() => setCategoryFilter('other')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'other'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Regular Events Section */}
            {displayEvents.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight font-display">
                    {showPastEvents ? 'All Events' : 'Upcoming Events'}
                  </h2>
                  {pastEvents.length > 0 && (
                    <button
                      onClick={() => setShowPastEvents(!showPastEvents)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                    >
                      <span>{showPastEvents ? 'Hide' : 'Show'} Past Events</span>
                      {showPastEvents ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                  {displayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer text-left hover:border-blue-200 group"
                    >
                      <div className="flex items-start justify-between mb-3 md:mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base md:text-lg text-neutral-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {event.title}
                          </h3>
                          <div className="flex items-center text-xs md:text-sm text-neutral-500 mb-2">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                            <span className="text-xs md:text-sm">{formatDate(event.date)}</span>
                          </div>
                          {event.time && (
                            <div className="flex items-center text-xs md:text-sm text-neutral-500 mb-2">
                              <Clock className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                              {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-start text-xs md:text-sm text-neutral-500 mb-2 md:mb-3">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs md:text-sm text-neutral-600 mb-3 md:mb-4 line-clamp-3">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 md:space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              voteOnEvent(event.id, 'up')
                            }}
                            className="flex items-center space-x-1 px-2 md:px-3 py-1 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                            disabled={!auth.isAuthed}
                          >
                            <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span className="text-xs md:text-sm font-medium text-green-600">{event.upvotes}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              voteOnEvent(event.id, 'down')
                            }}
                            className="flex items-center space-x-1 px-2 md:px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                            disabled={!auth.isAuthed}
                          >
                            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                            <span className="text-xs md:text-sm font-medium text-red-600">{event.downvotes}</span>
                          </button>
                        </div>
                        <span className="text-[10px] md:text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                          {event.source}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            
            {/* Recurring/Annual Events Section */}
            {sortedRecurringEvents.length > 0 && (
              <>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight font-display mb-3 md:mb-4">
                  Annual & Recurring Events
                </h2>
                <p className="text-xs md:text-sm text-neutral-600 mb-4 md:mb-6">
                  These events happen regularly throughout the year. Check with organizers for specific dates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {sortedRecurringEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer text-left hover:border-blue-200 group"
                >
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base md:text-lg text-neutral-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex items-center text-xs md:text-sm text-neutral-500 mb-2">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                        <span className="text-xs md:text-sm">{formatDate(event.date)}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center text-xs md:text-sm text-neutral-500 mb-2">
                          <Clock className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                          {event.time}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start text-xs md:text-sm text-neutral-500 mb-2 md:mb-3">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs md:text-sm text-neutral-600 mb-3 md:mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          voteOnEvent(event.id, 'up')
                        }}
                        className="flex items-center space-x-1 px-2 md:px-3 py-1 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                        disabled={!auth.isAuthed}
                      >
                        <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                        <span className="text-xs md:text-sm font-medium text-green-600">{event.upvotes}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          voteOnEvent(event.id, 'down')
                        }}
                        className="flex items-center space-x-1 px-2 md:px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                        disabled={!auth.isAuthed}
                      >
                        <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                        <span className="text-xs md:text-sm font-medium text-red-600">{event.downvotes}</span>
                      </button>
                    </div>
                    <span className="text-[10px] md:text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                      {event.source}
                    </span>
                  </div>
                </button>
              ))}
                </div>
              </>
            )}

            {displayEvents.length === 0 && events.length > 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">
                  {categoryFilter !== 'all' 
                    ? `No ${categoryFilter} events found.`
                    : showPastEvents
                      ? 'No events found.'
                      : 'No upcoming events found.'}
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  Try selecting a different category or {!showPastEvents && 'show past events.'}
                </p>
              </div>
            )}
            
            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No events found for Bonita area at this time.</p>
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

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient background matching landing page */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 md:p-6 rounded-t-2xl relative">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 md:top-4 md:right-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full p-2 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 pr-8 md:pr-10">
                {selectedEvent.title}
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {selectedEvent.source && (
                  <span className="inline-block bg-blue-800 text-white text-xs px-3 py-1 rounded-full border border-blue-700">
                    {selectedEvent.source}
                  </span>
                )}
                {selectedEvent.category && (
                  <span className="inline-block bg-blue-800 text-white text-xs px-3 py-1 rounded-full border border-blue-700">
                    {selectedEvent.category}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Date & Time */}
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-start">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm text-neutral-500 mb-1">Date</p>
                    <p className="text-sm md:text-base font-medium text-neutral-900">{formatDate(selectedEvent.date)}</p>
                  </div>
                </div>
                
                {selectedEvent.time && (
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs md:text-sm text-neutral-500 mb-1">Time</p>
                      <p className="text-sm md:text-base font-medium text-neutral-900">{selectedEvent.time}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-neutral-500 mb-1">Location</p>
                    <p className="text-sm md:text-base font-medium text-neutral-900">{selectedEvent.location}</p>
                    {selectedEvent.address && (
                      <p className="text-xs md:text-sm text-neutral-600 mt-1">{selectedEvent.address}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-xs md:text-sm text-neutral-500 mb-2">Description</p>
                  <p className="text-sm md:text-base text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Voting */}
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-xs md:text-sm text-neutral-500 mb-3">Community Feedback</p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      voteOnEvent(selectedEvent.id, 'up')
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                    disabled={!auth.isAuthed}
                  >
                    <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    <span className="text-sm md:text-base font-medium text-green-600">{selectedEvent.upvotes}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      voteOnEvent(selectedEvent.id, 'down')
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                    disabled={!auth.isAuthed}
                  >
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                    <span className="text-sm md:text-base font-medium text-red-600">{selectedEvent.downvotes}</span>
                  </button>
                </div>
                {!auth.isAuthed && (
                  <p className="text-xs text-neutral-500 mt-3">Sign in to vote on events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
