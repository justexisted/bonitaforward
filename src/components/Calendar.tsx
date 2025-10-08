import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { type CalendarEvent } from '../pages/Calendar'

interface CalendarProps {
  events: CalendarEvent[]
  className?: string
}

export default function Calendar({ events, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})

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

  const days = getDaysInMonth(currentDate)

  return (
    <section className={`py-16 bg-gradient-to-b from-neutral-50 to-white ${className}`}>
      <div className="container-px mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-display mb-2">
            SAN DIEGO BONITA
          </h2>
          <p className="text-xl md:text-2xl font-medium text-blue-600 font-display">
            CALENDAR {currentDate.getFullYear()}
          </p>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
          {/* Month Navigation */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-white font-display">
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
              <div key={day} className="p-3 text-center text-sm font-semibold text-neutral-700 border-r border-neutral-200 last:border-r-0">
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
                  className={`min-h-[80px] p-2 border-r border-b border-neutral-200 last:border-r-0 relative ${
                    day ? 'bg-white hover:bg-blue-50' : 'bg-neutral-50'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-blue-600 font-bold' : 'text-neutral-900'
                      }`}>
                        {day}
                      </div>
                      
                      {/* Event indicators */}
                      {hasEvents && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                               className={`text-xs px-2 py-1 rounded-full truncate ${
                                 event.source.includes('San Diego') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                 event.source.includes('Library') ? 'bg-green-100 text-green-800 border border-green-200' :
                                 event.source.includes('Parks') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                 event.source.includes('CNN') ? 'bg-red-100 text-red-800 border border-red-200' :
                                 event.source === 'Local' ? 'bg-neutral-100 text-neutral-800 border border-neutral-200' :
                                 event.category === 'Community' ? 'bg-green-100 text-green-700' :
                                 event.category === 'Family' ? 'bg-blue-100 text-blue-700' :
                                 event.category === 'Business' ? 'bg-purple-100 text-purple-700' :
                                 event.category === 'Health & Wellness' ? 'bg-pink-100 text-pink-700' :
                                 event.category === 'Food & Entertainment' ? 'bg-orange-100 text-orange-700' :
                                 event.category === 'Community Service' ? 'bg-red-100 text-red-700' :
                                 event.category === 'Senior Activities' ? 'bg-indigo-100 text-indigo-700' :
                                 event.category === 'Arts & Crafts' ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-neutral-100 text-neutral-700'
                               }`}
                              title={event.title}
                            >
                              {event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-neutral-500 font-medium">
                              +{dayEvents.length - 2} more
                            </div>
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

        {/* Call to Action */}
        <div className="text-center mt-8">
          <Link
            to="/calendar"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>View Full Calendar & Vote on Events</span>
          </Link>
        </div>

        {/* Legend */}
        <div className="mt-8 space-y-4">
          <h4 className="text-center text-sm font-semibold text-neutral-700">Event Sources</h4>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-neutral-100 rounded-full border border-neutral-200"></div>
              <span className="text-neutral-600">Local Events</span>
            </div>
          </div>
          
          <h4 className="text-center text-sm font-semibold text-neutral-700 mt-4">Event Categories</h4>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
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
              <span className="text-neutral-600">Food & Entertainment</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 rounded-full"></div>
              <span className="text-neutral-600">Community Service</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
