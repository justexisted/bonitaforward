import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ChevronUp, ChevronDown, MapPin, Calendar, Clock, X, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react'
import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'
import type { CalendarEvent } from '../types'
import { EventIcons } from '../utils/eventIcons'
import { extractEventUrl, cleanDescriptionFromUrls, getButtonTextForUrl } from '../utils/eventUrlUtils'
import { getEventGradient, getEventHeaderImageFromDb, extractSearchKeywords, fetchUnsplashImage, getUnsplashAccessKey } from '../utils/eventImageUtils'
import { downloadAndStoreImage } from '../utils/eventImageStorage'
import { fetchSavedEvents, saveEvent, unsaveEvent, migrateLocalStorageToDatabase } from '../utils/savedEventsDb'
import { useHideDock } from '../hooks/useHideDock'
import { hasAcceptedEventTerms, acceptEventTerms, migrateEventTermsToDatabase } from '../utils/eventTermsDb'
import { updateEvent, deleteEvent } from './account/dataLoader'
import { CreateEventForm } from '../components/CreateEventForm'

// Re-export type for backward compatibility
export type { CalendarEvent }

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
    // CRITICAL: Use .select('*') to avoid errors from selecting non-existent columns
    // Explicit column selection breaks when columns don't exist in the database
    // Using '*' automatically selects only columns that exist
    const { data: dbEvents, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })
    
    if (dbError) {
      console.error('[fetchCalendarEvents] Database query error:', dbError)
      console.error('[fetchCalendarEvents] Error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      })
      // Return empty array on error to prevent breaking the app
      return []
    }
    
    if (!dbEvents) {
      console.warn('[fetchCalendarEvents] No events returned (dbEvents is null/undefined)')
      return []
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
    
    // Create a map of database events by ID to preserve image data during deduplication
    const dbEventsMap = new Map<string, CalendarEvent>()
    if (dbEvents) {
      dbEvents.forEach(event => {
        dbEventsMap.set(event.id, event)
      })
    }
    
    // Combine external events (RSS + iCalendar) - these won't have image_url
    const externalEvents = [...rssEvents, ...calendarEvents]
    
    // Deduplication: If external event has same ID as database event, prefer database event (has image)
    // Also, prevent external events from overriding database events
    const uniqueExternalEvents = externalEvents.filter(externalEvent => {
      // If a database event with this ID exists, skip the external event (database has priority)
      return !dbEventsMap.has(externalEvent.id)
    })
    
    // Combine: Database events first (preserve their image_url), then unique external events
    const allEvents = [
      ...(dbEvents || []),
      ...uniqueExternalEvents
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
  
  // State for create event feature
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submittingEvent, setSubmittingEvent] = useState(false)
  
  // State for flag/report feature
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [eventToFlag, setEventToFlag] = useState<CalendarEvent | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [flagDetails, setFlagDetails] = useState('')
  const [submittingFlag, setSubmittingFlag] = useState(false)

  // State for edit event feature
  const [editingEvent, setEditingEvent] = useState<null | {
    id: string
    title: string
    description: string
    date: string
    time: string
    location: string
    address: string
    category: string
  }>(null)
  const [submittingEventEdit, setSubmittingEventEdit] = useState(false)

  // State for saved/bookmarked events
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set())
  const [showSavedEvents, setShowSavedEvents] = useState(false) // Toggle for showing saved events section

  // NO eventImages state - all images come from database only

  // Hide Dock when any modal is open
  const isAnyModalOpen = Boolean(selectedEvent || showCreateEvent || showTermsModal || showFlagModal || editingEvent)
  useHideDock(isAnyModalOpen)

  // Load saved events from database and migrate localStorage data
  useEffect(() => {
    async function loadSavedEvents() {
      if (!auth.userId) return
      
      try {
        // Migrate localStorage data to database (one-time operation)
        await migrateLocalStorageToDatabase(auth.userId)
        
        // Load saved events from database
        const saved = await fetchSavedEvents(auth.userId)
        setSavedEventIds(saved)
      } catch (error) {
        console.error('[Calendar] Error loading saved events:', error)
      }
    }
    
    loadSavedEvents()
  }, [auth.userId])

  // Check if user has accepted terms (from database)
  useEffect(() => {
    async function checkTermsAcceptance() {
      if (!auth.userId) return
      
      try {
        // Migrate localStorage to database
        await migrateEventTermsToDatabase(auth.userId)
        
        // Load from database
        const accepted = await hasAcceptedEventTerms(auth.userId)
        setHasAcceptedTerms(accepted)
      } catch (error) {
        console.error('[Calendar] Error loading terms acceptance:', error)
        setHasAcceptedTerms(false)
      }
    }
    
    checkTermsAcceptance()
  }, [auth.userId])

  // Toggle save/bookmark event
  const toggleSaveEvent = async (eventId: string) => {
    if (!auth.isAuthed || !auth.userId) {
      alert('Please sign in to save events')
      return
    }

    const isCurrentlySaved = savedEventIds.has(eventId)
    
    // Optimistically update UI
    setSavedEventIds(prev => {
      const newSet = new Set(prev)
      if (isCurrentlySaved) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
    
    // Update database
    try {
      const result = isCurrentlySaved 
        ? await unsaveEvent(auth.userId, eventId)
        : await saveEvent(auth.userId, eventId)
      
      if (!result.success) {
        // Revert on error
        console.error('[Calendar] Error toggling save:', result.error)
        setSavedEventIds(prev => {
          const newSet = new Set(prev)
          if (isCurrentlySaved) {
            newSet.add(eventId) // Re-add if unsave failed
          } else {
            newSet.delete(eventId) // Remove if save failed
          }
          return newSet
        })
      }
    } catch (error) {
      console.error('[Calendar] Exception toggling save:', error)
      // Revert on error
      setSavedEventIds(prev => {
        const newSet = new Set(prev)
        if (isCurrentlySaved) {
          newSet.add(eventId)
        } else {
          newSet.delete(eventId)
        }
        return newSet
      })
    }
  }

  // Guard against duplicate loads from React Strict Mode (dev double-render)
  const hasLoadedEventsRef = useRef(false)

  // Load events from database
  useEffect(() => {
    // Prevent duplicate loads in React Strict Mode (development)
    if (hasLoadedEventsRef.current) {
      return
    }
    hasLoadedEventsRef.current = true

    const loadEvents = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const allEvents = await fetchCalendarEvents()
        setEvents(allEvents)
        
        // CRITICAL: Only use images from database - NO external API calls
        // Events without database images will use gradient fallbacks
        const eventsWithDbImages = allEvents.filter(e => e.image_url).length
        const eventsWithoutImages = allEvents.filter(e => !e.image_url)
        
        console.log(`[Calendar] 📊 Events: ${allEvents.length} total`)
        console.log(`[Calendar] ✅ ${eventsWithDbImages} have database images`)
        console.log(`[Calendar] 🎨 ${eventsWithoutImages.length} will use gradient fallbacks (images must be populated in database)`)
        
        // NO external API calls - all images come from database
        // If events don't have images, they'll use gradients from getEventHeaderImageFromDb
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  // Handle create event button click
  const handleCreateEventClick = () => {
    if (!auth.isAuthed) {
      alert('Please sign in to create an event')
      return
    }
    
    if (!hasAcceptedTerms) {
      setShowTermsModal(true)
    } else {
      setShowCreateEvent(true)
    }
  }

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      alert('Please check the box to accept the terms')
      return
    }
    
    try {
      if (!auth.userId) {
        alert('Please sign in to create events')
        return
      }
      
      const result = await acceptEventTerms(auth.userId)
      
      if (result.success) {
        setHasAcceptedTerms(true)
        setShowTermsModal(false)
        setShowCreateEvent(true)
      } else {
        console.error('[Calendar] Error saving terms acceptance:', result.error)
        alert('Failed to accept terms. Please try again.')
      }
    } catch (error) {
      console.error('[Calendar] Exception saving terms acceptance:', error)
      alert('Failed to accept terms. Please try again.')
    }
  }

  // Handle event submission
  const handleSubmitEvent = useCallback(async (newEvent: {
    title: string
    description: string
    date: string
    time: string
    location: string
    address: string
    category: string
  }) => {
    setSubmittingEvent(true)

    try {
      // Create temporary event object for image fetching
      const tempEvent: Partial<CalendarEvent> = {
        title: newEvent.title,
        description: newEvent.description || null,
        category: newEvent.category
      }

      // CRITICAL: Fetch Unsplash image, download it, and store in Supabase Storage
      // Save Supabase Storage URL to database, NOT Unsplash URL
      console.log('[CreateEvent] Fetching Unsplash image for event...')
      
      // Extract keywords for image search
      const keywords = extractSearchKeywords(tempEvent as CalendarEvent)
      console.log('[CreateEvent] Search keywords:', keywords)
      
      // Try to fetch Unsplash image (with API key check)
      const apiKey = getUnsplashAccessKey()
      let headerImage: { type: 'image' | 'gradient', value: string }
      
      if (apiKey && apiKey !== 'demo_key') {
        // Fetch Unsplash image URL
        const unsplashImageUrl = await fetchUnsplashImage(keywords)
        if (unsplashImageUrl) {
          console.log('[CreateEvent] ✅ Got Unsplash image URL:', unsplashImageUrl.substring(0, 60) + '...')
          
          // Download and store in Supabase Storage
          // Generate temporary event ID for storage path
          const tempEventId = `temp-${Date.now()}`
          const supabaseStorageUrl = await downloadAndStoreImage(unsplashImageUrl, tempEventId)
          
          if (supabaseStorageUrl && supabaseStorageUrl.includes('supabase.co/storage')) {
            // Use Supabase Storage URL (your own database)
            headerImage = { type: 'image', value: supabaseStorageUrl }
            console.log('[CreateEvent] ✅ Image stored in Supabase Storage:', supabaseStorageUrl.substring(0, 60) + '...')
          } else {
            // CRITICAL: Storage failed - NEVER save Unsplash URLs, use gradient instead
            console.error('[CreateEvent] ❌ FAILED to store in Supabase Storage')
            console.error('[CreateEvent] ❌ Check browser console for storage bucket error')
            console.error('[CreateEvent] ❌ Make sure "event-images" bucket exists in Supabase Dashboard → Storage')
            console.error('[CreateEvent] ⚠️ Using gradient fallback (NOT saving Unsplash URL)')
            // NEVER fall back to Unsplash URL - use gradient instead
            headerImage = { type: 'gradient', value: getEventGradient(tempEvent as CalendarEvent) }
          }
        } else {
          // Unsplash failed, use gradient
          headerImage = { type: 'gradient', value: getEventGradient(tempEvent as CalendarEvent) }
          console.log('[CreateEvent] ⚠️ Unsplash failed, using gradient fallback')
        }
      } else {
        // No API key, use gradient
        console.warn('[CreateEvent] ⚠️ No Unsplash API key - using gradient fallback')
        headerImage = { type: 'gradient', value: getEventGradient(tempEvent as CalendarEvent) }
      }
      
      // After inserting event, update with actual event ID if we used temp ID
      // (We'll handle this after insert)

      // Insert event with image
      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          title: newEvent.title,
          description: newEvent.description || null,
          date: new Date(newEvent.date + 'T' + (newEvent.time || '12:00')).toISOString(),
          time: newEvent.time || null,
          location: newEvent.location || null,
          address: newEvent.address || null,
          category: newEvent.category,
          source: 'Local',
          upvotes: 0,
          downvotes: 0,
          created_at: new Date().toISOString(),
          created_by_user_id: auth.userId || null,
          image_url: headerImage.value,
          image_type: headerImage.type
        }])

      if (error) throw error

      alert('Event created successfully! It will appear on the calendar shortly.')
      
      setShowCreateEvent(false)

      // Reload events
      const allEvents = await fetchCalendarEvents()
      setEvents(allEvents)

    } catch (error: any) {
      console.error('Error creating event:', error)
      alert('Failed to create event: ' + error.message)
    } finally {
      setSubmittingEvent(false)
    }
  }, [auth.userId])

  // Handle flag event click
  const handleFlagEventClick = (event: CalendarEvent) => {
    if (!auth.isAuthed) {
      alert('Please sign in to report events')
      return
    }
    setEventToFlag(event)
    setFlagReason('')
    setFlagDetails('')
    setShowFlagModal(true)
  }

  // Handle flag submission
  const handleSubmitFlag = async () => {
    if (!flagReason) {
      alert('Please select a reason for reporting this event')
      return
    }

    if (!eventToFlag || !auth.userId) return

    setSubmittingFlag(true)

    try {
      // Check if user already flagged this event
      const { data: existing } = await supabase
        .from('event_flags')
        .select('id')
        .eq('event_id', eventToFlag.id)
        .eq('user_id', auth.userId)
        .maybeSingle()

      if (existing) {
        alert('You have already reported this event. Our admin team will review it.')
        setShowFlagModal(false)
        setEventToFlag(null)
        return
      }

      // Insert flag
      const { error } = await supabase
        .from('event_flags')
        .insert([{
          event_id: eventToFlag.id,
          user_id: auth.userId,
          reason: flagReason,
          details: flagDetails || null,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      alert('Thank you for reporting this event. Our admin team has been notified and will review it shortly.')
      
      // Reset and close
      setShowFlagModal(false)
      setEventToFlag(null)
      setFlagReason('')
      setFlagDetails('')

    } catch (error: any) {
      console.error('Error flagging event:', error)
      alert('Failed to submit report: ' + error.message)
    } finally {
      setSubmittingFlag(false)
    }
  }

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
        .maybeSingle()

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
  
  // Get saved events
  const savedEvents = events.filter(event => savedEventIds.has(event.id))

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
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-6">
            Discover local events in Bonita (91902). Currently featuring community events with plans to integrate additional sources. Help your community decide what matters most.
          </p>
          
          {/* Create Event Button */}
          <button
            onClick={handleCreateEventClick}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Community Event
          </button>
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

            {/* Toggle Button for Saved Events */}
            {auth.isAuthed && savedEvents.length > 0 && (
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight font-display">
                  {showSavedEvents ? 'Your Saved Events' : ''}
                </h2>
                <button
                  onClick={() => setShowSavedEvents(!showSavedEvents)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 transition-colors font-medium"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{showSavedEvents ? 'Hide' : 'Show'} Saved Events ({savedEvents.length})</span>
                </button>
              </div>
            )}

            {/* Saved Events Section (Hidden by Default) */}
            {auth.isAuthed && savedEvents.length > 0 && showSavedEvents && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                  {savedEvents.map((event) => {
                    const eventUrl = extractEventUrl(event)
                    const cleanDescription = cleanDescriptionFromUrls(event.description)
                    const buttonText = getButtonTextForUrl(eventUrl)
                    
                    // CRITICAL: Only use images from database - NO external API calls
                    // All images come from database via getEventHeaderImageFromDb
                    const headerImage = getEventHeaderImageFromDb(event)
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white rounded-2xl border border-green-200 hover:shadow-lg transition-all text-left hover:border-green-300 group flex flex-col cursor-pointer overflow-hidden"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedEvent(event)
                          }
                        }}
                      >
                        {/* Header Image or Gradient */}
                        <div className="w-full h-32 md:h-40 relative flex items-center justify-center">
                          <div 
                            className="absolute inset-0 rounded-t-2xl overflow-hidden"
                            style={
                              headerImage?.type === 'image'
                                ? {
                                    backgroundImage: `url(${headerImage.value})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  }
                                : {
                                    background: headerImage?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  }
                            }
                          >
                            {/* Overlay for better text visibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          </div>
                          
                          {/* Event icons on image */}
                          <div className="absolute top-3 right-3 z-20">
                            <EventIcons 
                              title={event.title} 
                              description={event.description} 
                              className="w-6 h-6 text-white drop-shadow-lg" 
                            />
                          </div>
                          
                          {/* Saved badge */}
                          <div className="absolute top-3 left-3 z-20">
                            <div className="bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                              <BookmarkCheck className="w-3 h-3" />
                              <span>Saved</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 md:p-6">
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

                        {cleanDescription && (
                          <p className="text-xs md:text-sm text-neutral-600 mb-3 md:mb-4 line-clamp-3">
                            {cleanDescription}
                          </p>
                        )}

                        <div className="flex flex-col gap-3 mt-auto">
                          {/* Learn More Button (if URL exists) or Unsave Button */}
                          {eventUrl ? (
                            <a
                              href={eventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <span>{buttonText}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : null}
                          
                          {/* Unsave button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaveEvent(event.id)
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-50 hover:bg-red-100 text-red-600"
                          >
                            <X className="w-4 h-4" />
                            <span>Remove from Saved</span>
                          </button>
                          
                          {/* Event source badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] md:text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                              {event.source}
                            </span>
                            {cleanDescription && (
                              <span className="text-xs text-neutral-400">
                                Click for details
                              </span>
                            )}
                          </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
            )}

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
                  {displayEvents.map((event) => {
                    const eventUrl = extractEventUrl(event)
                    const cleanDescription = cleanDescriptionFromUrls(event.description)
                    const buttonText = getButtonTextForUrl(eventUrl)
                    
                    // CRITICAL: Only use images from database - NO external API calls
                    // All images come from database via getEventHeaderImageFromDb
                    const headerImage = getEventHeaderImageFromDb(event)
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white rounded-2xl border border-neutral-100 hover:shadow-lg transition-all text-left hover:border-blue-200 group flex flex-col cursor-pointer overflow-hidden"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedEvent(event)
                          }
                        }}
                      >
                        {/* Header Image or Gradient */}
                        <div 
                          className="w-full h-32 md:h-40 relative flex items-center justify-center"
                          style={
                            headerImage?.type === 'image'
                              ? {
                                  backgroundImage: `url(${headerImage.value})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }
                              : {
                                  background: headerImage?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }
                          }
                        >
                          {/* Overlay for better text visibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          
                          {/* Event icons on image */}
                          <div className="absolute top-3 right-3 z-10">
                            <EventIcons 
                              title={event.title} 
                              description={event.description} 
                              className="w-6 h-6 text-white drop-shadow-lg" 
                            />
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 md:p-6">
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

                        {cleanDescription && (
                          <p className="text-xs md:text-sm text-neutral-600 mb-3 md:mb-4 line-clamp-3">
                            {cleanDescription}
                          </p>
                        )}

                        <div className="flex flex-col gap-3 mt-auto">
                          {/* Learn More Button (if URL exists) or Save Button (if no URL) */}
                          {eventUrl ? (
                            <a
                              href={eventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <span>{buttonText}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaveEvent(event.id)
                              }}
                              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                savedEventIds.has(event.id)
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {savedEventIds.has(event.id) ? (
                                <>
                                  <BookmarkCheck className="w-4 h-4" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-4 h-4" />
                                  <span>Save Event</span>
                                </>
                              )}
                            </button>
                          )}
                          
                          {/* Event source badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] md:text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                              {event.source}
                            </span>
                            {cleanDescription && (
                              <span className="text-xs text-neutral-400">
                                Click for details
                              </span>
                            )}
                          </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
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
                  {sortedRecurringEvents.map((event) => {
                    const eventUrl = extractEventUrl(event)
                    const cleanDescription = cleanDescriptionFromUrls(event.description)
                    const buttonText = getButtonTextForUrl(eventUrl)
                    
                    // CRITICAL: Only use images from database - NO external API calls
                    // All images come from database via getEventHeaderImageFromDb
                    const headerImage = getEventHeaderImageFromDb(event)
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white rounded-2xl border border-neutral-100 hover:shadow-lg transition-all text-left hover:border-blue-200 group flex flex-col cursor-pointer overflow-hidden"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedEvent(event)
                          }
                        }}
                      >
                        {/* Header Image or Gradient */}
                        <div 
                          className="w-full h-32 md:h-40 relative flex items-center justify-center"
                          style={
                            headerImage?.type === 'image'
                              ? {
                                  backgroundImage: `url(${headerImage.value})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }
                              : {
                                  background: headerImage?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }
                          }
                        >
                          {/* Overlay for better text visibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          
                          {/* Event icons on image */}
                          <div className="absolute top-3 right-3 z-10">
                            <EventIcons 
                              title={event.title} 
                              description={event.description} 
                              className="w-6 h-6 text-white drop-shadow-lg" 
                            />
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 md:p-6">
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

                        {cleanDescription && (
                          <p className="text-xs md:text-sm text-neutral-600 mb-3 md:mb-4 line-clamp-3">
                            {cleanDescription}
                          </p>
                        )}

                        <div className="flex flex-col gap-3 mt-auto">
                          {/* Learn More Button (if URL exists) or Save Button (if no URL) */}
                          {eventUrl ? (
                            <a
                              href={eventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <span>{buttonText}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaveEvent(event.id)
                              }}
                              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                savedEventIds.has(event.id)
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {savedEventIds.has(event.id) ? (
                                <>
                                  <BookmarkCheck className="w-4 h-4" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-4 h-4" />
                                  <span>Save Event</span>
                                </>
                              )}
                            </button>
                          )}
                          
                          {/* Event source badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] md:text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                              {event.source}
                            </span>
                            {cleanDescription && (
                              <span className="text-xs text-neutral-400">
                                Click for details
                              </span>
                            )}
                          </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {displayEvents.length === 0 && events.length > 0 && (
              <div className="text-center py-6">
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
              <div className="text-center py-6">
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
      {selectedEvent && (() => {
        const modalEventUrl = extractEventUrl(selectedEvent)
        const modalCleanDescription = cleanDescriptionFromUrls(selectedEvent.description)
        const modalButtonText = getButtonTextForUrl(modalEventUrl)
        
        return (
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
                {/* Learn More Button - Prominent placement at top */}
                {modalEventUrl && (
                  <a
                    href={modalEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
                  >
                    <span>{modalButtonText}</span>
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}

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
                {modalCleanDescription && (
                  <div>
                    <p className="text-xs md:text-sm text-neutral-500 mb-2">Description</p>
                    <p className="text-sm md:text-base text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {modalCleanDescription}
                    </p>
                  </div>
                )}

                {/* Voting */}
                <div className="pt-4 border-t border-neutral-200">
                  <p className="text-xs md:text-sm text-neutral-500 mb-3">Community Feedback</p>
                  <div className="flex items-center justify-between">
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
                    
                    {/* Flag/Report Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEvent(null)
                        handleFlagEventClick(selectedEvent)
                      }}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors text-sm"
                      title="Report this event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      <span>Report</span>
                    </button>
                  </div>
                  {!auth.isAuthed && (
                    <p className="text-xs text-neutral-500 mt-3">Sign in to vote on events</p>
                  )}
                  
                  {/* Edit/Delete buttons for event owner */}
                  {auth.isAuthed && auth.userId && selectedEvent.created_by_user_id === auth.userId && (
                    <div className="pt-4 mt-4 border-t border-neutral-200">
                      <p className="text-xs md:text-sm text-neutral-500 mb-3">Manage Your Event</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEvent(null)
                            const eventDate = selectedEvent.date.includes('T') 
                              ? selectedEvent.date.split('T')[0]
                              : new Date(selectedEvent.date).toISOString().split('T')[0]
                            setEditingEvent({
                              id: selectedEvent.id,
                              title: selectedEvent.title,
                              description: selectedEvent.description || '',
                              date: eventDate,
                              time: selectedEvent.time || '',
                              location: selectedEvent.location || '',
                              address: selectedEvent.address || '',
                              category: selectedEvent.category
                            })
                          }}
                          className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm('Delete this event? This cannot be undone.')) return
                            
                            const res = await deleteEvent(selectedEvent.id)
                            if (res.success) {
                              setSelectedEvent(null)
                              // Reload events
                              const allEvents = await fetchCalendarEvents()
                              setEvents(allEvents)
                              alert('Event deleted successfully')
                            } else {
                              alert('Failed to delete event: ' + (res.error || 'Unknown error'))
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Edit Event</h3>
              <button 
                onClick={() => setEditingEvent(null)} 
                className="text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="block text-sm">
                <span className="text-neutral-700">Title</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, title: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Date</span>
                <input
                  type="date"
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.date?.toString().split('T')[0] || ''}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, date: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Time</span>
                <input
                  type="time"
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.time || ''}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, time: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Location</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.location}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, location: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Address</span>
                <input
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.address}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, address: e.target.value } : prev)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Category</span>
                <select
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  value={editingEvent.category}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, category: e.target.value } : prev)}
                >
                  <option value="Community">Community</option>
                  <option value="Business">Business</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Sports">Sports</option>
                  <option value="Education">Education</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-neutral-700">Description</span>
                <textarea
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  rows={4}
                  value={editingEvent.description}
                  onChange={e => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : prev)}
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submittingEventEdit}
                onClick={async () => {
                  if (!editingEvent) return
                  setSubmittingEventEdit(true)
                  
                  try {
                    const payload = {
                      title: editingEvent.title,
                      description: editingEvent.description,
                      date: editingEvent.date,
                      time: editingEvent.time,
                      location: editingEvent.location,
                      address: editingEvent.address,
                      category: editingEvent.category,
                    }
                    const res = await updateEvent(editingEvent.id, payload)
                    
                    if (res.success) {
                      setEditingEvent(null)
                      // Reload events
                      const allEvents = await fetchCalendarEvents()
                      setEvents(allEvents)
                      alert('Event updated successfully')
                    } else {
                      alert('Failed to update event: ' + (res.error || 'Unknown error'))
                    }
                  } catch (err: any) {
                    console.error('Error updating event:', err)
                    alert('Failed to update event: ' + err.message)
                  } finally {
                    setSubmittingEventEdit(false)
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submittingEventEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Acceptance Modal */}
      {showTermsModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Event Posting Terms & Conditions</h2>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="font-semibold text-yellow-900 mb-2">⚠️ Important Notice</p>
                <p className="text-sm text-yellow-800">
                  By creating an event on Bonita Forward, you agree to post only appropriate, 
                  community-friendly content. You are fully responsible for the information you submit.
                </p>
              </div>

              <div className="space-y-3 text-sm text-neutral-700">
                <h3 className="font-semibold text-neutral-900 text-base">Terms of Use:</h3>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>Appropriate Content Only:</strong> All events must be appropriate for a general community audience. No offensive, discriminatory, or inappropriate content.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>Accurate Information:</strong> Ensure all event details (date, time, location) are accurate and up-to-date.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>Local Events:</strong> Events should be relevant to the Bonita/Chula Vista community and within a reasonable distance (~20 minutes).</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>Your Responsibility:</strong> You are solely responsible for any legal or ethical consequences arising from your event posting.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>Moderation Rights:</strong> Bonita Forward reserves the right to remove any event that violates these terms or is deemed inappropriate.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <p><strong>No Spam:</strong> Do not post duplicate events or use the calendar for spam or commercial advertising without prior approval.</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900 mb-2">Violations & Consequences:</p>
                  <p className="text-red-800 text-sm">
                    Posting offensive, inappropriate, or misleading content may result in:
                  </p>
                  <ul className="text-red-800 text-sm mt-2 ml-4 space-y-1">
                    <li>• Immediate removal of your event</li>
                    <li>• Suspension or termination of your account</li>
                    <li>• Legal action if your content violates laws or causes harm</li>
                  </ul>
                </div>
              </div>

              {/* Acceptance Checkbox */}
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-blue-600 rounded border-neutral-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-neutral-900">
                    I have read and agree to these terms. I understand that I am responsible for the content I post 
                    and any consequences that may arise from inappropriate or offensive content.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptTerms}
                  disabled={!termsAccepted}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    termsAccepted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Form Modal */}
      {showCreateEvent && (
        <CreateEventForm
          onClose={() => setShowCreateEvent(false)}
          onSubmit={handleSubmitEvent}
          submitting={submittingEvent}
        />
      )}

      {/* Flag/Report Event Modal */}
      {showFlagModal && eventToFlag && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFlagModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowFlagModal(false)}
                className="absolute top-4 right-4 bg-red-800 hover:bg-red-900 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold pr-10">Report Event</h2>
              <p className="text-red-100 mt-2 text-sm">Help us keep Bonita's calendar clean</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Event Info */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-900 mb-1">{eventToFlag.title}</h3>
                <p className="text-sm text-neutral-600">
                  {new Date(eventToFlag.date).toLocaleDateString()} • {eventToFlag.source}
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ Important:</strong> Only report events that violate our community guidelines. 
                  False reports may result in action on your account.
                </p>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Why are you reporting this event? <span className="text-red-500">*</span>
                </label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  <option value="spam">Spam or Commercial Advertisement</option>
                  <option value="inappropriate">Inappropriate or Offensive Content</option>
                  <option value="misleading">Misleading or False Information</option>
                  <option value="duplicate">Duplicate Event</option>
                  <option value="wrong-location">Event Not in Bonita Area</option>
                  <option value="cancelled">Event Has Been Cancelled</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={flagDetails}
                  onChange={(e) => setFlagDetails(e.target.value)}
                  placeholder="Provide more context to help us understand the issue..."
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  maxLength={300}
                />
                <p className="text-xs text-neutral-500 mt-1">{flagDetails.length}/300 characters</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>What happens next:</strong> Our admin team will review this report and take appropriate action. 
                  You'll only be notified if we need more information.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 font-medium transition-colors"
                  disabled={submittingFlag}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFlag}
                  disabled={submittingFlag || !flagReason}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    submittingFlag || !flagReason
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {submittingFlag ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
