import { useEffect, useState } from 'react'
import Calendar from './Calendar'
import { fetchCalendarEvents, type CalendarEvent } from '../pages/Calendar'

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
 * - Displays the Calendar component with loaded events
 * - Handles loading states and error handling
 * 
 * Used on the home page to show upcoming calendar events
 * with proper loading states and error handling.
 */
export default function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const calendarEvents = await fetchCalendarEvents()
        setEvents(calendarEvents)
      } catch (error) {
        console.error('Error loading calendar events:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [])

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

  // Render the Calendar component with loaded events
  return <Calendar events={events} />
}
