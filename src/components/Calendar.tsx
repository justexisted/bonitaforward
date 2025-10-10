import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, MapPin, Clock } from 'lucide-react'
import { type CalendarEvent } from '../pages/Calendar'

interface CalendarProps {
  events: CalendarEvent[]
  className?: string
}

export default function Calendar({ events, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null)
  const [showInfoCard, setShowInfoCard] = useState(() => {
    // Check if user has dismissed the info card before
    try {
      return localStorage.getItem('bf-calendar-info-dismissed') !== 'true'
    } catch {
      return true
    }
  })
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)

  // Group events by date
  useEffect(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    events.forEach(event => {
      const date = new Date(event.date).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(event)
    })
    setEventsByDate(grouped)
  }, [events])

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getEventsForDate = (day: number) => {
    if (!day) return []
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return eventsByDate[date.toDateString()] || []
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const dismissInfoCard = () => {
    setShowInfoCard(false)
    try {
      localStorage.setItem('bf-calendar-info-dismissed', 'true')
    } catch {
      // localStorage not available
    }
  }

  const handleDayClick = (_day: number, dayEvents: CalendarEvent[]) => {
    // On mobile or when there are multiple events, show all day events
    if (dayEvents.length > 0) {
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        setSelectedDayEvents(dayEvents)
      } else if (dayEvents.length === 1) {
        setSelectedEvent(dayEvents[0])
      } else {
        setSelectedDayEvents(dayEvents)
      }
    }
  }

  const days = getDaysInMonth(currentDate)

  return (
    <section className={`py-16 ${className}`}>
      <div className="container-px mx-auto max-w-6xl relative">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-display mb-2">
            SAN DIEGO BONITA
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl font-medium text-blue-600 font-display">
            CALENDAR EVENTS {currentDate.getFullYear()}
          </p>
        </div>

        {/* Calendar Grid */}
        <div className={`bg-white rounded-2xl shadow-lg border border-neutral-200 relative ${showInfoCard ? 'blur-sm' : ''}`}>
          {/* Month Navigation */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <h3 className="text-xl md:text-2xl font-bold text-white font-display">
              {monthNames[currentDate.getMonth()]}
            </h3>
            
            <button
              onClick={() => navigateMonth('next')}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-neutral-100">
            {dayNames.map(day => (
              <div key={day} className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold text-neutral-700 border-r border-neutral-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day || 0)
              const hasEvents = dayEvents.length > 0
              const isToday = day && new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
              
              return (
                <div
                  key={index}
                  onClick={() => day && handleDayClick(day, dayEvents)}
                  className={`min-h-[60px] md:min-h-[80px] p-1 md:p-2 border-r border-b border-neutral-200 last:border-r-0 relative ${
                    day ? hasEvents ? 'bg-white hover:bg-blue-50 cursor-pointer md:cursor-default' : 'bg-white' : 'bg-neutral-50'
                  } ${isToday ? 'ring-2 ring-neutral-400 ring-inset bg-yellow-50' : 'bg-neutral-100'}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs md:text-sm font-medium mb-1 ${
                        isToday ? 'text-blue-600 font-bold' : 'text-neutral-900'
                      }`}>
                        {day}
                      </div>
                      
                      {/* Event indicators - clickable with hover tooltip */}
                      {hasEvents && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event, eventIndex) => (
                            <div key={eventIndex} className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEvent(event)
                                }}
                                onMouseEnter={() => setHoveredEvent(event)}
                                onMouseLeave={() => setHoveredEvent(null)}
                                className={`w-full text-left text-xs px-2 py-1 rounded-full truncate cursor-pointer hover:opacity-80 transition-opacity ${
                                   event.source.includes('San Diego') || event.source.includes('Museum') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                   event.source.includes('Library') ? 'bg-green-100 text-green-800 border border-green-200' :
                                   event.source.includes('Parks') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                   event.source.includes('CNN') ? 'bg-red-100 text-red-800 border border-red-200' :
                                   event.source === 'Local' ? 'bg-neutral-100 text-neutral-800 border border-neutral-200' :
                                   event.source === 'Recurring' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                   event.category === 'Community' ? 'bg-green-100 text-green-700' :
                                   event.category === 'Family' ? 'bg-blue-100 text-blue-700' :
                                   event.category === 'Business' ? 'bg-purple-100 text-purple-700' :
                                   event.category === 'Culture' ? 'bg-indigo-100 text-indigo-700' :
                                   event.category === 'Education' ? 'bg-cyan-100 text-cyan-700' :
                                   'bg-neutral-100 text-neutral-700'
                                 }`}
                              >
                                {event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title}
                              </button>
                              {/* Hover tooltip for desktop */}
                              {hoveredEvent === event && (
                                <div className="hidden md:block absolute z-50 bg-neutral-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-normal break-words bottom-full left-0 mb-1 max-w-xs min-w-[120px]">
                                  {event.title}
                                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900"></div>
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDayEvents(dayEvents)
                              }}
                              className="text-xs text-neutral-500 font-medium hover:text-neutral-700 transition-colors"
                            >
                              +{dayEvents.length - 2} more
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Card Overlay */}
        {showInfoCard && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 md:p-8 relative max-w-2xl w-full shadow-2xl">
              <button
                onClick={dismissInfoCard}
                className="absolute top-4 right-4 bg-blue-200 hover:bg-blue-300 rounded-full p-2 transition-colors"
                aria-label="Dismiss info card"
              >
                <X className="w-5 h-5 text-blue-800" />
              </button>
              <div className="flex items-start space-x-4 pr-10">
                <div className="flex-shrink-0">
                  <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4">How the Calendar Works</h3>
                  <div className="text-sm md:text-base text-blue-800 space-y-2.5">
                    <p>• <strong>Click on any event</strong> to see full details including time, location, and description</p>
                    <p className="md:hidden">• <strong>Tap a day</strong> to see all events for that date</p>
                    <p className="hidden md:block">• <strong>Hover over events</strong> to see their titles</p>
                    <p>• All events are within 20 minutes of Chula Vista and curated for Bonita</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-8">
          <Link
            to="/calendar"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-colors shadow-lg hover:shadow-xl text-sm md:text-base"
          >
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
            <span>View Full Calendar & Vote on Events</span>
          </Link>
        </div>

        {/* Legend */}
        <div className="mt-8 space-y-4">
          <h4 className="text-center text-xs md:text-sm font-semibold text-neutral-700">Event Sources</h4>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-neutral-100 rounded-full border border-neutral-200"></div>
              <span className="text-neutral-600">Local Events</span>
            </div>
          </div>
          
          <h4 className="text-center text-xs md:text-sm font-semibold text-neutral-700 mt-4">Event Categories</h4>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 rounded-full"></div>
              <span className="text-neutral-600">Community</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
              <span className="text-neutral-600">Family</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
              <span className="text-neutral-600">Business</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
              <span className="text-neutral-600">Food</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 rounded-full"></div>
              <span className="text-neutral-600">Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Events Modal (Mobile/Multiple Events) */}
      {selectedDayEvents && (
        <div 
          className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-white font-display">
                Events on {new Date(currentDate.getFullYear(), currentDate.getMonth(), new Date(selectedDayEvents[0].date).getDate()).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="bg-blue-800 hover:bg-blue-900 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-4 md:p-6 space-y-3">
              {selectedDayEvents.map((event, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDayEvents(null)
                    setSelectedEvent(event)
                  }}
                  className="w-full text-left bg-neutral-50 hover:bg-blue-50 border border-neutral-200 hover:border-blue-300 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors pr-2">
                      {event.title}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-neutral-200 text-neutral-700 rounded-full flex-shrink-0">
                      {event.source}
                    </span>
                  </div>
                  {event.time && (
                    <div className="flex items-center text-sm text-neutral-600 mb-2">
                      <Clock className="w-4 h-4 mr-2" />
                      {event.time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center text-sm text-neutral-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-4 rounded-t-2xl flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h3 className="text-lg md:text-xl font-bold text-white font-display">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs md:text-sm px-2 md:px-3 py-1 bg-blue-800 text-white rounded-full border border-blue-900">
                    {selectedEvent.source}
                  </span>
                  <span className="text-xs md:text-sm px-2 md:px-3 py-1 bg-blue-800 text-white rounded-full border border-blue-900">
                    {selectedEvent.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-shrink-0 bg-blue-800 hover:bg-blue-900 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">
              {/* Date and Time */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm md:text-base">
                <div className="flex items-center text-neutral-700">
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600" />
                  <span className="font-medium">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {selectedEvent.time && (
                  <div className="flex items-center text-neutral-700">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600" />
                    <span className="font-medium">{selectedEvent.time}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-start text-neutral-700">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm md:text-base">{selectedEvent.location}</div>
                    {selectedEvent.address && (
                      <div className="text-xs md:text-sm text-neutral-600 mt-1">{selectedEvent.address}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="border-t border-neutral-200 pt-4">
                  <h4 className="font-semibold text-neutral-900 mb-2 text-sm md:text-base">About This Event</h4>
                  <p className="text-xs md:text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Vote counts */}
              <div className="flex items-center gap-4 border-t border-neutral-200 pt-4">
                <div className="flex items-center gap-2 text-sm md:text-base">
                  <span className="text-green-600 font-medium">👍 {selectedEvent.upvotes}</span>
                  <span className="text-neutral-400">|</span>
                  <span className="text-red-600 font-medium">👎 {selectedEvent.downvotes}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="border-t border-neutral-200 pt-4">
                <Link
                  to="/calendar"
                  className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold transition-colors text-sm md:text-base"
                  onClick={() => setSelectedEvent(null)}
                >
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  <span>View Full Calendar & Vote</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
