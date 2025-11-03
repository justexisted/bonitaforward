import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, X, Flag } from 'lucide-react'
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
import { useHideDock } from '../hooks/useHideDock'
import { supabase } from '../lib/supabase'

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

  // State for flag/report feature
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [eventToFlag, setEventToFlag] = useState<CalendarEvent | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [flagDetails, setFlagDetails] = useState('')
  const [submittingFlag, setSubmittingFlag] = useState(false)

  // Hide Dock when any modal is open
  useHideDock(Boolean(selectedEvent || showFlagModal))

  // Guard against duplicate loads from React Strict Mode (dev double-render)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate loads in React Strict Mode (development)
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true

    const loadEvents = async () => {
      try {
        const calendarEvents = await fetchCalendarEvents()
        setEvents(calendarEvents)
        
        // ONLY load dynamic images for events that don't have database images
        const eventsWithDbImages = calendarEvents.filter(e => e.image_url).length
        const eventsNeedingImages = calendarEvents.filter(e => !e.image_url)
        
        console.log(`[CalendarSection] 📊 Events: ${calendarEvents.length} total`)
        console.log(`[CalendarSection] ✅ ${eventsWithDbImages} have database images`)
        console.log(`[CalendarSection] 🎨 ${eventsNeedingImages.length} will use gradient fallbacks (no external fetch)`)        
        
        if (eventsNeedingImages.length > 0) {
          const images = await preloadEventImages(eventsNeedingImages)
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

  // Handle flag event click
  const handleFlagEventClick = (event: CalendarEvent) => {
    if (!auth.isAuthed) {
      alert('Please sign in to report events')
      return
    }
    setEventToFlag(event)
    setFlagReason('')
    setFlagDetails('')
    setSelectedEvent(null) // Close event detail modal
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

  // Show loading spinner while events are being fetched
  if (loading) {
    return (
      <section className="py-6 md:py-8 bg-gradient-to-b from-neutral-50 to-white">
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
      <section className="py-6 md:py-8 bg-gradient-to-b from-neutral-50 to-white overflow-visible">
        <div className="container-px mx-auto max-w-6xl overflow-visible">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 text-center md:text-left">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">
                Upcoming Events
              </h2>
              <p className="text-neutral-600 mb-4 md:mb-0">
                Discover what's happening in Bonita
              </p>
            </div>
            <Link
              to="/calendar"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors md:flex-shrink-0"
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden md:inline">View Full Calendar</span>
              <span className="md:hidden">View Full Calendar</span>
            </Link>
          </div>

          {/* Event Cards Grid */}
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible">
            {upcomingEvents.map((event) => {
              // PRIORITIZE database images, only use dynamic if database is empty
              const dynamicImage = eventImages.get(event.id)
              const eventWithImage = event.image_url ? event : (dynamicImage ? {
                ...event,
                image_url: dynamicImage.value,
                image_type: dynamicImage.type
              } : event)
                
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
            <div className="text-center py-6">
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

                {/* Location - Show location if available, fallback to address if not */}
                {(selectedEvent.location || selectedEvent.address) && (
                  <div className="flex items-start text-sm md:text-base text-neutral-700">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-3 mt-0.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{selectedEvent.location || selectedEvent.address}</span>
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

                {/* Flag/Report Button */}
                <button
                  onClick={() => handleFlagEventClick(selectedEvent)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors text-sm font-medium"
                  title="Report this event"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report Event</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
              <h2 className="text-2xl font-bold">Report Event</h2>
              <p className="text-red-100 text-sm mt-1">Help us keep our calendar accurate and appropriate</p>
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

              {/* Warning Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Before reporting:</strong> This should only be used for events that violate our guidelines 
                  (spam, inappropriate content, incorrect information, etc.). For general inquiries, please contact us directly.
                </p>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Why are you reporting this event? <span className="text-red-500">*</span>
                </label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  <option value="spam">Spam or misleading</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="incorrect">Incorrect information</option>
                  <option value="duplicate">Duplicate event</option>
                  <option value="cancelled">Event was cancelled</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Details Textarea */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                <p className="text-sm text-blue-800">
                  Our admin team will review your report within 24-48 hours. Thank you for helping us maintain quality content.
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
    </>
  )
}
