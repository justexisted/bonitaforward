import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { EventCard } from './EventCard'
import { fetchCalendarEvents, type CalendarEvent } from '../pages/Calendar'
import { useAuth } from '../contexts/AuthContext'
import { extractEventUrl, cleanDescriptionFromUrls } from '../utils/eventUrlUtils'
import { preloadEventImages } from '../utils/eventImageUtils'
import { 
  fetchSavedEvents, 
  saveEvent, 
  unsaveEvent, 
  migrateLocalStorageToDatabase,
  getLocalStorageSavedEvents,
  saveEventToLocalStorage,
  unsaveEventFromLocalStorage
} from '../utils/savedEventsDb'

interface LoadingSpinnerProps {
  message?: string
  className?: string
}

/**
 * LoadingSpinner component for displaying loading states
 * 
 * Shows a spinning animation with a customizable message
 * Used during calendar events loading
 * 
 * @param message - Optional loading message (defaults to 'Loading...')
 * @param className - Optional additional CSS classes
 */
function LoadingSpinner({ message = 'Loading...', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
      <p className="mt-4 text-neutral-600">{message}</p>
    </div>
  )
}

/**
 * CalendarSection component - Calendar events display section
 * 
 * Manages calendar events data loading and display:
 * - Fetches calendar events from the API
 * - Shows loading spinner while events are being loaded
 * - Displays upcoming events in card format (matching Calendar page aesthetic)
 * - Handles loading states, error handling, and event interactions
 * 
 * Used on the home page to show upcoming calendar events
 * with proper loading states and error handling.
 */
export default function CalendarSection() {
  const auth = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set())
  const [eventImages, setEventImages] = useState<Map<string, { type: 'image' | 'gradient', value: string }>>(new Map())

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const calendarEvents = await fetchCalendarEvents()
        setEvents(calendarEvents)
        
        // Load images dynamically after events are loaded
        if (calendarEvents.length > 0) {
          const images = await preloadEventImages(calendarEvents)
          setEventImages(images)
        }
      } catch (error) {
        console.error('Error loading calendar events:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  // Load saved events from database (authenticated) or localStorage (guest)
  useEffect(() => {
    async function loadSavedEvents() {
      try {
        if (auth.userId) {
          // Authenticated user - load from database
          await migrateLocalStorageToDatabase(auth.userId)
          const saved = await fetchSavedEvents(auth.userId)
          setSavedEventIds(saved)
        } else {
          // Guest user - load from localStorage
          const saved = getLocalStorageSavedEvents()
          setSavedEventIds(saved)
        }
      } catch (error) {
        console.error('[CalendarSection] Error loading saved events:', error)
      }
    }
    
    loadSavedEvents()
  }, [auth.userId])

  // Toggle save event
  const toggleSaveEvent = async (eventId: string) => {
    if (!auth.isAuthed) {
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
    
    // Update database (authenticated) or localStorage (guest)
    try {
      if (auth.userId) {
        // Authenticated user - update database
        const result = isCurrentlySaved 
          ? await unsaveEvent(auth.userId, eventId)
          : await saveEvent(auth.userId, eventId)
        
        if (!result.success) {
          // Revert on error
          console.error('[CalendarSection] Error toggling save:', result.error)
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
      } else {
        // Guest user - update localStorage
        if (isCurrentlySaved) {
          unsaveEventFromLocalStorage(eventId)
        } else {
          saveEventToLocalStorage(eventId)
        }
      }
    } catch (error) {
      console.error('[CalendarSection] Exception toggling save:', error)
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

  // Show loading spinner while events are being fetched
  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="container-px mx-auto max-w-6xl">
          <LoadingSpinner message="Loading calendar events..." />
        </div>
      </section>
    )
  }

  // Get upcoming events (next 6 events from today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6)

  return (
    <>
      <section className="py-16 bg-gradient-to-b from-neutral-50 to-white overflow-visible">
        <div className="container-px mx-auto max-w-6xl overflow-visible">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">
                Upcoming Events
              </h2>
              <p className="text-neutral-600">
                Discover what's happening in Bonita
              </p>
            </div>
            <Link
              to="/calendar"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden md:inline">View Full Calendar</span>
              <span className="md:hidden">Calendar</span>
            </Link>
          </div>

          {/* Event Cards Grid */}
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible">
              {upcomingEvents.map((event) => {
                // Get dynamically loaded image or use database image as fallback
                const dynamicImage = eventImages.get(event.id)
                const eventWithImage = dynamicImage ? {
                  ...event,
                  image_url: dynamicImage.value,
                  image_type: dynamicImage.type
                } : event
                
                return (
                  <EventCard
                    key={event.id}
                    event={eventWithImage}
                    onClick={setSelectedEvent}
                    savedEventIds={savedEventIds}
                    onToggleSave={toggleSaveEvent}
                    isAuthed={auth.isAuthed}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-600">No upcoming events at the moment</p>
              <Link
                to="/calendar"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse all events
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Event Detail Modal */}
      {selectedEvent && (() => {
        const modalEventUrl = extractEventUrl(selectedEvent)
        const modalCleanDescription = cleanDescriptionFromUrls(selectedEvent.description)
        
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 md:p-6" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 md:p-6 flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-xl md:text-2xl text-neutral-900 mb-2">
                    {selectedEvent.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {selectedEvent.source}
                    </span>
                    <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                      {selectedEvent.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6 text-neutral-600" />
                </button>
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
                    <span>Learn More</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {/* Date */}
                <div className="flex items-center text-sm md:text-base text-neutral-700">
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 mr-3 text-blue-600 flex-shrink-0" />
                  <span className="font-medium">{new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {/* Time */}
                {selectedEvent.time && (
                  <div className="flex items-center text-sm md:text-base text-neutral-700">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{selectedEvent.time}</span>
                  </div>
                )}

                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-start text-sm md:text-base text-neutral-700">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-3 mt-0.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{selectedEvent.location}</span>
                  </div>
                )}

                {/* Address */}
                {selectedEvent.address && (
                  <div className="flex items-start text-sm md:text-base text-neutral-600">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-3 mt-0.5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>{selectedEvent.address}</span>
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
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
