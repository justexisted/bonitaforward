import { Calendar, Clock, MapPin, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react'
import { EventIcons } from '../utils/eventIcons'
import { extractEventUrl, cleanDescriptionFromUrls, getButtonTextForUrl } from '../utils/eventUrlUtils'
import { getEventHeaderImageFromDb } from '../utils/eventImageUtils'
import type { CalendarEvent } from '../types'

interface EventCardProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  savedEventIds?: Set<string>
  onToggleSave?: (eventId: string) => void
  isAuthed?: boolean
}

/**
 * EventCard component - Displays a calendar event in a card format
 * 
 * Features:
 * - Header image from database or gradient fallback
 * - Event icons overlay on the image
 * - Event details (date, time, location)
 * - Clean description without raw URLs
 * - "Learn More" button for events with URLs
 * - "Save Event" button for events without URLs
 * - Clickable card to view full details
 * 
 * Used on both the home page and full calendar page
 */
export function EventCard({ event, onClick, savedEventIds, onToggleSave, isAuthed }: EventCardProps) {
  const eventUrl = extractEventUrl(event)
  const cleanDescription = cleanDescriptionFromUrls(event.description)
  const buttonText = getButtonTextForUrl(eventUrl)
  
  // Get header image from database, or fallback to gradient
  // Uses helper function that handles legacy events with image_url but null image_type
  const headerImage = getEventHeaderImageFromDb(event)
  
  // DIAGNOSTIC: Log image data for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EventCard] Event "${event.title?.substring(0, 30)}" - image_url: ${event.image_url ? event.image_url.substring(0, 60) + '...' : 'null'}, image_type: ${event.image_type || 'null'}, headerImage type: ${headerImage.type}, isImage: ${headerImage.type === 'image'}`)
  }
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div
      onClick={() => onClick(event)}
      className="bg-white rounded-2xl border border-neutral-100 hover:shadow-lg transition-all text-left hover:border-blue-200 group flex flex-col cursor-pointer relative z-0 hover:z-50"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(event)
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
        
        {/* Event icons on image - positioned outside overflow-hidden so tooltips are visible */}
        <div className="absolute top-3 right-3 z-20">
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
          ) : isAuthed && savedEventIds && onToggleSave ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleSave(event.id)
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
          ) : null}
          
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
}

