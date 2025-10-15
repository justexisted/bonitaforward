import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { deleteBlogPost, fetchAllBlogPosts, upsertBlogPost, uploadBlogImage, deleteBlogImage, type BlogPost } from '../lib/supabaseData'
import { type CalendarEvent } from './Calendar'
// iCalendar parsing moved to server-side Netlify function for reliability
// import { parseMultipleICalFeeds, convertICalToCalendarEvent, ICAL_FEEDS } from '../lib/icalParser'
import type { ProviderChangeRequest, ProviderJobPost } from '../lib/supabaseData'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Extended type for change requests with joined provider and profile data
type ProviderChangeRequestWithDetails = ProviderChangeRequest & {
  providers?: {
    id: string
    name: string
    email: string | null
  }
  profiles?: {
    id: string
    email: string
    name: string | null
  }
}

// Extended type for job posts with provider information
type ProviderJobPostWithDetails = ProviderJobPost & {
  provider?: {
    id: string
    name: string
    email: string | null
  }
  owner?: {
    id: string
    email: string
    name: string | null
  }
}

type ProviderRow = {
  id: string
  name: string
  category_key: string
  tags: string[] | null
  badges: string[] | null
  rating: number | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  images: string[] | null
  owner_user_id: string | null
  is_member?: boolean | null
  // Enhanced featured provider tracking fields
  is_featured?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null // 'monthly' or 'yearly'
  // REMOVED: tier?: string | null - This column doesn't exist in the database
  // REMOVED: paid?: boolean | null - This column doesn't exist in the database
  // Using existing subscription_type, is_member, is_featured fields instead
  // Enhanced business management fields (matching My Business page)
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  bonita_resident_discount?: string | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  // Contact method toggles
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
}

type FunnelRow = {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

type BookingRow = {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

type BusinessApplicationRow = {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null          // ⚠️ Database uses 'category' NOT 'category_key'
  challenge: string | null         // Contains JSON string with all business details
  created_at: string
  tier_requested: string | null    // 'free' or 'featured'
  status: string | null            // 'pending', 'approved', or 'rejected'
}

type ContactLeadRow = {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
  role?: string | null
}

/**
 * Admin page (per-user): Lists the authenticated user's saved funnel responses and bookings.
 * Requires RLS policies to allow users to select their own rows.
 */
export default function AdminPage() {
  const auth = useAuth()
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [flaggedEvents, setFlaggedEvents] = useState<Array<{
    id: string
    event_id: string
    user_id: string
    reason: string
    details: string | null
    created_at: string
    event?: CalendarEvent
    reporter_email?: string
  }>>([])
  const [loading, setLoading] = useState(true)
  
  // Form states for calendar events
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [showBulkImportForm, setShowBulkImportForm] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set())
  const [filteringByZipCode, setFilteringByZipCode] = useState(false)
  // State for zip code filter modal
  const [showZipFilterModal, setShowZipFilterModal] = useState(false)
  const [eventsToFilter, setEventsToFilter] = useState<{
    toDelete: Array<CalendarEvent & { zip: string | null, reason: string }>
    toKeep: Array<CalendarEvent & { zip: string | null }>
  }>({ toDelete: [], toKeep: [] })
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())

  // Function to add a new calendar event
  const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          ...eventData,
          created_at: new Date().toISOString()
        }])
      
      if (error) {
        console.error('Error adding calendar event:', error)
        alert('Failed to add event: ' + error.message)
        return
      }
      
      // Refresh calendar events
      const { fetchCalendarEvents } = await import('./Calendar')
      const events = await fetchCalendarEvents()
      setCalendarEvents(events)
      
      setMessage('Event added successfully!')
    } catch (error) {
      console.error('Error adding calendar event:', error)
      alert('Failed to add event: ' + error)
    }
  }

  // Function to delete a calendar event
  const deleteCalendarEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
      
      if (error) {
        console.error('Error deleting calendar event:', error)
        alert('Failed to delete event: ' + error.message)
        return
      }
      
      // Refresh calendar events
      const { fetchCalendarEvents } = await import('./Calendar')
      const events = await fetchCalendarEvents()
      setCalendarEvents(events)
      
      setMessage('Event deleted successfully!')
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      alert('Failed to delete event: ' + error)
    }
  }

  // Function to start editing a calendar event
  const startEditingEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id)
    setEditingEvent({ ...event })
  }

  // Function to cancel editing
  const cancelEditingEvent = () => {
    setEditingEventId(null)
    setEditingEvent(null)
  }

  // Function to toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  /**
   * Helper function to extract zip code from a string
   */
  const extractZipCode = (locationString: string | null | undefined): string | null => {
    if (!locationString) return null
    const zipMatch = locationString.match(/\b(\d{5})(?:-\d{4})?\b/)
    return zipMatch ? zipMatch[1] : null
  }

  /**
   * Function to analyze and show filter modal for calendar events by zip codes
   * 
   * This function:
   * 1. Extracts zip codes from event locations/addresses
   * 2. Compares against allowed zip codes (within ~20 min of Chula Vista)
   * 3. Shows a modal with checkboxes to select events for deletion
   * 4. Allows reading descriptions before making decisions
   */
  const openZipFilterModal = () => {
    // Allowed zip codes within ~20 min of Chula Vista
    const ALLOWED_ZIP_CODES = new Set([
      '91909', '91910', '91911', '91912', '91913', '91914', '91915', '91921',
      '91902', '91950', '91951', '91932', '91933', '92173', '92154', '92139',
      '92113', '92102', '92101', '91945', '91977', '91978', '91941', '91942',
      '92118'
    ])

    // Analyze events and categorize them
    const toDelete: Array<CalendarEvent & { zip: string | null, reason: string }> = []
    const toKeep: Array<CalendarEvent & { zip: string | null }> = []

    calendarEvents.forEach(event => {
      const locationZip = extractZipCode(event.location)
      const addressZip = extractZipCode(event.address)
      const zip = locationZip || addressZip

      if (!zip) {
        toDelete.push({ ...event, zip: null, reason: 'No zip code found' })
      } else if (!ALLOWED_ZIP_CODES.has(zip)) {
        toDelete.push({ ...event, zip, reason: `Zip ${zip} outside allowed area` })
      } else {
        toKeep.push({ ...event, zip })
      }
    })

    setEventsToFilter({ toDelete, toKeep })
    // Pre-select all events for deletion
    setSelectedEventIds(new Set(toDelete.map(e => e.id)))
    setShowZipFilterModal(true)
  }

  /**
   * Function to execute the deletion of selected events
   */
  const executeZipFilterDeletion = async () => {
    if (selectedEventIds.size === 0) {
      alert('No events selected for deletion.')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedEventIds.size} selected event(s)?\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    setFilteringByZipCode(true)

    try {
      let deletedCount = 0
      for (const eventId of selectedEventIds) {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', eventId)

        if (error) {
          console.error(`Error deleting event:`, error)
        } else {
          deletedCount++
        }
      }

      // Refresh calendar events
      const { fetchCalendarEvents } = await import('./Calendar')
      const events = await fetchCalendarEvents()
      setCalendarEvents(events)

      alert(
        `Zip Code Filtering Complete!\n\n` +
        `❌ Deleted: ${deletedCount} events\n` +
        `Remaining: ${events.length} events`
      )

      // Close modal and reset
      setShowZipFilterModal(false)
      setSelectedEventIds(new Set())
      setEventsToFilter({ toDelete: [], toKeep: [] })

    } catch (error) {
      console.error('Error filtering events by zip code:', error)
      alert('Failed to filter events: ' + error)
    } finally {
      setFilteringByZipCode(false)
    }
  }

  /**
   * Toggle event selection for deletion
   */
  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  /**
   * Select/deselect all events
   */
  const toggleAllEventSelection = () => {
    if (selectedEventIds.size === eventsToFilter.toDelete.length) {
      setSelectedEventIds(new Set())
    } else {
      setSelectedEventIds(new Set(eventsToFilter.toDelete.map(e => e.id)))
    }
  }

  // Function to save edited calendar event
  const saveCalendarEvent = async () => {
    if (!editingEvent) return
    
    try {
      // Parse the date and time to create proper ISO string
      const dateInput = editingEvent.date.split('T')[0] // Get just the date part
      const timeInput = editingEvent.time || '12:00'
      
      // Convert time to 24-hour format if needed
      let timeStr = timeInput.trim()
      const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
      if (ampmMatch) {
        let hours = parseInt(ampmMatch[1])
        const minutes = ampmMatch[2]
        const ampm = ampmMatch[3].toUpperCase()
        
        if (ampm === 'PM' && hours !== 12) {
          hours += 12
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0
        }
        
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes}`
      }
      
      const isoDate = new Date(`${dateInput}T${timeStr}:00`).toISOString()
      
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          date: isoDate,
          time: timeStr,
          location: editingEvent.location,
          address: editingEvent.address,
          category: editingEvent.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEvent.id)
      
      if (error) {
        console.error('Error updating calendar event:', error)
        alert('Failed to update event: ' + error.message)
        return
      }
      
      // Refresh calendar events
      const { fetchCalendarEvents } = await import('./Calendar')
      const events = await fetchCalendarEvents()
      setCalendarEvents(events)
      
      setMessage('Event updated successfully!')
      setEditingEventId(null)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error updating calendar event:', error)
      alert('Failed to update event: ' + error)
    }
  }

  // Function to add multiple events at once
  const addMultipleEvents = async (events: Omit<CalendarEvent, 'id' | 'created_at'>[]) => {
    try {
      const eventsWithTimestamp = events.map(event => ({
        ...event,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('calendar_events')
        .insert(eventsWithTimestamp)
      
      if (error) {
        console.error('Error adding multiple calendar events:', error)
        alert('Failed to add events: ' + error.message)
        return
      }
      
      // Refresh calendar events
      const { fetchCalendarEvents } = await import('./Calendar')
      const updatedEvents = await fetchCalendarEvents()
      setCalendarEvents(updatedEvents)
      
      setMessage(`Successfully added ${events.length} events!`)
      setShowBulkImportForm(false)
      setCsvFile(null)
    } catch (error) {
      console.error('Error adding multiple calendar events:', error)
      alert('Failed to add events: ' + error)
    }
  }
  
  // Function to parse CSV properly handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator - clean the field thoroughly
        result.push(current.trim().replace(/^"|"$/g, '').trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Push last field - clean it thoroughly
    result.push(current.trim().replace(/^"|"$/g, '').trim())
    return result
  }
  
  // Function to process CSV file
  const handleCsvUpload = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/) // Handle both Unix and Windows line endings
      const events: Omit<CalendarEvent, 'id' | 'created_at'>[] = []
      
      // Skip header row if it exists
      const startIndex = lines[0]?.toLowerCase().includes('title') ? 1 : 0
      
      // console.log(`Processing ${lines.length - startIndex} lines from CSV...`)
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // Parse CSV line properly handling quoted fields
        const fields = parseCSVLine(line)
        let [title, dateRaw, time, location, address, category, description] = fields
        
        // Clean all fields thoroughly
        const cleanField = (field: string) => field?.trim().replace(/^["'\s]+|["'\s]+$/g, '') || ''
        title = cleanField(title)
        dateRaw = cleanField(dateRaw)
        time = cleanField(time)
        location = cleanField(location)
        address = cleanField(address)
        category = cleanField(category)
        description = cleanField(description)
        
        if (!title || !dateRaw) {
          console.warn(`Skipping line ${i + 1}: Missing title or date. Fields:`, fields)
          continue
        }
        
        // Check for special recurring/annual events
        const dateClean = dateRaw.toLowerCase().trim()
        const isAnnual = dateClean.includes('annual') || dateClean.includes('yearly')
        const isSeasonal = /spring|summer|fall|autumn|winter/.test(dateClean)
        const isRecurring = isAnnual || isSeasonal || dateClean.includes('ongoing') || dateClean.includes('recurring')
        
        // Parse date - handle multiple formats
        let eventDate: Date
        let eventCategory = category || 'Community'
        
        if (isRecurring) {
          // For recurring events, use a far future date and mark with special source
          eventDate = new Date('2099-12-31T12:00:00')
          eventCategory = 'Recurring' // Special category for filtering
          // console.log(`📅 Recurring event detected on line ${i + 1}: ${title} (${dateRaw})`)
        } else {
          try {
            // Clean date string - remove any non-standard characters but keep digits, hyphens, slashes
            const dateStr = dateRaw.replace(/[^\d\-\/]/g, '').trim()
            
            // console.log(`Parsing date on line ${i + 1}: "${dateRaw}" -> cleaned: "${dateStr}"`)
            
            // ALWAYS use manual parsing - most reliable across all browsers
            let parsedDate: Date | undefined
            
            // Try YYYY-MM-DD format first (most common)
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-')
              // console.log(`  Parts:`, parts, `Length: ${parts.length}, First part length: ${parts[0]?.length}`)
              
              if (parts.length === 3 && parts[0].length === 4) {
                const year = parseInt(parts[0])
                const month = parseInt(parts[1])
                const day = parseInt(parts[2])
                
                // console.log(`  Parsed integers: year=${year}, month=${month}, day=${day}`)
                // console.log(`  Validation: year check=${year >= 2000 && year <= 2100}, month check=${month >= 1 && month <= 12}, day check=${day >= 1 && day <= 31}`)
                
                // Validate ranges
                if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                  // Convert time to 24-hour format if it's in 12-hour format (AM/PM)
                  let timeStr = (time || '12:00').trim()
                  
                  // Check if time has AM/PM
                  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                  if (ampmMatch) {
                    let hours = parseInt(ampmMatch[1])
                    const minutes = ampmMatch[2]
                    const ampm = ampmMatch[3].toUpperCase()
                    
                    // Convert to 24-hour
                    if (ampm === 'PM' && hours !== 12) {
                      hours += 12
                    } else if (ampm === 'AM' && hours === 12) {
                      hours = 0
                    }
                    
                    timeStr = `${hours.toString().padStart(2, '0')}:${minutes}`
                  }
                  
                  const yearStr = year.toString()
                  const monthStr = month.toString().padStart(2, '0')
                  const dayStr = day.toString().padStart(2, '0')
                  
                  const dateTimeStr = `${yearStr}-${monthStr}-${dayStr}T${timeStr}:00`
                  parsedDate = new Date(dateTimeStr)
                  
                  if (!isNaN(parsedDate.getTime())) {
                    // console.log(`  ✓ Parsed as YYYY-MM-DD: ${parsedDate.toISOString()}`)
                  }
                } else {
                  // console.log(`  ✗ Validation failed!`)
                }
              } else {
                // console.log(`  ✗ Parts check failed`)
              }
            }
            // Try MM/DD/YYYY format
            else if (dateStr.includes('/')) {
              const parts = dateStr.split('/')
              if (parts.length === 3) {
                const month = parseInt(parts[0])
                const day = parseInt(parts[1])
                let year = parseInt(parts[2])
                
                // Handle 2-digit years
                if (year < 100) {
                  year += 2000
                }
                
                // Validate ranges
                if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                  // Convert time to 24-hour format if it's in 12-hour format (AM/PM)
                  let timeStr = (time || '12:00').trim()
                  
                  // Check if time has AM/PM
                  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                  if (ampmMatch) {
                    let hours = parseInt(ampmMatch[1])
                    const minutes = ampmMatch[2]
                    const ampm = ampmMatch[3].toUpperCase()
                    
                    // Convert to 24-hour
                    if (ampm === 'PM' && hours !== 12) {
                      hours += 12
                    } else if (ampm === 'AM' && hours === 12) {
                      hours = 0
                    }
                    
                    timeStr = `${hours.toString().padStart(2, '0')}:${minutes}`
                  }
                  
                  const yearStr = year.toString()
                  const monthStr = month.toString().padStart(2, '0')
                  const dayStr = day.toString().padStart(2, '0')
                  
                  parsedDate = new Date(`${yearStr}-${monthStr}-${dayStr}T${timeStr}:00`)
                  
                  if (!isNaN(parsedDate.getTime())) {
                    // console.log(`  ✓ Parsed as MM/DD/YYYY: ${parsedDate.toISOString()}`)
                  }
                }
              }
            }
            
            if (!parsedDate || isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date')
            }
            
            eventDate = parsedDate
          } catch (err) {
            console.warn(`Skipping line ${i + 1} with invalid date: "${dateRaw}" (cleaned: "${dateRaw.replace(/[^\d\-\/]/g, '')}"). Expected format: YYYY-MM-DD or MM/DD/YYYY`)
            continue
          }
        }
        
        // Add description note for recurring events
        let finalDescription = description
        if (isRecurring) {
          finalDescription = `[${dateRaw}] ${description || ''}`.trim()
        }
        
        events.push({
          title,
          description: finalDescription,
          date: eventDate.toISOString(),
          time: time || '12:00',
          location,
          address,
          category: eventCategory,
          source: isRecurring ? 'Recurring' : 'Local',
          upvotes: 0,
          downvotes: 0
        })
        
        // console.log(`✓ Parsed line ${i + 1}: ${title}${isRecurring ? ' (Recurring)' : ''}`)
      }
      
      // console.log(`Successfully parsed ${events.length} events`)
      
      if (events.length === 0) {
        alert('No valid events found in CSV file.\n\nPlease ensure:\n- File has required columns: Title, Date, Time, Location, Address, Category, Description\n- Date format is YYYY-MM-DD (e.g., 2025-01-15) or MM/DD/YYYY\n- Each row has at least a title and date\n\nCheck the browser console for detailed error messages.')
        return
      }
      
      await addMultipleEvents(events)
    } catch (error) {
      console.error('Error processing CSV file:', error)
      alert('Failed to process CSV file: ' + error)
    }
  }

  // Function to add sample Bonita events (only when requested)
  const addSampleBonitaEvents = async () => {
    const sampleEvents = [
      {
        title: 'Bonita Farmers Market',
        description: 'Weekly farmers market featuring local produce, artisanal goods, and community vendors.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: '09:00',
        location: 'Bonita Community Park',
        address: '3215 Bonita Rd, Bonita, CA 91902',
        category: 'Community',
        source: 'Local',
        upvotes: 12,
        downvotes: 1,
      },
      {
        title: 'Children\'s Story Time',
        description: 'Interactive story time for children ages 3-8 with crafts and activities.',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: '10:30',
        location: 'Bonita-Sunnyside Library',
        address: '4375 Bonita Rd, Bonita, CA 91902',
        category: 'Family',
        source: 'Local',
        upvotes: 8,
        downvotes: 0,
      },
      {
        title: 'Bonita Chamber Mixer',
        description: 'Monthly networking event for local business owners and community leaders.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        time: '17:30',
        location: 'Bonita Community Center',
        address: '2900 Bonita Rd, Bonita, CA 91902',
        category: 'Business',
        source: 'Local',
        upvotes: 15,
        downvotes: 2,
      }
    ]

    try {
      // Clear existing events first
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all events
      
      if (deleteError) {
        console.warn('Error clearing existing events:', deleteError)
      }

      // Add sample events
      await addMultipleEvents(sampleEvents)
    } catch (error) {
      console.error('Error adding sample events:', error)
      alert('Failed to add sample events: ' + error)
    }
  }

  // Function to refresh iCalendar feeds using server-side Netlify function
  const refreshICalFeedsServer = async () => {
    try {
      setMessage('Triggering server-side iCalendar refresh...')
      
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/manual-fetch-events` : '/.netlify/functions/manual-fetch-events'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage(`Successfully fetched ${result.totalEvents} events from ${result.processedFeeds} feeds!`)
        
        // Refresh the calendar events list
        const { fetchCalendarEvents } = await import('./Calendar')
        const events = await fetchCalendarEvents()
        setCalendarEvents(events)
      } else {
        setError(`Server returned error: ${result.message || result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error calling manual-fetch-events:', error)
      setError('Failed to trigger server fetch: ' + error)
    }
  }

  // Function to refresh Voice of San Diego events using server-side Netlify function
  const refreshVosdEvents = async () => {
    try {
      setMessage('Fetching Voice of San Diego events...')
      
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/fetch-vosd-events` : '/.netlify/functions/fetch-vosd-events'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage(`Successfully fetched ${result.totalEvents} events from Voice of San Diego!`)
        
        // Refresh the calendar events list
        const { fetchCalendarEvents } = await import('./Calendar')
        const events = await fetchCalendarEvents()
        setCalendarEvents(events)
      } else {
        setError(`Server returned error: ${result.message || result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error calling fetch-vosd-events:', error)
      setError('Failed to fetch Voice of San Diego events: ' + error)
    }
  }

  // Function to refresh KPBS events using server-side Netlify function
  const refreshKpbsEvents = async () => {
    try {
      setMessage('Fetching KPBS events...')
      
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/fetch-kpbs-events` : '/.netlify/functions/fetch-kpbs-events'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage(`Successfully fetched ${result.totalEvents} events from KPBS (${result.processedPages} pages)!`)
        
        // Refresh the calendar events list
        const { fetchCalendarEvents } = await import('./Calendar')
        const events = await fetchCalendarEvents()
        setCalendarEvents(events)
      } else {
        setError(`Server returned error: ${result.message || result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error calling fetch-kpbs-events:', error)
      setError('Failed to fetch KPBS events: ' + error)
    }
  }
  
  // Old client-side refresh kept as fallback (CORS issues make this unreliable)
  // Use refreshICalFeedsServer() instead
  /* const refreshICalFeeds = async () => {
    try {
      // console.log('Refreshing iCalendar feeds (client-side)...')
      const icalEvents = await parseMultipleICalFeeds(ICAL_FEEDS)
      const calendarEvents = icalEvents.map(convertICalToCalendarEvent)
      
      if (calendarEvents.length === 0) {
        setMessage('No events found in iCalendar feeds')
        return
      }
      
      // Clear existing iCalendar events (those with source matching our feeds)
      const icalSources = ICAL_FEEDS.map(feed => feed.source)
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('source', icalSources)
      
      if (deleteError) {
        console.warn('Error clearing existing iCalendar events:', deleteError)
      }
      
      // Add new iCalendar events
      await addMultipleEvents(calendarEvents)
      setMessage(`Successfully refreshed ${calendarEvents.length} events from iCalendar feeds!`)
    } catch (error) {
      console.error('Error refreshing iCalendar feeds:', error)
      setError('Failed to refresh iCalendar feeds: ' + error)
    }
  } */
  const [error, setError] = useState<string | null>(null)
  const [bizApps, setBizApps] = useState<BusinessApplicationRow[]>([])
  const [contactLeads, setContactLeads] = useState<ContactLeadRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogDraft, setBlogDraft] = useState<{ id?: string; category_key: string; title: string; content: string; images?: string[] }>({ category_key: 'restaurants-cafes', title: '', content: '', images: [] })
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiQuery, setEmojiQuery] = useState('')
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [jobPosts, setJobPosts] = useState<ProviderJobPostWithDetails[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deletingCustomerEmail, setDeletingCustomerEmail] = useState<string | null>(null)
  const [expandedChangeRequestIds, setExpandedChangeRequestIds] = useState<Set<string>>(new Set())
  const [expandedBusinessDropdowns, setExpandedBusinessDropdowns] = useState<Set<string>>(new Set())
  const [editFunnel, setEditFunnel] = useState<Record<string, string>>({})
  const [editBooking, setEditBooking] = useState<Record<string, { name?: string; notes?: string; answers?: string; status?: string }>>({})
  const [expandedBusinessDetails, setExpandedBusinessDetails] = useState<Record<string, any>>({})
  const [loadingBusinessDetails, setLoadingBusinessDetails] = useState<Record<string, boolean>>({})
  // Filter state for funnel responses - allows filtering by specific user email
  const [funnelUserFilter, setFunnelUserFilter] = useState<string>('')
  // Filter state for featured providers - allows toggling between all, featured, and non-featured
  const [featuredProviderFilter, setFeaturedProviderFilter] = useState<'all' | 'featured' | 'non-featured'>('all')
  // Loading state for provider save operations
  const [savingProvider, setSavingProvider] = useState(false)
  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false)
  // Retry state for failed saves
  const [retryProvider, setRetryProvider] = useState<ProviderRow | null>(null)
  // State for selected provider being edited
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  // State for creating new provider
  const [isCreatingNewProvider, setIsCreatingNewProvider] = useState(false)
  const [newProviderForm, setNewProviderForm] = useState<Partial<ProviderRow>>({
    name: '',
    category_key: 'professional-services',
    tags: [],
    badges: [],
    rating: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    images: [],
    owner_user_id: null,
    is_member: false,
    is_featured: false,
    featured_since: null,
    subscription_type: null,
    description: null,
    specialties: null,
    social_links: null,
    business_hours: null,
    service_areas: null,
    google_maps_url: null,
    bonita_resident_discount: null,
    published: true,
    created_at: null,
    updated_at: null,
    booking_enabled: false,
    booking_type: null,
    booking_instructions: null,
    booking_url: null
  })
  // State for selected section
  const [section, setSection] = useState< 'providers' |'business-applications' | 'contact-leads' | 'customer-users' | 'business-accounts' | 'business-owners' | 'users' | 'owner-change-requests' | 'job-posts' | 'funnel-responses' | 'bookings' | 'blog' | 'calendar-events' | 'flagged-events'>('providers')

  // Filtered providers based on featured status filter
  // This allows admins to easily view all providers, only featured ones, or only non-featured ones
  const filteredProviders = useMemo(() => {
    if (featuredProviderFilter === 'all') {
      return providers
    } else if (featuredProviderFilter === 'featured') {
      return providers.filter(provider => provider.is_featured === true || provider.is_member === true)
    } else {
      return providers.filter(provider => !provider.is_featured && !provider.is_member)
    }
  }, [providers, featuredProviderFilter])

  /**
   * TOGGLE FEATURED STATUS
   * 
   * This function allows admins to toggle a provider's featured status.
   * It handles both is_featured and is_member fields to ensure proper toggling.
   * When making featured, it sets both is_featured=true and featured_since timestamp.
   * When removing featured, it sets both is_featured=false and is_member=false.
   */
  const toggleFeaturedStatus = async (providerId: string, currentStatus: boolean) => {
    // ADD THIS: Check if session is still valid before updating featured status
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expired. Please refresh the page and try again.')
      return
    }
    try {
      setMessage('Updating featured status...')
      
      // Always update both is_featured and is_member to ensure consistent state
      const updateData: Partial<ProviderRow> = {
        is_featured: !currentStatus,
        is_member: !currentStatus, // Keep both fields in sync
        updated_at: new Date().toISOString()
      }
      
      // If making featured, set the featured_since timestamp
      if (!currentStatus) {
        updateData.featured_since = new Date().toISOString()
      } else {
        // If removing featured status, clear the featured_since timestamp
        updateData.featured_since = null
      }
      
      // console.log('[Admin] Toggling featured status:', { providerId, currentStatus, updateData })
      
      const { error } = await supabase
        .from('providers')
        .update(updateData)
        .eq('id', providerId)

      if (error) {
        console.error('[Admin] Error updating featured status:', error)
        throw error
      }

      // console.log('[Admin] Featured status updated successfully')
      setMessage(`Provider ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`)
      
      // Refresh providers data
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      setProviders((pData as ProviderRow[]) || [])
    } catch (error: any) {
      console.error('[Admin] Error in toggleFeaturedStatus:', error)
      setMessage(`Error updating featured status: ${error.message}`)
    }
  }

  /**
   * UPDATE SUBSCRIPTION TYPE
   * 
   * This function allows admins to update a provider's subscription type (monthly/yearly).
   */
  const updateSubscriptionType = async (providerId: string, subscriptionType: 'monthly' | 'yearly') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expired. Please refresh the page and try again.')
      return
    }
    try {
      setMessage('Updating subscription type...')
      
      const { error } = await supabase
        .from('providers')
        .update({
          subscription_type: subscriptionType,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)

      if (error) throw error

      setMessage(`Subscription type updated to ${subscriptionType}!`)
      
      // Refresh providers data
      const { data: pData } = await supabase
        .from('providers')
        .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
        .order('name', { ascending: true })
      setProviders((pData as ProviderRow[]) || [])
    } catch (error: any) {
      setMessage(`Error updating subscription type: ${error.message}`)
    }
  }

  /**
   * LOAD CHANGE REQUESTS
   * 
   * This function loads all change requests from the database for admin review.
   * It fetches all change requests ordered by creation date (newest first).
   * 
   * How it works:
   * 1. Queries the provider_change_requests table
   * 2. Orders by created_at descending to show newest requests first
   * 3. Updates the changeRequests state with the fetched data
   * 
   * This provides the admin with a complete list of all pending change requests.
   */
  const loadChangeRequests = async () => {
    try {
      // console.log('========================================')
      console.log('[Admin] STARTING loadChangeRequests')  // KEPT: Change request logging
      // console.log('========================================')
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      // console.log('[Admin] Session check:', {
      //   hasSession: !!session,
      //   hasToken: !!session?.access_token,
      //   tokenLength: session?.access_token?.length
      // })
      
      if (!session?.access_token) {
        console.error('[Admin] ❌ No auth token available')
        setError('Not authenticated')
        return
      }

      // console.log('[Admin] ✓ Auth token acquired, calling Netlify function...')

      // Call Netlify function that uses service role to bypass RLS and auto-create missing profiles
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      // VITE_FN_BASE_URL should NOT include /.netlify/functions - just the base URL
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-change-requests` : '/.netlify/functions/admin-list-change-requests'
      // console.log('[Admin] Fetching from:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // console.log('[Admin] Response received:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok
      // })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Admin] ❌ Error response body:', errorText)
        setError(`Failed to load change requests (HTTP ${response.status}): ${errorText}`)
        return
      }

      const result = await response.json()
      // console.log('[Admin] ✓ JSON parsed successfully')
      // console.log('[Admin] Result structure:', {
      //   hasRequests: !!result.requests,
      //   requestCount: result.requests?.length || 0,
      //   firstRequest: result.requests?.[0] ? {
      //     id: result.requests[0].id,
      //     type: result.requests[0].type,
      //     hasProfiles: !!result.requests[0].profiles,
      //     profileEmail: result.requests[0].profiles?.email,
      //     profileName: result.requests[0].profiles?.name
      //   } : 'No requests'
      // })
      
      if (!result.requests) {
        console.error('[Admin] ❌ Result has no requests property:', result)
        setError('Invalid response from server')
        return
      }
      
      console.log('[Admin] ✓ Setting changeRequests state with', result.requests.length, 'items')  // KEPT: Change request logging
      setChangeRequests(result.requests)
      // console.log('[Admin] ✓ State updated successfully')
      // console.log('========================================')
      
    } catch (error: any) {
      console.error('========================================')
      console.error('[Admin] ❌ EXCEPTION in loadChangeRequests:', error)
      console.error('[Admin] Error stack:', error.stack)
      console.error('========================================')
      setError(`Failed to load change requests: ${error.message}`)
    }
  }

  useEffect(() => {
    // Load content into editor when switching drafts
    if (editorRef.current) {
      editorRef.current.innerHTML = blogDraft.content || ''
    }
  }, [blogDraft.id])

  function syncEditorToState() {
    if (!editorRef.current) return
    setBlogDraft((d) => ({ ...d, content: editorRef.current!.innerHTML }))
  }

  // Restore admin state when page loads
  useEffect(() => {
    const savedState = localStorage.getItem('admin-state')
    if (savedState) {
      try {
        const { section: savedSection, selectedProviderId: savedProviderId, timestamp } = JSON.parse(savedState)
        
        // Only restore if it's recent (within 2 hours)
        if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
          setSection(savedSection)
          setSelectedProviderId(savedProviderId)
        }
      } catch (err) {
        console.error('Failed to restore admin state:', err)
      }
    }
  }, [])

  // Save admin state when it changes
  useEffect(() => {
    if (section === 'providers' && selectedProviderId) {
      localStorage.setItem('admin-state', JSON.stringify({
        section: 'providers',
        selectedProviderId: selectedProviderId,
        timestamp: Date.now()
      }))
    }
  }, [section, selectedProviderId])

  // Clear saved state function
  const clearSavedState = () => {
    localStorage.removeItem('admin-state')
    setSelectedProviderId(null)
  }

  // Function to start creating a new provider
  const startCreateNewProvider = () => {
    setIsCreatingNewProvider(true)
    setSelectedProviderId(null) // Clear any selected provider
    setMessage(null)
    setError(null)
    // Reset form to default values
    setNewProviderForm({
      name: '',
      category_key: 'professional-services',
      tags: [],
      badges: [],
      rating: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      images: [],
      owner_user_id: null,
      is_member: false,
      is_featured: false,
      featured_since: null,
      subscription_type: null,
      description: null,
      specialties: null,
      social_links: null,
      business_hours: null,
      service_areas: null,
      google_maps_url: null,
      bonita_resident_discount: null,
      published: true,
      created_at: null,
      updated_at: null,
      booking_enabled: false,
      booking_type: null,
      booking_instructions: null,
      booking_url: null
    })
  }

  // Function to cancel creating new provider
  const cancelCreateProvider = () => {
    setIsCreatingNewProvider(false)
    setSelectedProviderId(null)
    setMessage(null)
    setError(null)
    // Reset form to default values
    setNewProviderForm({
      name: '',
      category_key: 'professional-services',
      tags: [],
      badges: [],
      rating: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      images: [],
      owner_user_id: null,
      is_member: false,
      is_featured: false,
      featured_since: null,
      subscription_type: null,
      description: null,
      specialties: null,
      social_links: null,
      business_hours: null,
      service_areas: null,
      google_maps_url: null,
      bonita_resident_discount: null,
      published: true,
      created_at: null,
      updated_at: null,
      booking_enabled: false,
      booking_type: null,
      booking_instructions: null,
      booking_url: null
    })
  }

  function applyFormat(cmd: string, value?: string) {
    try {
      editorRef.current?.focus()
      document.execCommand(cmd, false, value)
      syncEditorToState()
    } catch {}
  }

  function wrapSelectionWith(tag: string, className?: string, style?: string) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const text = sel.toString()
    if (!text) return
    const cls = className ? ` class=\"${className}\"` : ''
    const st = style ? ` style=\"${style}\"` : ''
    const html = `<${tag}${cls}${st}>${text}</${tag}>`
    document.execCommand('insertHTML', false, html)
    syncEditorToState()
    editorRef.current?.focus()
  }


  function clearFormattingToNormal() {
    try {
      editorRef.current?.focus()
      document.execCommand('removeFormat')
      document.execCommand('formatBlock', false, 'P')
      syncEditorToState()
    } catch {}
  }

  function insertEmoji(emoji: string) {
    try {
      document.execCommand('insertText', false, emoji)
      syncEditorToState()
      editorRef.current?.focus()
    } catch {}
  }

  const allEmojis = ['😀','😁','😂','🤣','😊','😇','🙂','😉','😍','😘','😋','😎','🤩','🥳','🤗','🤔','😴','🤤','🤓','🫶','👍','🔥','⭐','✨','💫','🎉','🏆','🥇','💡','📣','✅','🍔','🍟','🌮','🍣','🍕','🥗','🍜','🍩','☕','🍵','🍺','🍷','🥂','🏡','🏠','🏘️','🔑','📈','💼','⚖️','🧮','🤝','🧘','🏋️','💆','💅','🧴','🧑‍🍳','👨‍🍳','🧑‍🏫','📚','🛠️','🔧','🌿','🌞','🌧️','🌈']
  const filteredEmojis = allEmojis.filter((e) => e.includes(emojiQuery.trim()))
  // Secure server-side admin verification with client-side fallback
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean
    loading: boolean
    verified: boolean
    error?: string
  }>({ isAdmin: false, loading: true, verified: false })
  
  // Legacy client-side check for fallback
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
  const isClientAdmin = useMemo(() => !!auth.email && adminList.includes(auth.email.toLowerCase()), [auth.email, adminList])

  /**
   * CRITICAL FIX: Admin verification race condition
   * 
   * Issue: Admin verification re-runs during auth state changes, causing isAdmin to flip from true to false.
   * 
   * Root cause: useEffect runs on every auth.email change, including during auth initialization.
   * During auth state transitions, auth.email might be temporarily undefined or the verification fails.
   * 
   * Fix: Only run verification once when auth is fully loaded, and cache the result.
   */
  useEffect(() => {
    async function verifyAdmin() {
      // console.log('[Admin] Admin verification triggered for:', auth.email, 'loading:', auth.loading)
      
      if (!auth.email) {
        // console.log('[Admin] No email, setting admin status to false')
        setAdminStatus({ isAdmin: false, loading: false, verified: false })
        return
      }

      // CRITICAL: Don't re-verify if already verified for this email
      if (adminStatus.verified && adminStatus.isAdmin && auth.email) {
        // console.log('[Admin] Already verified as admin for this email, skipping re-verification')
        return
      }

      // CRITICAL: Don't verify during auth loading to prevent race conditions
      if (auth.loading) {
        // console.log('[Admin] Auth still loading, skipping verification')
        return
      }

      // console.log('[Admin] Starting admin verification for:', auth.email)
      setAdminStatus(prev => ({ ...prev, loading: true }))

      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        
        if (!token) {
          // console.log('[Admin] No auth token, using client-side admin check:', isClientAdmin)
          setAdminStatus({ isAdmin: isClientAdmin, loading: false, verified: false })
          return
        }

        // For local dev: use http://localhost:8888 (Netlify Dev port)
        // For production: use relative URL (/.netlify/functions/...)
        const isLocal = window.location.hostname === 'localhost'
        const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-verify` : '/.netlify/functions/admin-verify'
      
      // console.log('[Admin] Making server verification request to:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      })
      
      // console.log('[Admin] Server verification response:', response.status, response.ok)

        if (response.ok) {
          const result = await response.json()
          // console.log('[Admin] Server verification result:', result)
          setAdminStatus({
            isAdmin: result.isAdmin,
            loading: false,
            verified: true
          })
        } else {
          // console.log('[Admin] Server verification failed, using client-side check:', isClientAdmin)
          // Fallback to client-side check if server verification fails
          setAdminStatus({
            isAdmin: isClientAdmin,
            loading: false,
            verified: false,
            error: 'Server verification unavailable'
          })
        }
      } catch (err) {
        // console.log('[Admin] Server verification error, using client-side check:', isClientAdmin, 'Error:', err)
        // Fallback to client-side check on error
        setAdminStatus({
          isAdmin: isClientAdmin,
          loading: false,
          verified: false,
          error: 'Server verification failed'
        })
      }
    }

    /**
     * CRITICAL FIX: Prevent re-verification during auth state changes
     * 
     * Issue: useEffect was running on every isClientAdmin change, which happens
     * during auth state updates, causing admin status to flip from true to false.
     * 
     * Root cause: isClientAdmin is a computed value that changes during auth updates,
     * triggering unnecessary re-verification that fails.
     * 
     * Fix: Only run verification when email changes AND auth is not loading.
     * Remove isClientAdmin from dependencies to prevent unnecessary re-runs.
     */
    
    // Only verify when email changes and auth is stable (not loading)
    if (!auth.loading) {
    verifyAdmin()
    }
  }, [auth.email, auth.loading]) // Removed isClientAdmin dependency

  const isAdmin = adminStatus.isAdmin
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!auth.email) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        // console.log('[Admin] loading data. isAdmin?', isAdmin, 'selectedUser', selectedUser)
        const fQuery = supabase.from('funnel_responses').select('*').order('created_at', { ascending: false })
        const bQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false })
        const fExec = isAdmin ? (selectedUser ? fQuery.eq('user_email', selectedUser) : fQuery) : fQuery.eq('user_email', auth.email!)
        const bExec = isAdmin ? (selectedUser ? bQuery.eq('user_email', selectedUser) : bQuery) : bQuery.eq('user_email', auth.email!)
        const bizQuery = supabase.from('business_applications').select('*').order('created_at', { ascending: false })
        const conQuery = supabase.from('contact_leads').select('*').order('created_at', { ascending: false })
        // Enhanced providers query with all featured tracking fields
        const provQuery = isAdmin ? supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true }) : null
        const [{ data: fData, error: fErr }, { data: bData, error: bErr }, { data: bizData, error: bizErr }, { data: conData, error: conErr }, provRes] = await Promise.all([
          fExec,
          bExec,
          bizQuery,
          conQuery,
          provQuery as any,
        ])
        if (cancelled) return
        if (fErr) { console.error('[Admin] funnels error', fErr); setError(fErr.message) }
        if (bErr) { console.error('[Admin] bookings error', bErr); setError((prev) => prev ?? bErr.message) }
        if (bizErr) { console.error('[Admin] business_applications error', bizErr); setError((prev) => prev ?? bizErr.message) }
        if (conErr) { console.error('[Admin] contact_leads error', conErr); setError((prev) => prev ?? conErr.message) }
        // console.log('[Admin] funnels', fData)
        // console.log('[Admin] bookings', bData)
        console.log('[Admin] business_applications', bizData)  // KEPT: Business application logging
        // console.log('[Admin] contact_leads', conData)
        setFunnels((fData as FunnelRow[]) || [])
        setBookings((bData as BookingRow[]) || [])
        setBizApps((bizData as BusinessApplicationRow[]) || [])
        setContactLeads((conData as ContactLeadRow[]) || [])
        if (provRes && 'data' in (provRes as any)) {
          const { data: pData, error: pErr } = (provRes as any)
          if (pErr) { console.error('[Admin] providers error', pErr); setError((prev) => prev ?? pErr.message) }
          setProviders((pData as ProviderRow[]) || [])
        }
        try {
          const posts = await fetchAllBlogPosts()
          setBlogPosts(posts)
        } catch {}
        try {
          // Load calendar events for admin panel
          if (isAdmin && section === 'calendar-events') {
            const { fetchCalendarEvents } = await import('./Calendar')
            const events = await fetchCalendarEvents()
            setCalendarEvents(events)
          }
        } catch {}
        try {
          // Load flagged events for admin panel (always load for pending approvals notification)
          if (isAdmin) {
            const { data: flags, error: flagsError } = await supabase
              .from('event_flags')
              .select('*, calendar_events(*), profiles(email)')
              .order('created_at', { ascending: false })
            
            if (flagsError) {
              // Table might not exist yet or foreign key issue - log detailed error
              console.warn('[Admin] Could not load flagged events (table may not exist yet):', flagsError.message, flagsError.code)
              // Set empty array so the UI doesn't break
              setFlaggedEvents([])
            } else {
              // Transform the data to include event and reporter info
              const transformedFlags = (flags || []).map((flag: any) => ({
                id: flag.id,
                event_id: flag.event_id,
                user_id: flag.user_id,
                reason: flag.reason,
                details: flag.details,
                created_at: flag.created_at,
                event: flag.calendar_events,
                reporter_email: flag.profiles?.email || 'Unknown'
              }))
              setFlaggedEvents(transformedFlags)
            }
          }
        } catch (err) {
          console.warn('[Admin] Exception loading flagged events:', err)
          setFlaggedEvents([])
        }
        try {
          if (isAdmin) {
            const { data: session } = await supabase.auth.getSession()
            const token = session.session?.access_token
            
          if (token) {
            // For local dev: use http://localhost:8888 (Netlify Dev port)
            // For production: use relative URL (/.netlify/functions/...)
            const isLocal = window.location.hostname === 'localhost'
            const fnBase = isLocal ? 'http://localhost:8888' : ''
            const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-profiles` : '/.netlify/functions/admin-list-profiles'
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              if (res.ok) {
                const payload = await res.json() as { profiles?: ProfileRow[] }
                if (payload?.profiles) setProfiles(payload.profiles)
              }
            }
          }
        } catch {}
        try {
          // Load change requests using Netlify function (bypasses RLS with SERVICE_ROLE_KEY)
          await loadChangeRequests()
        } catch {}
        try {
          // console.log('[Admin] Loading job posts with provider details...')
          
          // Load job posts
          const { data: jpData, error: jpError } = await supabase
            .from('provider_job_posts')
            .select('*')
            .order('created_at', { ascending: false })
          
          // console.log('[Admin] Job posts query result:', { error: jpError, data: jpData, count: jpData?.length || 0 })
          
          if (jpError) {
            console.error('[Admin] Job posts query error:', jpError)
            setError(`Failed to load job posts: ${jpError.message}`)
          } else if (jpData && jpData.length > 0) {
            // Get unique provider IDs and owner IDs
            const providerIds = [...new Set(jpData.map(j => j.provider_id).filter(Boolean))]
            const ownerIds = [...new Set(jpData.map(j => j.owner_user_id).filter(Boolean))]
            
            // Fetch provider details
            const { data: providersData } = await supabase
              .from('providers')
              .select('id, name, email')
              .in('id', providerIds)
            
            // Fetch owner (user) details
            const { data: ownersData } = await supabase
              .from('profiles')
              .select('id, email, name')
              .in('id', ownerIds)
            
            // Combine data
            const jobsWithDetails: ProviderJobPostWithDetails[] = jpData.map(job => {
              const provider = providersData?.find(p => p.id === job.provider_id)
              const owner = ownersData?.find(o => o.id === job.owner_user_id)
              return {
                ...job,
                provider: provider || undefined,
                owner: owner || undefined
              }
            })
            
            setJobPosts(jobsWithDetails)
            // console.log('[Admin] Loaded', jobsWithDetails.length, 'job posts with provider details')
          } else {
            setJobPosts([])
          }
        } catch (err) {
          console.error('[Admin] Error loading job posts:', err)
          setError('Failed to load job posts')
          // Try a simpler fallback query
          try {
            // console.log('[Admin] Trying fallback query...')
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('provider_job_posts')
              .select('id, provider_id, owner_user_id, title, status, created_at')
              .order('created_at', { ascending: false })
            
            // console.log('[Admin] Fallback query result:', { error: fallbackError, data: fallbackData })
            
            if (!fallbackError && fallbackData) {
              // Use fallback data with minimal fields
              const minimalJobs: ProviderJobPostWithDetails[] = (fallbackData || []).map(job => ({
                ...job,
                description: null,
                apply_url: null,
                salary_range: null,
                decided_at: null,
                provider: undefined,
                owner: undefined
              }))
              setJobPosts(minimalJobs)
              // console.log('[Admin] Using fallback job data:', minimalJobs)
            } else {
              setJobPosts([])
            }
          } catch (fallbackErr) {
            console.error('[Admin] Fallback query also failed:', fallbackErr)
            setJobPosts([])
          }
        }
      } catch (err: any) {
        console.error('[Admin] unexpected failure', err)
        if (!cancelled) setError(err?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [auth.email, isAdmin, selectedUser, section])

  // Normalizers
  const normalizeEmail = (e?: string | null) => String(e || '').trim().toLowerCase()
  const normalizeRole = (r?: string | null) => String(r || '').trim().toLowerCase()

  // Emails of business owners (from profiles)
  const businessEmails = useMemo(() => {
    return new Set(
      profiles
        .filter((p) => normalizeRole(p.role) === 'business')
        .map((p) => normalizeEmail(p.email))
        .filter(Boolean)
    )
  }, [profiles])

  // Customer users: emails present in funnels/bookings, excluding business owner emails
  const customerUsers = useMemo(() => {
    const set = new Set<string>()
    funnels.forEach((f) => { const e = normalizeEmail(f.user_email); if (e) set.add(e) })
    bookings.forEach((b) => { const e = normalizeEmail(b.user_email); if (e) set.add(e) })
    return Array.from(set)
      .filter((e) => !businessEmails.has(normalizeEmail(e)))
      .sort()
  }, [funnels, bookings, businessEmails])

  // Filtered funnel responses based on user email filter
  // This allows admins to view responses from specific users to avoid overwhelming display
  const filteredFunnels = useMemo(() => {
    if (!funnelUserFilter.trim()) {
      // If no filter is set, show all funnel responses
      return funnels
    }
    // Filter funnels by user email (case-insensitive partial match)
    const filterLower = funnelUserFilter.toLowerCase().trim()
    return funnels.filter(funnel => 
      funnel.user_email.toLowerCase().includes(filterLower)
    )
  }, [funnels, funnelUserFilter])

  // Removed legacy businessAccounts (email-derived). Business accounts now come from profiles.role === 'business'.

  // Inline helpers for admin edits
  const [appEdits, setAppEdits] = useState<Record<string, { category: string; tagsInput: string }>>({})

  // Auto-populate tags from challenge data when applications load
  useEffect(() => {
    if (bizApps.length > 0) {
      const newEdits: Record<string, { category: string; tagsInput: string }> = {}
      bizApps.forEach(app => {
        if (!appEdits[app.id]) {  // Only initialize if not already edited
          try {
            const challengeData = app.challenge ? JSON.parse(app.challenge) : {}
            const tags = Array.isArray(challengeData.tags) ? challengeData.tags : []
            newEdits[app.id] = {
              category: app.category || 'professional-services',
              tagsInput: tags.join(', ')  // Pre-populate with tags from application
            }
          } catch {
            newEdits[app.id] = {
              category: app.category || 'professional-services',
              tagsInput: ''
            }
          }
        }
      })
      if (Object.keys(newEdits).length > 0) {
        setAppEdits(prev => ({ ...prev, ...newEdits }))
      }
    }
  }, [bizApps])

  const catOptions: { key: string; name: string }[] = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' },
  ]

  async function approveApplication(appId: string) {
    setMessage(null)
    const app = bizApps.find((b) => b.id === appId)
    if (!app) return
    
    // Parse the challenge field which contains all the business details as JSON
    let challengeData: any = {}
    try {
      if (app.challenge) {
        challengeData = JSON.parse(app.challenge)
      }
    } catch (err) {
      console.error('[Admin] Error parsing challenge data:', err)
    }
    
    // Get admin-edited category and tags, or fall back to application's category
    const draft = appEdits[appId] || { category: app.category || 'professional-services', tagsInput: '' }
    const adminTags = draft.tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    
    // Combine tags from challenge data and admin input
    const challengeTags = Array.isArray(challengeData.tags) ? challengeData.tags : []
    const allTags = [...new Set([...challengeTags, ...adminTags])]  // Remove duplicates
    
    // Attempt to find a profile/user by the application's email so we can assign ownership to the applicant
    let ownerUserId: string | null = null
    try {
      if (app.email) {
        const { data: profRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', app.email)
          .limit(1)
        ownerUserId = ((profRows as any[])?.[0]?.id as string | undefined) || null
      }
    } catch {}
    
    // Create provider with ALL data from the application
    const payload: Partial<ProviderRow> = {
      name: (app.business_name || 'Unnamed Business') as any,
      category_key: draft.category as any,
      tags: allTags as any,
      phone: (app.phone || null) as any,
      email: (app.email || null) as any,
      website: (challengeData.website || null) as any,
      address: (challengeData.address || null) as any,
      description: (challengeData.description || null) as any,
      images: (Array.isArray(challengeData.images) ? challengeData.images : []) as any,
      specialties: (Array.isArray(challengeData.specialties) ? challengeData.specialties : []) as any,
      social_links: (challengeData.social_links || {}) as any,
      business_hours: (challengeData.business_hours || {}) as any,
      service_areas: (Array.isArray(challengeData.service_areas) ? challengeData.service_areas : []) as any,
      google_maps_url: (challengeData.google_maps_url || null) as any,
      bonita_resident_discount: (challengeData.bonita_resident_discount || null) as any,
      owner_user_id: (ownerUserId || null) as any,
      published: false,  // Keep unpublished until admin manually publishes
      is_member: false   // Default to free tier
    }
    
    console.log('[Admin] Approving application with payload:', payload)  // KEPT: Business application logging
    
    const { error } = await supabase.from('providers').insert([payload as any])
    if (error) {
      setError(error.message)
    } else {
      setMessage('Application approved and provider created')
      // Delete the application now that it has been approved
      try {
        await supabase.from('business_applications').delete().eq('id', appId)
        setBizApps((rows) => rows.filter((r) => r.id !== appId))
      } catch {}
      // Refresh providers with enhanced fields
      try {
        const { data: pData } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
      } catch {}
    }
  }

  async function deleteApplication(appId: string) {
    setMessage(null)
    const { error } = await supabase.from('business_applications').delete().eq('id', appId)
    if (error) setError(error.message)
    else {
      setMessage('Application deleted')
      setBizApps((rows) => rows.filter((r) => r.id !== appId))
    }
  }

  /**
   * SAVE PROVIDER - Enhanced Admin Provider Update
   * 
   * This function saves all provider fields including the enhanced business management fields.
   * It includes all the same fields that are available in the My Business page editing form.
   * 
   * Features:
   * - Updates all core business fields (name, category, contact info)
   * - Updates enhanced fields (description, specialties, social links, etc.)
   * - Handles free vs featured plan restrictions
   * - Provides clear success/error feedback
   * - Refreshes provider data after successful update
   */
  async function saveProvider(p: ProviderRow) {
    setMessage(null)
    setError(null)
    setSavingProvider(true)

    // Check if this is a new provider being created
    if (p.id === 'new') {
      // Create new provider logic
      try {
        // Validate required fields
        if (!p.name?.trim()) {
          setError('Business name is required')
          setSavingProvider(false)
          return
        }

        // Check if session is still valid
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Session expired. Please refresh the page and try again.')
          setSavingProvider(false)
          return
        }

        // Create the provider (remove the temporary 'new' id)
        const { id, ...providerData } = p
        const { error } = await supabase
          .from('providers')
          .insert([{
            ...providerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (error) {
          console.error('[Admin] Error creating provider:', error)
          setError(`Failed to create provider: ${error.message}`)
          setSavingProvider(false)
          return
        }

        setMessage('New provider created successfully!')
        
        // Refresh providers data
        const { data: pData } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
        
        // Exit create mode
        setIsCreatingNewProvider(false)
        setSelectedProviderId(null)

      } catch (err: any) {
        console.error('[Admin] Unexpected error creating provider:', err)
        setError(`Unexpected error: ${err.message}`)
      } finally {
        setSavingProvider(false)
      }
      return
    }

    // ADD THIS: Check if session is still valid before saving
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expired. Please refresh the page and try again.')
      setSavingProvider(false)
      return
    }
      
    // ADD THIS: Force refresh the Supabase client before making the request
    try {
      await supabase.from('providers').select('id').limit(1)
    } catch (err) {
      console.error('[Admin] Connection test failed:', err)
    }
    
    // CRITICAL FIX: Add timeout to prevent infinite loading state
    // This ensures the loading state is always reset even if the request hangs
    const timeoutId = setTimeout(() => {
      console.error('[Admin] Save provider timeout - resetting loading state')
      setSavingProvider(false)
      setError('Save operation timed out. Please try again.')
    }, 10000) // 10 second timeout
    
    // ADDITIONAL SAFETY: Add a backup timeout that runs regardless of the main timeout
    // This provides a failsafe in case the main timeout doesn't work as expected
    /* const backupTimeoutId = setTimeout(() => {
      console.error('[Admin] Backup timeout triggered - forcing loading state reset')
      setSavingProvider(false)
      setError('Save operation failed. Please refresh the page and try again.')
    }, 15000) // 15 second backup timeout (reduced since we removed connection test) */
    
    try {
      // console.log('[Admin] Saving provider:', p.id, 'with data:', p)
      
      // Prepare update data with all enhanced business fields
      const updateData = {
        // Core business fields
        name: p.name,
        category_key: p.category_key,
        tags: p.tags || [],
        rating: p.rating ?? undefined,
        phone: p.phone,
        email: p.email,
        website: p.website,
        address: p.address,
        images: p.images || [],
        // IMPORTANT: Persist membership/featured flags as explicitly set by admin
        // Do NOT override based on subscription_type; admins' changes must be permanent
        is_member: p.is_member === true,
        
        // PLAN TRACKING FIELDS: Handle the new plan system properly
        // This ensures the database reflects the correct plan status and tracking
        // Keep featured flags independent from subscription_type as well
        is_featured: p.is_featured === true,
        featured_since: p.featured_since || null,
        subscription_type: p.subscription_type || null,
        // REMOVED: tier: p.tier || null, - This field doesn't exist in database
        // REMOVED: paid: p.subscription_type ? p.paid === true : false, - This field doesn't exist in database
        // Using subscription_type instead to track plan (monthly/yearly/free)
        
        // Enhanced business management fields (matching My Business page)
        description: p.description || null,
        specialties: p.specialties || null,
        social_links: p.social_links || null,
        business_hours: p.business_hours || null,
        service_areas: p.service_areas || null,
        google_maps_url: p.google_maps_url || null,
        bonita_resident_discount: p.bonita_resident_discount || null,
        published: p.published ?? true,
        // Booking system fields
        booking_enabled: p.booking_enabled ?? false,
        booking_type: p.booking_type || null,
        booking_instructions: p.booking_instructions || null,
        booking_url: p.booking_url || null,
        updated_at: new Date().toISOString()
      }
      
      // console.log('[Admin] Update data prepared:', updateData)
      
      // SIMPLIFIED APPROACH: Direct database update without connection test
      // The connection test was causing timeouts and preventing saves
      // We'll handle errors directly from the update operation
      // console.log('[Admin] Starting database update...')
      const startTime = Date.now()
      
      try {
        // DIRECT UPDATE: Simple, direct update without AbortController complexity
        // This approach is more reliable and less prone to timeout issues
        const { error } = await supabase
          .from('providers')
          .update(updateData)
          .eq('id', p.id)
        
        // const duration = Date.now() - startTime
        // console.log(`[Admin] Database update completed in ${duration}ms`)
        
        if (error) {
          console.error('[Admin] Provider save error:', error)
          
          // IMPROVED ERROR HANDLING: Provide specific error messages based on error type
          if (error.message.includes('timeout') || error.message.includes('aborted')) {
            setError(`Database operation timed out. This might be due to network issues or server load. Please try again in a moment.`)
            setRetryProvider(p) // Store provider for retry
          } else if (error.message.includes('permission') || error.message.includes('denied')) {
            setError(`Permission denied. Please check your admin access and try again.`)
          } else if (error.message.includes('network') || error.message.includes('connection')) {
            setError(`Network error. Please check your internet connection and try again.`)
            setRetryProvider(p) // Store provider for retry
          } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
            setError(`Database constraint error: ${error.message}. Please contact support.`)
          } else {
            setError(`Failed to save provider: ${error.message}`)
          }
          return
        }
        
        // console.log('[Admin] Provider saved successfully')
        setMessage('Provider updated successfully! Changes have been saved to the database.')
        setRetryProvider(null) // Clear retry state on success
        clearSavedState() // Clear saved state after successful save
        
        // CRITICAL FIX: Refresh admin page provider data immediately after save
        // This ensures the admin page shows the updated data without requiring a page refresh
        try {
          const { data: pData } = await supabase
            .from('providers')
            .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
            .order('name', { ascending: true })
          setProviders((pData as ProviderRow[]) || [])
          // console.log('[Admin] Provider data refreshed after save')
        } catch (refreshError) {
          console.error('[Admin] Failed to refresh provider data after save:', refreshError)
        }
        
        // Also dispatch refresh event for main app
        try { 
          window.dispatchEvent(new CustomEvent('bf-refresh-providers')) 
        } catch (refreshError) {
          console.warn('[Admin] Failed to dispatch refresh event:', refreshError)
        }
        
      } catch (requestError: any) {
        const duration = Date.now() - startTime
        console.error(`[Admin] Database request failed after ${duration}ms:`, requestError)
        
        // Handle different types of errors
        if (requestError.message.includes('timeout') || requestError.message.includes('aborted')) {
          setError(`Database operation timed out after ${duration}ms. Please check your connection and try again.`)
          setRetryProvider(p) // Store provider for retry
        } else if (requestError.message.includes('network') || requestError.message.includes('fetch')) {
          setError(`Network error: ${requestError.message}. Please check your internet connection.`)
          setRetryProvider(p) // Store provider for retry
        } else {
          setError(`Database request failed: ${requestError.message}`)
        }
        return
      }
      
    } catch (err: any) {
      console.error('[Admin] Unexpected error saving provider:', err)
      setError(`Unexpected error: ${err.message}`)
    } finally {
      // CRITICAL FIX: Always clear both timeouts and reset loading state
      // This ensures the UI never gets stuck in loading state
      clearTimeout(timeoutId)
      // clearTimeout(backupTimeoutId)
      setSavingProvider(false)
    }
  }

  // RETRY FUNCTION: Allows users to retry failed save operations
  // This is particularly useful for timeout errors that might be temporary
  const retrySaveProvider = () => {
    if (retryProvider) {
      // console.log('[Admin] Retrying save for provider:', retryProvider.id)
      saveProvider(retryProvider)
    }
  }

  // Image upload functionality for admin provider editing
  // Handles both free (1 image) and featured (multiple images) accounts
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>, providerId: string) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setError(null)

    try {
      const currentProvider = providers.find(p => p.id === providerId)
      if (!currentProvider) {
        setError('Provider not found')
        return
      }

      const isFeatured = currentProvider.is_member === true
      const currentImages = currentProvider.images || []
      const maxImages = isFeatured ? 10 : 1 // Free accounts: 1 image, Featured: up to 10

      // Check if adding these files would exceed the limit
      if (currentImages.length + files.length > maxImages) {
        setError(`Maximum ${maxImages} image${maxImages === 1 ? '' : 's'} allowed for ${isFeatured ? 'featured' : 'free'} accounts`)
        return
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file`)
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB`)
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${providerId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file)

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName)

        return urlData.publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const newImages = [...currentImages, ...uploadedUrls]

      // Update the provider with new images
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, images: newImages }
          : p
      ))

      setMessage(`Successfully uploaded ${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'}`)

    } catch (err: any) {
      console.error('[Admin] Image upload error:', err)
      setError(err.message || 'Failed to upload images')
    } finally {
      setUploadingImages(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  // Remove image from provider
  async function removeImage(providerId: string, imageUrl: string) {
    try {
      const currentProvider = providers.find(p => p.id === providerId)
      if (!currentProvider) return

      // Extract filename from URL for storage deletion
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('business-images')
        .remove([fileName])

      if (error) {
        console.warn('[Admin] Failed to delete image from storage:', error)
        // Continue anyway - we'll still remove it from the provider
      }

      // Update provider images
      const newImages = (currentProvider.images || []).filter(img => img !== imageUrl)
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, images: newImages }
          : p
      ))

      setMessage('Image removed successfully')

    } catch (err: any) {
      console.error('[Admin] Image removal error:', err)
      setError('Failed to remove image')
    }
  }

  async function deleteProvider(providerId: string) {
    setMessage(null)
    setConfirmDeleteProviderId(null)
    
    try {
      // console.log('[Admin] Deleting provider:', providerId)
      
      // Get auth session for Netlify function
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Use Netlify function to delete provider (handles all FK constraints and related data)
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/delete-business-listing` : '/.netlify/functions/delete-business-listing'
      
      // console.log('[Admin] Calling delete function:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ listing_id: providerId })  // Function expects 'listing_id' not 'listingId'
      })
      
      // console.log('[Admin] Delete response status:', response.status)
      
      if (!response.ok) {
        // Try to parse detailed error
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.details || errorData.error || `HTTP ${response.status}`
        throw new Error(errorMsg)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.details || result.error || 'Delete failed')
      }
      
      setMessage('Provider deleted successfully')
      setProviders((arr) => arr.filter((p) => p.id !== providerId))
      
      // Refresh providers list
      try {
        const { data: pData, error: pErr } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true })
        if (!pErr) setProviders((pData as ProviderRow[]) || [])
      } catch {}
      
      try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
      
    } catch (err: any) {
      console.error('[Admin] Error deleting provider:', err)
      setError(`Failed to delete provider: ${err.message}`)
    }
  }

  async function notifyUser(user_id: string | null | undefined, subject: string, body?: string, data?: any) {
    if (!user_id) return
    try { await supabase.from('user_notifications').insert([{ user_id, subject, body: body || null, data: data || null }]) } catch {}
  }

  /**
   * HELPER FUNCTION: Compute field-by-field differences between old and new values
   * 
   * This function compares the current provider data with the proposed changes
   * and returns an object with only the fields that actually changed.
   * 
   * @param currentProvider - The current provider data from the database
   * @param proposedChanges - The proposed changes from the change request
   * @returns An object containing only fields that changed, with old and new values
   */
  function computeChangeDiff(currentProvider: ProviderRow | undefined, proposedChanges: Record<string, any> | null) {
    if (!currentProvider || !proposedChanges) return []

    const diffs: Array<{ field: string; oldValue: any; newValue: any; fieldLabel: string }> = []
    
    // Field label mapping for better display
    const fieldLabels: Record<string, string> = {
      name: 'Business Name',
      category_key: 'Category',
      phone: 'Phone Number',
      email: 'Email Address',
      website: 'Website',
      address: 'Address',
      tags: 'Tags',
      images: 'Images',
      description: 'Description',
      specialties: 'Specialties',
      social_links: 'Social Media Links',
      business_hours: 'Business Hours',
      service_areas: 'Service Areas',
      google_maps_url: 'Google Maps URL',
      bonita_resident_discount: 'Bonita Residents Discount',
      booking_enabled: 'Booking System',
      booking_type: 'Booking Type',
      booking_instructions: 'Booking Instructions',
      booking_url: 'External Booking URL',
      coupon_code: 'Coupon Code',
      coupon_discount: 'Coupon Discount',
      coupon_description: 'Coupon Description',
      coupon_expires_at: 'Coupon Expiration',
      published: 'Published Status',
      is_member: 'Member Status',
      rating: 'Rating',
      badges: 'Badges'
    }

    // Compare each field in proposedChanges
    Object.entries(proposedChanges).forEach(([field, newValue]) => {
      const oldValue = (currentProvider as any)[field]
      
      // Check if values are different
      let isDifferent = false
      
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        // Compare arrays
        isDifferent = JSON.stringify(oldValue.sort()) !== JSON.stringify(newValue.sort())
      } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
        // Compare objects
        isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue)
      } else {
        // Simple comparison
        isDifferent = oldValue !== newValue
      }
      
      if (isDifferent) {
        diffs.push({
          field,
          oldValue,
          newValue,
          fieldLabel: fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        })
      }
    })

    return diffs
  }

  /**
   * Format a value for display in the change request UI
   */
  function formatValueForDisplay(value: any): string {
    if (value === null || value === undefined) return '(not set)'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) return value.length === 0 ? '(empty)' : value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    if (typeof value === 'string' && value.length === 0) return '(empty)'
    return String(value)
  }

  /**
   * Toggle expansion of a change request to show all details
   */
  function toggleChangeRequestExpansion(requestId: string) {
    setExpandedChangeRequestIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(requestId)) {
        newSet.delete(requestId)
      } else {
        newSet.add(requestId)
      }
      return newSet
    })
  }

  /**
   * Toggle expansion of a business dropdown
   */
  function toggleBusinessDropdown(businessName: string) {
    setExpandedBusinessDropdowns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(businessName)) {
        newSet.delete(businessName)
      } else {
        newSet.add(businessName)
      }
      return newSet
    })
  }

  /**
   * Toggle booking system on/off (Admin quick action)
   * This function ONLY updates booking_enabled field without touching other fields
   */
  async function toggleBookingEnabled(providerId: string, currentlyEnabled: boolean) {
    setMessage(null)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('providers')
        .update({ 
          booking_enabled: !currentlyEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)
      
      if (error) {
        console.error('[Admin] Error toggling booking:', error)
        setError(`Failed to toggle booking: ${error.message}`)
        return
      }
      
      setMessage(`Booking system ${!currentlyEnabled ? 'enabled' : 'disabled'} successfully!`)
      
      // Update local state
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, booking_enabled: !currentlyEnabled } 
          : p
      ))
      
      // Refresh providers list
      try {
        const { data: pData } = await supabase
          .from('providers')
          .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
          .order('name', { ascending: true })
        setProviders((pData as ProviderRow[]) || [])
      } catch {}
      
      // Dispatch refresh event
      try { 
        window.dispatchEvent(new CustomEvent('bf-refresh-providers')) 
      } catch {}
      
    } catch (err: any) {
      console.error('[Admin] Unexpected error toggling booking:', err)
      setError(`Unexpected error: ${err.message}`)
    }
  }

  async function approveChangeRequest(req: ProviderChangeRequestWithDetails) {
    setMessage(null)
    try {
      if (req.type === 'update') {
        const { error } = await supabase.from('providers').update(req.changes as any).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'delete') {
        const res = await supabase.from('providers').delete().eq('id', req.provider_id).select('id')
        if (res.error) {
          // If cannot hard delete, soft-delete by adding 'deleted' badge
          const { data: row } = await supabase.from('providers').select('badges').eq('id', req.provider_id).single()
          const badges = Array.isArray((row as any)?.badges) ? ((row as any)?.badges as string[]) : []
          const next = Array.from(new Set([...(badges || []), 'deleted']))
          await supabase.from('providers').update({ badges: next as any }).eq('id', req.provider_id)
        }
      } else if (req.type === 'feature_request') {
        const { error } = await supabase.from('providers').update({ is_member: true }).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'claim') {
        const { error } = await supabase.from('providers').update({ owner_user_id: req.owner_user_id }).eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      }
      await supabase.from('provider_change_requests').update({ status: 'approved', decided_at: new Date().toISOString() as any }).eq('id', req.id)
      await notifyUser(req.owner_user_id, 'Request approved', `Your ${req.type} request was approved.`, { reqId: req.id })
      setMessage('Change request approved')
      try { window.dispatchEvent(new CustomEvent('bf-refresh-providers')) } catch {}
      // Refresh the change requests list to show updated status
      await loadChangeRequests()
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request')
    }
  }

  async function rejectChangeRequest(req: ProviderChangeRequestWithDetails, reason?: string) {
    setMessage(null)
    try {
      await supabase.from('provider_change_requests').update({ status: 'rejected', reason: reason || null, decided_at: new Date().toISOString() as any }).eq('id', req.id)
      await notifyUser(req.owner_user_id, 'Request rejected', reason || `Your ${req.type} request was rejected.`, { reqId: req.id })
      setMessage('Change request rejected')
      // Refresh the change requests list to show updated status
      await loadChangeRequests()
    } catch (err: any) {
      setError(err?.message || 'Failed to reject request')
    }
  }

  async function approveJobPost(job: ProviderJobPost) {
    setMessage(null)
    try {
      await supabase.from('provider_job_posts').update({ status: 'approved', decided_at: new Date().toISOString() as any }).eq('id', job.id)
      await notifyUser(job.owner_user_id, 'Job post approved', `Your job post "${job.title}" was approved.`, { jobId: job.id })
      setJobPosts((arr) => arr.map((j) => j.id === job.id ? { ...j, status: 'approved', decided_at: new Date().toISOString() as any } : j))
      setMessage('Job post approved')
    } catch (err: any) {
      setError(err?.message || 'Failed to approve job post')
    }
  }

  async function rejectJobPost(job: ProviderJobPost, reason?: string) {
    setMessage(null)
    try {
      await supabase.from('provider_job_posts').update({ status: 'rejected', decided_at: new Date().toISOString() as any }).eq('id', job.id)
      await notifyUser(job.owner_user_id, 'Job post rejected', reason || `Your job post "${job.title}" was rejected.`, { jobId: job.id })
      setJobPosts((arr) => arr.map((j) => j.id === job.id ? { ...j, status: 'rejected', decided_at: new Date().toISOString() as any } : j))
      setMessage('Job post rejected')
    } catch (err: any) {
      setError(err?.message || 'Failed to reject job post')
    }
  }

  async function deleteJobPost(jobId: string) {
    if (!confirm('Are you sure you want to delete this job post? This action cannot be undone.')) {
      return
    }

    setMessage(null)
    try {
      await supabase.from('provider_job_posts').delete().eq('id', jobId)
      setJobPosts((arr) => arr.filter((j) => j.id !== jobId))
      setMessage('Job post deleted successfully')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete job post')
    }
  }

  async function deleteUser(userId: string) {
    setMessage(null)
    setDeletingUserId(userId)
    try {
      // console.log('[Admin] Deleting user:', userId)
      
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Call Netlify function (not Supabase Edge Function)
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-delete-user` : '/.netlify/functions/admin-delete-user'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ user_id: userId })
      })
      
      // console.log('[Admin] Delete response status:', response.status)
      
      if (!response.ok) {
        // Try to parse as JSON first for detailed error
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('[Admin] Delete error details:', errorData)
          
          if (errorData.error) {
            errorMessage = errorData.error
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`
            }
            if (errorData.hint) {
              errorMessage += ` (${errorData.hint})`
            }
            if (errorData.code) {
              console.error('[Admin] Error code:', errorData.code)
            }
          }
        } catch (parseErr) {
          // Fallback to text if JSON parsing fails
          const errorText = await response.text()
          console.error('[Admin] Delete error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      // console.log('[Admin] Delete result:', result)
      
      if (!result.ok) {
        throw new Error('Delete failed')
      }
      
      // Remove from local lists - get the user's email first
      const deletedProfile = profiles.find(p => p.id === userId)
      const deletedEmail = deletedProfile?.email?.toLowerCase().trim()
      
      // console.log('[Admin] Removing deleted user from local state:', { userId, email: deletedEmail })
      
      // Remove profile from profiles list
      setProfiles((arr) => arr.filter((p) => p.id !== userId))
      
      // CRITICAL FIX: Remove funnel responses and bookings by email
      // This ensures the "All users" dropdown updates immediately
      if (deletedEmail) {
        setFunnels((arr) => arr.filter((f) => {
          const funnelEmail = f.user_email?.toLowerCase().trim()
          return funnelEmail !== deletedEmail
        }))
        setBookings((arr) => arr.filter((b) => {
          const bookingEmail = b.user_email?.toLowerCase().trim()
          return bookingEmail !== deletedEmail
        }))
        // console.log('[Admin] Removed funnel responses and bookings for:', deletedEmail)
      }
      
      setMessage('User deleted successfully - all associated data removed')
      // console.log('[Admin] User deleted successfully')
    } catch (err: any) {
      console.error('[Admin] Delete user error:', err)
      setError(err?.message || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  async function deleteCustomerUser(email: string) {
    setMessage(null)
    setDeletingCustomerEmail(email)
    try {
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Remove funnel responses and bookings for this email
      try { await supabase.from('funnel_responses').delete().eq('user_email', email) } catch {}
      try { await supabase.from('bookings').delete().eq('user_email', email) } catch {}
      // If an auth profile exists (and is not a business owner), delete the auth user as well
      try {
        const { data: prof } = await supabase.from('profiles').select('id,role').eq('email', email).limit(1).maybeSingle()
        const pid = (prof as any)?.id as string | undefined
        const role = (prof as any)?.role as string | undefined
        if (pid && role !== 'business') {
          // Call Netlify function (not Supabase Edge Function)
          // For local dev: use http://localhost:8888 (Netlify Dev port)
          // For production: use relative URL (/.netlify/functions/...)
          const isLocal = window.location.hostname === 'localhost'
          const fnBase = isLocal ? 'http://localhost:8888' : ''
          const url = fnBase ? `${fnBase}/.netlify/functions/admin-delete-user` : '/.netlify/functions/admin-delete-user'
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ user_id: pid })
          })
          
          if (response.ok) {
            setProfiles((arr) => arr.filter((p) => p.id !== pid))
          }
        }
      } catch {}
      // Update local UI lists
      setFunnels((arr) => arr.filter((f) => f.user_email !== email))
      setBookings((arr) => arr.filter((b) => b.user_email !== email))
      setMessage('Customer user deleted')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete customer user')
    } finally {
      setDeletingCustomerEmail(null)
    }
  }

  /**
   * FETCH BUSINESS DETAILS
   * 
   * This function fetches business details for a specific business account user.
   * It uses a Netlify function to bypass RLS policies and fetch provider data.
   * 
   * How it works:
   * 1. Sets loading state for the specific user
   * 2. Uses existing profile data to get user email and name
   * 3. Calls Netlify function with SERVICE_ROLE_KEY to bypass RLS
   * 4. Returns business name, phone, and other relevant details
   * 5. Updates expandedBusinessDetails state with the fetched data
   */
  async function fetchBusinessDetails(userId: string) {
    // console.log('[Admin] Fetching business details for user ID:', userId)
    setLoadingBusinessDetails(prev => ({ ...prev, [userId]: true }))
    
    try {
      // Get the user's email and name from the existing profiles data
      const userProfile = profiles.find(p => p.id === userId)
      const userEmail = userProfile?.email
      const userName = userProfile?.name

      // console.log('[Admin] User profile data from existing data:', { email: userEmail, name: userName })

      // Get auth session for the request
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('No authentication token available')
      }

      // Call Netlify function to fetch business details (bypasses RLS)
      // For local dev: use http://localhost:8888 (Netlify Dev port)
      // For production: use relative URL (/.netlify/functions/...)
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-get-business-details` : '/.netlify/functions/admin-get-business-details'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          userEmail,
          userName
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      // console.log('[Admin] Business details response:', result)

      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to fetch business details')
      }

      const uniqueBusinessData = result.businessData || []
      // console.log('[Admin] Combined unique business data:', uniqueBusinessData.length, 'records')

      // Update expanded details with the fetched business data
      setExpandedBusinessDetails(prev => ({
        ...prev,
        [userId]: uniqueBusinessData
      }))

    } catch (err: any) {
      console.error('[Admin] Error fetching business details:', err)
      setError(`Failed to fetch business details: ${err.message}`)
    } finally {
      setLoadingBusinessDetails(prev => ({ ...prev, [userId]: false }))
    }
  }

  /**
   * COLLAPSE BUSINESS DETAILS
   * 
   * This function collapses the expanded business details for a specific user.
   * It removes the user's data from the expandedBusinessDetails state.
   */
  function collapseBusinessDetails(userId: string) {
    // console.log('[Admin] Collapsing business details for user ID:', userId)
    setExpandedBusinessDetails(prev => {
      const newState = { ...prev }
      delete newState[userId]
      return newState
    })
  }

  /**
   * CRITICAL FIX: Admin page auth check
   * 
   * The issue was that auth.email was temporarily undefined during auth loading,
   * causing the "Please sign in" message to show even when user was signed in.
   * 
   * Fix: Check auth.loading state to prevent premature "sign in" message.
   */
  if (!auth.email) {
    // Don't show "please sign in" message while auth is still loading
    if (auth.loading) {
      return (
        <section className="py-8">
          <div className="container-px mx-auto max-w-3xl">
            <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        </section>
      )
    }
    
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Please sign in to view your data.
            <div className="mt-2 text-sm text-neutral-600">
              Debug: email={auth.email || 'none'}, loading={String(auth.loading)}, isAuthed={String(auth.isAuthed)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
            Unauthorized. This page is restricted to administrators.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-5xl">
        <div className="flex flex-col lg:items-start md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Admin' : 'Your Data'}</h1>
            {isAdmin && (
              <div className="text-xs text-neutral-500 mt-1">
                {adminStatus.verified ? '🔒 Server-verified admin' : '⚠️ Client-side admin (less secure)'}
                {adminStatus.error && ` • ${adminStatus.error}`}
              </div>
            )}
          </div>
          <div className="flex flex-col lg:items-start md:flex-row md:items-center gap-2">
            {isAdmin && (
              <>
                <select value={selectedUser || ''} onChange={(e) => setSelectedUser(e.target.value || null)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="">All users</option>
                  {customerUsers.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <select value={section} onChange={(e) => setSection(e.target.value as any)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-white">
                  <option value="providers">Providers</option>
                  <option value="contact-leads">Contact / Get Featured</option>
                  <option value="customer-users">Customer Users</option>
                  <option value="business-accounts">Business Accounts</option>
                  <option value="users">Users</option>
                  <option value="business-applications">Business Applications</option>
                  <option value="owner-change-requests">Owner Change Requests</option>
                  <option value="job-posts">Job Posts</option>
                  <option value="funnel-responses">Funnel Responses</option>
                  <option value="bookings">Bookings</option>
                  <option value="blog">Blog Manager</option>
                  <option value="calendar-events">Calendar Events</option>
                  <option value="flagged-events">Flagged Events</option>
                </select>
              </>
            )}
            <button onClick={() => window.location.reload()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-neutral-200 text-sm">Refresh</button>
          </div>
        </div>
        {loading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton">
                <div className="skeleton-inner space-y-3">
                  <div className="skeleton-line w-1/3"></div>
                  <div className="skeleton-chip"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {message && <div className="mt-3 text-sm text-green-700">{message}</div>}

        {/* Pending Approvals Notification Section */}
        {isAdmin && (
          <div className="mt-6 mb-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">Pending Approvals</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Pending Business Applications */}
                      {bizApps.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Business Applications</div>
                          <div className="text-xs text-amber-600 mt-1">{bizApps.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {bizApps.slice(0, 2).map(app => (
                              <div key={app.id} className="truncate">
                                {app.business_name || app.full_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {bizApps.length > 2 && <div className="text-amber-500">+{bizApps.length - 2} more</div>}
                          </div>
                        </div>
                      )}

                      {/* Pending Change Requests */}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Change Requests</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {changeRequests.filter(req => req.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {changeRequests.filter(req => req.status === 'pending').slice(0, 2).map(req => (
                              <div key={req.id} className="truncate">
                                {/* Show business name if available, otherwise show request type */}
                                {req.providers?.name ? `${req.providers.name} - ` : ''}
                                {req.type === 'feature_request' ? 'Featured Upgrade' : 
                                 req.type === 'update' ? 'Listing Update' : 
                                 req.type === 'delete' ? 'Listing Deletion' :
                                 req.type === 'claim' ? 'Business Claim' : req.type}
                              </div>
                            ))}
                            {changeRequests.filter(req => req.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{changeRequests.filter(req => req.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Job Posts */}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Job Posts</div>
                          <div className="text-xs text-amber-600 mt-1">
                            {jobPosts.filter(job => job.status === 'pending').length} pending
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            {jobPosts.filter(job => job.status === 'pending').slice(0, 2).map(job => (
                              <div key={job.id} className="truncate">
                                {job.title}
                              </div>
                            ))}
                            {jobPosts.filter(job => job.status === 'pending').length > 2 && (
                              <div className="text-amber-500">+{jobPosts.filter(job => job.status === 'pending').length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Contact Leads */}
                      {contactLeads.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="font-medium text-amber-800">Contact Leads</div>
                          <div className="text-xs text-amber-600 mt-1">{contactLeads.length} pending</div>
                          <div className="text-xs text-amber-700 mt-2">
                            {contactLeads.slice(0, 2).map(lead => (
                              <div key={lead.id} className="truncate">
                                {lead.business_name || 'Unnamed Business'}
                              </div>
                            ))}
                            {contactLeads.length > 2 && <div className="text-amber-500">+{contactLeads.length - 2} more</div>}
                          </div>
                        </div>
                      )}

                      {/* Flagged Calendar Events */}
                      {flaggedEvents.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-red-300">
                          <div className="font-medium text-red-800">Flagged Events</div>
                          <div className="text-xs text-red-600 mt-1">{flaggedEvents.length} flagged</div>
                          <div className="text-xs text-red-700 mt-2">
                            {flaggedEvents.slice(0, 2).map(flag => (
                              <div key={flag.id} className="truncate">
                                {flag.event?.title || 'Event deleted'} ({flag.reason})
                              </div>
                            ))}
                            {flaggedEvents.length > 2 && <div className="text-red-500">+{flaggedEvents.length - 2} more</div>}
                          </div>
                          <button
                            onClick={() => setSection('flagged-events')}
                            className="mt-3 w-full px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            Review Flagged Events
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bizApps.length > 0 && (
                        <button 
                          onClick={() => setSection('business-applications')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Applications ({bizApps.length})
                        </button>
                      )}
                      {changeRequests.filter(req => req.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('owner-change-requests')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Changes ({changeRequests.filter(req => req.status === 'pending').length})
                        </button>
                      )}
                      {jobPosts.filter(job => job.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => setSection('job-posts')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Jobs ({jobPosts.filter(job => job.status === 'pending').length})
                        </button>
                      )}
                      {contactLeads.length > 0 && (
                        <button 
                          onClick={() => setSection('contact-leads')}
                          className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200"
                        >
                          Review Leads ({contactLeads.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin && section === 'contact-leads' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Featured Provider Management</div>
              
              {/* Featured Provider Filter Toggle */}
              <div className="mt-4 mb-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-700">Filter Providers:</label>
                  <div className="flex rounded-lg bg-neutral-100 p-1">
                    <button
                      onClick={() => setFeaturedProviderFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'all'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      All ({providers.length})
                    </button>
                    <button
                      onClick={() => setFeaturedProviderFilter('featured')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'featured'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Featured ({providers.filter(p => p.is_featured === true || p.is_member === true).length})
                    </button>
                    <button
                      onClick={() => setFeaturedProviderFilter('non-featured')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        featuredProviderFilter === 'non-featured'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Non-Featured ({providers.filter(p => !p.is_featured && !p.is_member).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Leads Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Contact Leads ({contactLeads.length})</h3>
                <div className="space-y-2 text-sm">
                {contactLeads.length === 0 && <div className="text-neutral-500">No leads yet.</div>}
                {contactLeads.map((row) => (
                  <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{row.business_name || '-'}</div>
                      <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Email: {row.contact_email || '-'}</div>
                    <div className="text-xs text-neutral-600 mt-1">Details: {row.details || '-'}</div>
                  </div>
                ))}
                </div>
              </div>

              {/* Featured Providers Management */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">
                  Provider Management ({filteredProviders.length} {featuredProviderFilter === 'all' ? 'total' : featuredProviderFilter})
                </h3>
                <div className="space-y-3 text-sm">
                  {filteredProviders.length === 0 && (
                    <div className="text-neutral-500 text-center py-4">
                      No {featuredProviderFilter === 'all' ? '' : featuredProviderFilter} providers found.
                    </div>
                  )}
                  {filteredProviders.map((provider) => (
                    <div key={provider.id} className="rounded-xl border border-neutral-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              provider.is_featured || provider.is_member
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {provider.is_featured || provider.is_member ? 'Featured' : 'Standard'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600">
                            <div><strong>Category:</strong> {provider.category_key}</div>
                            <div><strong>Email:</strong> {provider.email || 'N/A'}</div>
                            <div><strong>Phone:</strong> {provider.phone || 'N/A'}</div>
                            <div><strong>Created:</strong> {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'N/A'}</div>
                            
                            {/* Featured Status Information */}
                            {provider.is_featured || provider.is_member ? (
                              <>
                                <div><strong>Featured Since:</strong> {provider.featured_since ? new Date(provider.featured_since).toLocaleDateString() : 'Unknown'}</div>
                                <div><strong>Subscription:</strong> {provider.subscription_type || 'Not set'}</div>
                              </>
                            ) : null}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          {/* Featured Status Toggle */}
                          <button
                            onClick={() => toggleFeaturedStatus(provider.id, !!(provider.is_featured || provider.is_member))}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                              provider.is_featured || provider.is_member
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {provider.is_featured || provider.is_member ? 'Remove Featured' : 'Make Featured'}
                          </button>
                          
                          {/* Subscription Type Selector (only for featured providers) */}
                          {(provider.is_featured || provider.is_member) && (
                            <select
                              value={provider.subscription_type || ''}
                              onChange={(e) => {
                                const value = e.target.value as 'monthly' | 'yearly'
                                if (value) updateSubscriptionType(provider.id, value)
                              }}
                              className="px-2 py-1 text-xs border border-neutral-300 rounded-md bg-white"
                            >
                              <option value="">Set Plan</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isAdmin && section === 'customer-users' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
              <div className="font-medium">Customer Users</div>
              <ul className="mt-2 text-sm">
                {customerUsers.length === 0 && <li className="text-neutral-500">No users yet.</li>}
                {customerUsers.map((u) => (
                  <li key={u} className="py-1 border-b border-neutral-100 last:border-0 flex items-center justify-between">
                    <span>{u}</span>
                    {deletingCustomerEmail === u ? (
                      <span className="flex items-center gap-2">
                        <button onClick={() => deleteCustomerUser(u)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                        <button onClick={() => setDeletingCustomerEmail(null)} className="text-xs underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeletingCustomerEmail(u)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && section === 'business-accounts' && (
            <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
              <div className="font-medium">Business Accounts</div>
              <div className="mt-2 text-sm">
                {profiles.filter((p) => String(p.role || '').toLowerCase() === 'business').length === 0 && <div className="text-neutral-500">No business accounts yet.</div>}
                {profiles.filter((p) => String(p.role || '').toLowerCase() === 'business').map((p) => (
                  <div key={p.id} className="py-3 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                      <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                      <div className="text-xs text-neutral-500">{p.name || '—'} • business</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Dynamic Button - Shows "See More" or "Back" based on expansion state */}
                        {expandedBusinessDetails[p.id] ? (
                          <button 
                            onClick={() => collapseBusinessDetails(p.id)} 
                            className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs hover:bg-red-100"
                          >
                            Back
                          </button>
                        ) : (
                          <button 
                            onClick={() => fetchBusinessDetails(p.id)} 
                            className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 border border-blue-200 text-xs hover:bg-blue-100"
                            disabled={loadingBusinessDetails[p.id]}
                          >
                            {loadingBusinessDetails[p.id] ? 'Loading...' : 'See More'}
                          </button>
                        )}
                      {deletingUserId === p.id ? (
                        <>
                          <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-600 text-white px-3 py-1.5 border border-red-700 text-xs hover:bg-red-700 font-medium">Confirm Delete</button>
                          <button onClick={() => setDeletingUserId(null)} className="text-xs underline text-neutral-600 hover:text-neutral-900">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeletingUserId(p.id)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                      )}
                      </div>
                    </div>
                    
                    {/* Warning message when delete is initiated */}
                    {deletingUserId === p.id && (
                      <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-300 rounded-lg p-3">
                        <div className="font-bold mb-1">⚠️ Warning: Permanent Data Loss</div>
                        <div className="space-y-1 text-red-600">
                          <p>• All business listings and provider data will be permanently deleted</p>
                          <p>• Business images, change requests, and job posts will be removed</p>
                          <p>• User will need to create a completely new account if they sign up again</p>
                          <p>• Data will be archived for admin reference only</p>
                        </div>
                        <div className="mt-2 font-medium">Click "Confirm Delete" above to proceed or "Cancel" to abort.</div>
                      </div>
                    )}
                    
                    {/* Expanded Business Details */}
                    {expandedBusinessDetails[p.id] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-2">Business Details:</div>
                        {expandedBusinessDetails[p.id].length === 0 ? (
                          <div className="text-xs text-gray-500">No businesses found for this account.</div>
                        ) : (
                          <div className="space-y-2">
                            {expandedBusinessDetails[p.id].map((business: any) => (
                              <div key={business.id} className="text-xs bg-white p-2 rounded border">
                                <div className="font-medium text-gray-800">{business.name || 'Unnamed Business'}</div>
                                <div className="text-gray-600 mt-1">
                                  {business.phone && <div>📞 {business.phone}</div>}
                                  {business.email && <div>✉️ {business.email}</div>}
                                  {business.website && <div>🌐 {business.website}</div>}
                                  {business.address && <div>📍 {business.address}</div>}
                                  <div className="mt-1">
                                    <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1">
                                      {business.category_key || 'No category'}
                                    </span>
                                    {business.is_member && (
                                      <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mr-1">
                                        Featured
                                      </span>
                                    )}
                                    {business.published ? (
                                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                        Published
                                      </span>
                                    ) : (
                                      <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                        Draft
                                      </span>
                                    )}
                                  </div>
                    </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && section === 'business-owners' && (
            <>
              <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
                <div className="font-medium">Business Owners</div>
                <div className="mt-2 text-sm">
                  {profiles.filter((p) => (p.role || 'community') === 'business').length === 0 && <div className="text-neutral-500">No business owners found.</div>}
                  {profiles.filter((p) => (p.role || 'community') === 'business').map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                        <div className="text-xs text-neutral-500">{p.name || '—'} • business</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deletingUserId === p.id ? (
                          <>
                            <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                            <button onClick={() => setDeletingUserId(null)} className="text-xs underline">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeletingUserId(p.id)} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
                <div className="font-medium">Users</div>
                <div className="mt-2 text-sm">
                  {profiles.filter((p) => (p.role || 'community') !== 'business').length === 0 && <div className="text-neutral-500">No users found.</div>}
                  {profiles.filter((p) => (p.role || 'community') !== 'business').map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                        <div className="text-xs text-neutral-500">{p.name || '—'}{p.role ? ` • ${p.role}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deletingUserId === p.id ? (
                          <>
                            <button onClick={() => deleteUser(p.id)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Confirm</button>
                            <button onClick={() => setDeletingUserId(null)} className="text-xs underline">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeletingUserId(p.id)} disabled={auth.email?.toLowerCase() === (p.email || '').toLowerCase()} className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs disabled:opacity-50">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {section === 'funnel-responses' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Funnel Responses</div>
            
            {/* User Filter Section - allows filtering by specific user email to avoid overwhelming display */}
            <div className="mt-3 mb-4">
              <div className="flex items-center gap-3">
                <label htmlFor="funnel-user-filter" className="text-sm font-medium text-neutral-700">
                  Filter by user email:
                </label>
                <div className="flex-1 relative">
                  <input
                    id="funnel-user-filter"
                    type="text"
                    value={funnelUserFilter}
                    onChange={(e) => setFunnelUserFilter(e.target.value)}
                    placeholder="Enter user email to filter..."
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400"
                    list="funnel-user-emails"
                  />
                  {/* Dropdown with existing user emails for quick selection */}
                  <datalist id="funnel-user-emails">
                    {Array.from(new Set(funnels.map(f => f.user_email).filter(Boolean))).sort().map(email => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                </div>
                {funnelUserFilter && (
                  <button
                    onClick={() => setFunnelUserFilter('')}
                    className="rounded-full bg-neutral-100 text-neutral-600 px-3 py-1.5 text-xs hover:bg-neutral-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Show filter status and count */}
              <div className="mt-2 text-xs text-neutral-500">
                {funnelUserFilter ? (
                  <>Showing {filteredFunnels.length} of {funnels.length} responses</>
                ) : (
                  <>Showing all {funnels.length} responses</>
                )}
              </div>
            </div>
            
            <div className="mt-2 space-y-2 text-sm">
              {filteredFunnels.length === 0 && (
                <div className="text-neutral-500">
                  {funnelUserFilter ? 'No responses found for this user.' : 'No entries yet.'}
                </div>
              )}
              {filteredFunnels.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category_key}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <div className="mt-1 text-xs text-neutral-600">User: {row.user_email}</div>
                  <textarea className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" style={{ height: '14vh' }} defaultValue={JSON.stringify(row.answers, null, 2)} onChange={(e) => setEditFunnel((m) => ({ ...m, [row.id]: e.target.value }))} />
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={async () => { try { const next = (() => { try { return JSON.parse(editFunnel[row.id] || JSON.stringify(row.answers || {})) } catch { return row.answers } })(); const { error } = await supabase.from('funnel_responses').update({ answers: next as any }).eq('id', row.id); if (error) setError(error.message); else setMessage('Funnel updated') } catch {} }} className="btn btn-secondary text-xs">Save</button>
                    <button onClick={async () => { const { error } = await supabase.from('funnel_responses').delete().eq('id', row.id); if (error) setError(error.message); else { setFunnels((arr) => arr.filter((f) => f.id !== row.id)); setMessage('Funnel deleted') } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {section === 'bookings' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Bookings</div>
            <div className="mt-2 space-y-2 text-sm">
              {bookings.length === 0 && <div className="text-neutral-500">No entries yet.</div>}
              {bookings.map((row) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
                  <div className="text-neutral-800 font-medium">{row.category_key}</div>
                  <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                  <input className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" defaultValue={row.name || ''} placeholder="Name" onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), name: e.target.value } }))} />
                  <textarea className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" defaultValue={row.notes || ''} placeholder="Notes" onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), notes: e.target.value } }))} />
                  {row.answers && <textarea className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" defaultValue={JSON.stringify(row.answers, null, 2)} onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), answers: e.target.value } }))} />}
                  <select className="mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs bg-white" defaultValue={row.status || 'new'} onChange={(e) => setEditBooking((m) => ({ ...m, [row.id]: { ...(m[row.id] || {}), status: e.target.value } }))}>
                    <option value="new">new</option>
                    <option value="in_progress">in_progress</option>
                    <option value="closed">closed</option>
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={async () => { const edit = editBooking[row.id] || {}; const payload: any = { name: edit.name ?? row.name, notes: edit.notes ?? row.notes, status: edit.status ?? row.status }; if (typeof edit.answers === 'string') { try { payload.answers = JSON.parse(edit.answers) } catch {} } const { error } = await supabase.from('bookings').update(payload).eq('id', row.id); if (error) setError(error.message); else setMessage('Booking saved') }} className="btn btn-secondary text-xs">Save</button>
                    <button onClick={async () => { const { error } = await supabase.from('bookings').delete().eq('id', row.id); if (error) setError(error.message); else { setBookings((arr) => arr.filter((b) => b.id !== row.id)); setMessage('Booking deleted') } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Main Business Applications Section */}
        {isAdmin && section === 'business-applications' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-6 bg-white hover-gradient interactive-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Business Applications</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Review and approve new business listing requests from community members.
                </p>
              </div>
              <div className="text-sm text-neutral-500">
                {bizApps.length} pending application{bizApps.length !== 1 ? 's' : ''}
              </div>
            </div>

            {bizApps.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-neutral-400 text-lg mb-2">📋</div>
                <div className="text-neutral-500">No business applications yet.</div>
                <div className="text-xs text-neutral-400 mt-1">
                  Applications will appear here when users submit business listing requests.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bizApps.map((app) => (
                  <div key={app.id} className="rounded-xl border border-neutral-200 p-4 bg-neutral-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-neutral-900 text-lg">
                          {app.business_name || 'Unnamed Business'}
                        </div>
                        <div className="text-sm text-neutral-600 mt-1">
                          Submitted by: {app.full_name || 'Unknown'} • {app.email}
                        </div>
                        {app.phone && (
                          <div className="text-sm text-neutral-600">Phone: {app.phone}</div>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 text-right">
                        {new Date(app.created_at).toLocaleDateString()}
                        <br />
                        {new Date(app.created_at).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Category (requested): {app.category || '-'}
                        </label>
                        <label className="block text-xs font-medium text-neutral-700 mb-1 mt-2">
                          Edit Business Category
                        </label>
                        <select
                          value={(appEdits[app.id]?.category) || app.category || 'professional-services'}
                          onChange={(e) => setAppEdits((m) => ({ ...m, [app.id]: { category: e.target.value, tagsInput: m[app.id]?.tagsInput || '' } }))}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {catOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Tags (comma separated)
                        </label>
                        <input
                          placeholder="e.g. local, family-owned, certified"
                          value={appEdits[app.id]?.tagsInput || ''}
                          onChange={(e) => setAppEdits((m) => ({ ...m, [app.id]: { category: m[app.id]?.category || 'professional-services', tagsInput: e.target.value } }))}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {app.challenge && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Additional Information
                        </label>
                        <div className="text-sm text-neutral-600 bg-white rounded-lg border border-neutral-200 px-3 py-2">
                          {app.challenge}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => approveApplication(app.id)} 
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm transition-colors"
                      >
                        ✓ Approve & Create Provider
                      </button>
                      <button 
                        onClick={() => deleteApplication(app.id)} 
                        className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 border border-red-200 font-medium text-sm transition-colors"
                      >
                        ✗ Delete Application
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && section === 'providers' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="flex items-center justify-between">
              <div className="font-medium">Providers Management</div>
              <div className="flex items-center gap-2">
                {!isCreatingNewProvider ? (
                  <button
                    onClick={startCreateNewProvider}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm"
                  >
                    + Create New Provider
                  </button>
                ) : (
                  <button
                    onClick={cancelCreateProvider}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium text-sm"
                  >
                    Cancel Create
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 text-sm">
              {providers.length === 0 && <div className="text-neutral-500">No providers found.</div>}
              {providers.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      list="providers-list"
                      placeholder="Type to search provider"
                      onChange={(e) => {
                        const name = e.target.value
                        const match = providers.find((p) => p.name.toLowerCase() === name.toLowerCase())
                        if (match) {
                          setSelectedProviderId(match.id)
                        }
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2"
                    />
                    <select
                      value={selectedProviderId || ''}
                      onChange={(e) => {
                        setSelectedProviderId(e.target.value || null)
                      }}
                      className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
                    >
                      <option value="">Select provider…</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <datalist id="providers-list">
                      {providers.map((p) => (
                        <option key={p.id} value={p.name}></option>
                      ))}
                    </datalist>
                  </div>
                  {/* Enhanced Provider Edit Form - Matching My Business Page Functionality */}
                  {(() => {
                    // If creating new provider, use the form state
                    if (isCreatingNewProvider) {
                      return (
                        <div className="rounded-xl border border-green-200 p-6 bg-green-50">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-lg font-semibold text-green-900">Create New Provider</h3>
                              <p className="text-sm text-green-700 mt-1">Fill out the form below to create a new provider</p>
                            </div>
                            <button
                              onClick={cancelCreateProvider}
                              className="text-green-600 hover:text-green-800 text-xl"
                            >
                              ✕
                            </button>
                          </div>
                          {/* Use the existing form but with newProviderTemplate */}
                          {/* The existing form content will be copied here - continuing with the form fields */}
                          
                          {/* Core Business Information */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-md font-medium text-green-800 mb-4">Core Business Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Business Name *
                                  </label>
                                  <input 
                                    value={newProviderForm.name || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, name: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="Enter business name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Category *
                                  </label>
                                  <select 
                                    value={newProviderForm.category_key || 'professional-services'} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, category_key: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                  >
                                    {catOptions.map((opt) => (
                                      <option key={opt.key} value={opt.key}>{opt.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Phone Number
                                  </label>
                                  <input 
                                    value={newProviderForm.phone || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, phone: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="(619) 123-4567"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Email Address
                                  </label>
                                  <input 
                                    value={newProviderForm.email || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, email: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="business@example.com"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Website
                                  </label>
                                  <input 
                                    value={newProviderForm.website || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, website: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="https://www.example.com"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">
                                    Address
                                  </label>
                                  <input 
                                    value={newProviderForm.address || ''} 
                                    onChange={(e) => {
                                      setNewProviderForm(prev => ({ ...prev, address: e.target.value }))
                                    }} 
                                    className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                    placeholder="123 Main St, Bonita, CA 91902"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Specialties */}
                            <div>
                              <div>
                                <label className="block text-sm font-medium text-green-700 mb-1">
                                  Specialties
                                  <span className="text-xs text-green-600 ml-2">
                                    (Comma-separated)
                                  </span>
                                </label>
                                <input 
                                  defaultValue={(newProviderForm.specialties || []).join(', ')} 
                                  onBlur={(e) => {
                                    setNewProviderForm(prev => ({ 
                                      ...prev, 
                                      specialties: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                    }))
                                  }} 
                                  className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                  placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography, Tax Planning"
                                />
                                <p className="text-xs text-green-600 mt-1">
                                  Type freely. Changes save when you leave the field.
                                </p>
                              </div>
                            </div>

                            {/* Plan Selection */}
                            <div>
                              <h4 className="text-md font-medium text-green-800 mb-4">Plan Type</h4>
                              <select 
                                value={newProviderForm.subscription_type || 'free'} 
                                onChange={(e) => {
                                  const newPlan = e.target.value
                                  setNewProviderForm(prev => ({
                                    ...prev,
                                    subscription_type: newPlan === 'free' ? null : newPlan,
                                    is_member: newPlan !== 'free',
                                    is_featured: newPlan !== 'free',
                                    featured_since: newPlan !== 'free' ? new Date().toISOString() : null
                                  }))
                                }}
                                className="rounded-lg border border-green-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="free">Free Plan</option>
                                <option value="yearly">Yearly ($97/yr)</option>
                              </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4 pt-4 border-t border-green-200">
                              <button 
                                onClick={() => {
                                  const providerToSave: ProviderRow = {
                                    id: 'new',
                                    name: newProviderForm.name || '',
                                    category_key: newProviderForm.category_key || 'professional-services',
                                    tags: newProviderForm.tags || [],
                                    badges: newProviderForm.badges || [],
                                    rating: newProviderForm.rating || null,
                                    phone: newProviderForm.phone || null,
                                    email: newProviderForm.email || null,
                                    website: newProviderForm.website || null,
                                    address: newProviderForm.address || null,
                                    images: newProviderForm.images || [],
                                    owner_user_id: newProviderForm.owner_user_id || null,
                                    is_member: newProviderForm.is_member || false,
                                    is_featured: newProviderForm.is_featured || false,
                                    featured_since: newProviderForm.featured_since || null,
                                    subscription_type: newProviderForm.subscription_type || null,
                                    description: newProviderForm.description || null,
                                    specialties: newProviderForm.specialties || null,
                                    social_links: newProviderForm.social_links || null,
                                    business_hours: newProviderForm.business_hours || null,
                                    service_areas: newProviderForm.service_areas || null,
                                    google_maps_url: newProviderForm.google_maps_url || null,
                                    bonita_resident_discount: newProviderForm.bonita_resident_discount || null,
                                    published: newProviderForm.published ?? true,
                                    created_at: newProviderForm.created_at || null,
                                    updated_at: newProviderForm.updated_at || null,
                                    booking_enabled: newProviderForm.booking_enabled || false,
                                    booking_type: newProviderForm.booking_type || null,
                                    booking_instructions: newProviderForm.booking_instructions || null,
                                    booking_url: newProviderForm.booking_url || null
                                  }
                                  saveProvider(providerToSave)
                                }} 
                                disabled={savingProvider || !newProviderForm.name?.trim()}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {savingProvider && (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                )}
                                {savingProvider ? 'Creating...' : 'Create Provider'}
                              </button>
                              <button
                                onClick={cancelCreateProvider}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Existing logic for editing
                    const editingProvider = selectedProviderId
                      ? providers.find(p => p.id === selectedProviderId)
                      : providers[0]
                    
                    if (!editingProvider) return null
                    
                    return (
                    <div className="rounded-xl border border-neutral-200 p-6 bg-white">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900">Editing: {editingProvider.name}</h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            {(() => {
                              // ACCOUNT STATUS DISPLAY: Use subscription_type to determine account status
                              // This ensures the display matches the actual plan system
                              if (editingProvider.subscription_type) {
                                return 'Featured Account'
                              }
                              return 'Free Account'
                            })()} • 
                            Category: {editingProvider.category_key}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* PLAN DROPDOWN: Replace checkbox with plan selection dropdown */}
                          {/* This allows admins to set providers as free, monthly, or yearly plans */}
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-neutral-700">Plan Type:</label>
                            <select 
                              value={editingProvider.subscription_type || 'free'} 
                              onChange={(e) => {
                                const newPlan = e.target.value
                                const now = new Date().toISOString()
                                setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? {
                                    ...p, 
                                  subscription_type: newPlan === 'free' ? null : newPlan,
                                  is_member: newPlan !== 'free',
                                  is_featured: newPlan !== 'free',
                                    featured_since: newPlan !== 'free' ? (p.featured_since || now) : null
                                  } : p
                                ))
                              }}
                              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                            >
                              <option value="free">Free</option>
                              <option value="yearly">Yearly ($97/yr)</option>
                            </select>
                          </div>
                          
                          {/* PLAN DURATION DISPLAY: Show how long the provider has been on their current plan */}
                          {/* This helps admins track plan duration and billing cycles */}
                          {editingProvider.subscription_type && editingProvider.featured_since && (
                            <div className="text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                              Featured since: {new Date(editingProvider.featured_since).toLocaleDateString()}
                              {editingProvider.subscription_type && (
                                <span className="ml-1">
                                  ({editingProvider.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} plan)
                                </span>
                              )}
                              {/* DURATION CALCULATOR: Show how long they've been featured */}
                              {(() => {
                                const startDate = new Date(editingProvider.featured_since!)
                                const now = new Date()
                                const diffTime = Math.abs(now.getTime() - startDate.getTime())
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                const diffMonths = Math.floor(diffDays / 30)
                                const diffYears = Math.floor(diffDays / 365)
                                
                                let durationText = ''
                                if (diffYears > 0) {
                                  durationText = `${diffYears} year${diffYears > 1 ? 's' : ''}`
                                } else if (diffMonths > 0) {
                                  durationText = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
                                } else {
                                  durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`
                                }
                                
                                return (
                                  <span className="ml-1 text-green-600 font-medium">
                                    ({durationText} ago)
                                  </span>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Core Business Information */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">Core Business Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Business Name *
                              </label>
                              <input 
                                value={editingProvider.name || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, name: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="Enter business name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Category *
                              </label>
                              <select 
                                value={editingProvider.category_key} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, category_key: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                              >
                          {catOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.name}</option>
                          ))}
                        </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Phone Number
                        </label>
                              <input 
                                value={editingProvider.phone || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, phone: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="(619) 123-4567"
                              />
                      </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Email Address
                              </label>
                              <input 
                                value={editingProvider.email || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, email: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="business@example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Website
                              </label>
                              <input 
                                value={editingProvider.website || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, website: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://www.example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Address
                              </label>
                              <input 
                                value={editingProvider.address || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, address: e.target.value } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="123 Main St, Bonita, CA 91902"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Business Description */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Description
                              <span className="text-xs text-neutral-500 ml-2">
                                ({(editingProvider.description?.length || 0)}/{editingProvider.is_member ? '500' : '200'} characters)
                              </span>
                            </label>
                            <textarea
                              value={editingProvider.description || ''}
                              onChange={(e) => {
                                const newDescription = e.target.value
                                if (!editingProvider.is_member && newDescription.length > 200) {
                                  return
                                }
                                setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { ...p, description: newDescription } : p
                                ))
                              }}
                              rows={4}
                              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                                !editingProvider.is_member && (editingProvider.description?.length || 0) > 200
                                  ? 'border-red-300 focus:ring-red-500'
                                  : 'border-neutral-300 focus:ring-neutral-500'
                              }`}
                              placeholder="Tell customers about your business..."
                              maxLength={editingProvider.is_member ? 500 : 200}
                            />
                          </div>
                        </div>

                        {/* Bonita Residents Discount */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Special Discount for Bonita Residents
                            </label>
                            <input 
                              value={editingProvider.bonita_resident_discount || ''} 
                              onChange={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, bonita_resident_discount: e.target.value } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="e.g., 10% off for Bonita residents, Free consultation for locals"
                            />
                          </div>
                        </div>

                        {/* Specialties */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Specialties
                              <span className="text-xs text-neutral-500 ml-2">
                                (Comma-separated)
                              </span>
                            </label>
                            <input 
                              defaultValue={(editingProvider.specialties || []).join(', ')} 
                              key={`specialties-${editingProvider.id}`}
                              onBlur={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, specialties: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography, Tax Planning"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Type freely and press Tab or click outside to save. Changes apply when you leave the field.
                            </p>
                          </div>
                        </div>

                        {/* Service Areas */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Areas You Serve
                            </label>
                            <input 
                              defaultValue={(editingProvider.service_areas || []).join(', ')} 
                              key={`service-areas-${editingProvider.id}`}
                              onBlur={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, service_areas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="Bonita, Chula Vista, San Diego, National City"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Type comma-separated areas. Changes save when you leave the field.
                            </p>
                          </div>
                        </div>

                        {/* Social Media Links - Featured Only */}
                        <div className={!editingProvider.is_member ? 'opacity-50 pointer-events-none' : ''}>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Social Media Links
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
                            )}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
                              <input 
                                value={editingProvider.social_links?.facebook || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { 
                                    ...p, 
                                    social_links: { ...p.social_links, facebook: e.target.value } 
                                  } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://facebook.com/yourbusiness"
                                disabled={!editingProvider.is_member}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                              <input 
                                value={editingProvider.social_links?.instagram || ''} 
                                onChange={(e) => setProviders((arr) => arr.map(p => 
                                  p.id === editingProvider.id ? { 
                                    ...p, 
                                    social_links: { ...p.social_links, instagram: e.target.value } 
                                  } : p
                                ))} 
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                placeholder="https://instagram.com/yourbusiness"
                                disabled={!editingProvider.is_member}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Image Upload Section */}
                        <div>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Business Images
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(1 image for free accounts)</span>
                            )}
                            {editingProvider.is_member && (
                              <span className="text-sm text-green-600 ml-2">(Up to 10 images for featured accounts)</span>
                            )}
                          </h4>
                          
                          {/* Current Images Display */}
                          {editingProvider.images && editingProvider.images.length > 0 && (
                            <div className="mb-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {editingProvider.images.map((imageUrl, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`Business image ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                                    />
                                    <button
                                      onClick={() => removeImage(editingProvider.id, imageUrl)}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                      title="Remove image"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Upload Section */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Upload Images
                              </label>
                              <input
                                type="file"
                                multiple={editingProvider.is_member === true}
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, editingProvider.id)}
                                disabled={uploadingImages}
                                className="w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <p className="text-xs text-neutral-500 mt-1">
                                {editingProvider.is_member 
                                  ? 'Select multiple images (JPG, PNG, GIF). Max 5MB per image, up to 10 total.'
                                  : 'Select one image (JPG, PNG, GIF). Max 5MB.'
                                }
                              </p>
                            </div>

                            {/* Upload Progress */}
                            {uploadingImages && (
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading images...
                              </div>
                            )}

                            {/* Image Limit Warning */}
                            {editingProvider.images && editingProvider.images.length >= (editingProvider.is_member ? 10 : 1) && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                  <strong>Image limit reached:</strong> {editingProvider.is_member ? 'Featured accounts can have up to 10 images.' : 'Free accounts can have 1 image.'} 
                                  {!editingProvider.is_member && ' Upgrade to featured to upload more images.'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Booking System - Featured Only */}
                        <div className={!editingProvider.is_member ? 'opacity-50 pointer-events-none' : ''}>
                          <h4 className="text-md font-medium text-neutral-800 mb-4">
                            Booking System Configuration
                            {!editingProvider.is_member && (
                              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
                            )}
                          </h4>
                          
                          {!editingProvider.is_member && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-sm text-amber-800">
                                <strong>Upgrade to Featured</strong> to enable online booking and appointment scheduling.
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-4">
                            {/* Enable Booking Toggle Switch */}
                            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-neutral-800">
                                    Online Booking System
                                  </span>
                                  {editingProvider.booking_enabled && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1">
                                  {editingProvider.booking_enabled 
                                    ? 'Customers can book appointments through your listing'
                                    : 'Enable to allow customers to book appointments or reservations online'
                                  }
                                </p>
                              </div>
                              
                              {/* Toggle Switch */}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!editingProvider.is_member) return
                                  // Use dedicated toggle function that only updates booking_enabled
                                  await toggleBookingEnabled(editingProvider.id, editingProvider.booking_enabled === true)
                                }}
                                disabled={!editingProvider.is_member}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  editingProvider.booking_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                                }`}
                                aria-label="Toggle booking system"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editingProvider.booking_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Booking Type */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Booking Type
                                </label>
                                <select 
                                  value={editingProvider.booking_type || ''} 
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_type: e.target.value as any || null } : p
                                  ))} 
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                                  disabled={!editingProvider.is_member}
                                >
                                  <option value="">Select booking type...</option>
                                  <option value="appointment">Appointment</option>
                                  <option value="reservation">Reservation</option>
                                  <option value="consultation">Consultation</option>
                                  <option value="walk-in">Walk-in Only</option>
                                </select>
                              </div>
                            )}

                            {/* Booking Instructions */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Booking Instructions
                                </label>
                                <textarea
                                  value={editingProvider.booking_instructions || ''}
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_instructions: e.target.value } : p
                                  ))}
                                  rows={3}
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                                  placeholder="e.g., Please call ahead for same-day appointments, Book at least 24 hours in advance, Walk-ins welcome during business hours"
                                  disabled={!editingProvider.is_member}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                  Instructions that will be shown to customers when they try to book
                                </p>
                              </div>
                            )}

                            {/* External Booking URL */}
                            {editingProvider.booking_enabled && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  External Booking URL (Optional)
                                </label>
                                <input 
                                  value={editingProvider.booking_url || ''} 
                                  onChange={(e) => setProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, booking_url: e.target.value } : p
                                  ))} 
                                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                                  placeholder="https://calendly.com/yourbusiness or https://yourbookingplatform.com"
                                  disabled={!editingProvider.is_member}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                  If you use an external booking platform, enter the URL here. Otherwise, customers will see booking instructions.
                                </p>
                              </div>
                            )}

                            {/* Booking Preview */}
                            {editingProvider.booking_enabled && editingProvider.is_member && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h5 className="text-sm font-medium text-blue-900 mb-2">Booking Preview</h5>
                                <div className="text-sm text-blue-800">
                                  <p><strong>Type:</strong> {editingProvider.booking_type || 'Not specified'}</p>
                                  {editingProvider.booking_url && (
                                    <p><strong>External URL:</strong> <a href={editingProvider.booking_url} target="_blank" rel="noopener noreferrer" className="underline">{editingProvider.booking_url}</a></p>
                                  )}
                                  {editingProvider.booking_instructions && (
                                    <p><strong>Instructions:</strong> {editingProvider.booking_instructions}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Tags</label>
                            <input 
                              defaultValue={(editingProvider.tags || []).join(', ')} 
                              key={`tags-${editingProvider.id}`}
                              onBlur={(e) => setProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="professional, reliable, local, certified"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Type comma-separated values. Changes save when you click outside the field.
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => saveProvider(editingProvider)} 
                            disabled={savingProvider}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {savingProvider && (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {savingProvider ? 'Saving...' : 'Save Changes'}
                          </button>
                        <button
                          onClick={() => {
                            const id = editingProvider.id
                            if (confirmDeleteProviderId === id) deleteProvider(id)
                            else setConfirmDeleteProviderId(id)
                          }}
                            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                        >
                          {confirmDeleteProviderId === editingProvider.id ? 'Confirm Delete' : 'Delete Provider'}
                        </button>
                        {confirmDeleteProviderId === editingProvider.id && (
                            <button 
                              onClick={() => setConfirmDeleteProviderId(null)} 
                              className="px-4 py-2 text-neutral-500 hover:text-neutral-700 underline"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        
                        <div className="text-sm text-neutral-500">
                          Last updated: {editingProvider.updated_at ? new Date(editingProvider.updated_at).toLocaleString() : 'Never'}
                        </div>
                      </div>
                      
                      {/* Save Status Messages */}
                      {message && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-800 font-medium">{message}</span>
                      </div>
                    </div>
                  )}
                      
                      {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-800 font-medium">{error}</span>
                            </div>
                            {/* RETRY BUTTON: Show retry button for timeout and network errors */}
                            {retryProvider && (
                              <button
                                onClick={retrySaveProvider}
                                disabled={savingProvider}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {savingProvider ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Retrying...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Retry
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && section === 'owner-change-requests' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Owner Change Requests & Logs</div>
            <div className="mt-2 space-y-2 text-sm">
              {(() => {
                // Group requests by business name
                const businessGroups = changeRequests.reduce<Record<string, typeof changeRequests[number][]>>((groups, r) => {
                  const businessName = r.providers?.name || 'Unknown Business';
                  if (!groups[businessName]) {
                    groups[businessName] = [];
                  }
                  groups[businessName].push(r);
                  return groups;
                }, {});

                return Object.entries(businessGroups).map(([businessName, requests]) => {
                  const isExpanded = expandedBusinessDropdowns.has(businessName);
                  const pendingCount = requests.filter(r => r.status === 'pending').length;
                  const approvedCount = requests.filter(r => r.status === 'approved').length;
                  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

                  return (
                    <div key={businessName} className="border border-neutral-200 rounded-lg">
                      {/* Business Header */}
                      <button
                        onClick={() => toggleBusinessDropdown(businessName)}
                        className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-neutral-900">{businessName}</div>
                          <div className="flex items-center gap-2 text-xs">
                            {pendingCount > 0 && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                                {pendingCount} pending
                              </span>
                            )}
                            {approvedCount > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                {approvedCount} approved
                              </span>
                            )}
                            {rejectedCount > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                {rejectedCount} rejected
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="border-t border-neutral-200 p-4 space-y-4">
                          {/* Pending Requests */}
                          {requests.some(r => r.status === 'pending') && (
                            <div>
                              <div className="font-medium text-amber-800 mb-3">📋 Pending Requests (Require Approval)</div>
                              <div className="space-y-3">
                                {requests.filter(r => r.status === 'pending').map((r) => {
                                  const currentProvider = providers.find(p => p.id === r.provider_id);
                                  const changeDiff = computeChangeDiff(currentProvider, r.changes);
                                  const isRequestExpanded = expandedChangeRequestIds.has(r.id);

                                  return (
                                    <div
                                      key={r.id}
                                      className="rounded-xl border border-neutral-200 p-3 bg-white shadow-sm"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-neutral-900">
                                          {r.type === 'update'
                                            ? 'Business Listing Update'
                                            : r.type === 'delete'
                                            ? 'Business Listing Deletion'
                                            : r.type === 'feature_request'
                                            ? 'Featured Upgrade Request'
                                            : r.type === 'claim'
                                            ? 'Business Claim Request'
                                            : r.type}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                          {new Date(r.created_at).toLocaleString()}
                                        </div>
                                      </div>

                                      {/* Owner Information */}
                                      <div className="text-xs text-neutral-600 mt-2 space-y-1">
                                        <div>
                                          <strong>Owner:</strong>{' '}
                                          {r.profiles?.name || r.profiles?.email || 'Loading...'}
                                        </div>
                                        <div>
                                          <strong>Owner Email:</strong>{' '}
                                          {r.profiles?.email || 'Loading...'}
                                        </div>
                                      </div>

                                      {/* Show what changed */}
                                      {r.type === 'update' && changeDiff.length > 0 && (
                                        <div className="mt-3">
                                          <div className="text-xs font-semibold text-neutral-700 mb-2">
                                            Changes Requested ({changeDiff.length} field
                                            {changeDiff.length !== 1 ? 's' : ''}):
                                          </div>
                                          {changeDiff.map((diff, idx) => (
                                            <div
                                              key={diff.field}
                                              className={idx > 0 ? 'pt-2 border-t border-blue-200' : ''}
                                            >
                                              <div className="text-xs font-semibold text-blue-900 mb-1">
                                                {diff.fieldLabel}
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                  <span className="text-red-700 font-medium">Old:</span>
                                                  <div className="text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200 break-words">
                                                    {formatValueForDisplay(diff.oldValue)}
                                                  </div>
                                                </div>
                                                <div>
                                                  <span className="text-green-700 font-medium">New:</span>
                                                  <div className="text-green-600 mt-1 p-2 bg-green-50 rounded border border-green-200 break-words">
                                                    {formatValueForDisplay(diff.newValue)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Button to show all details */}
                                      <button
                                        onClick={() => toggleChangeRequestExpansion(r.id)}
                                        className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                      >
                                        {isRequestExpanded ? (
                                          <>
                                            <ChevronUp className="w-3 h-3" />
                                            Hide Full Details
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3" />
                                            View Full Business Details
                                          </>
                                        )}
                                      </button>

                                      {/* Expanded view showing all current business details */}
                                      {isRequestExpanded && currentProvider && (
                                        <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                                          <div className="text-xs font-semibold text-neutral-700 mb-2">
                                            Complete Business Information:
                                          </div>
                                          <div className="text-xs text-neutral-600 space-y-1">
                                            <div><strong>ID:</strong> {currentProvider.id}</div>
                                            <div><strong>Name:</strong> {currentProvider.name}</div>
                                            <div><strong>Category:</strong> {currentProvider.category_key}</div>
                                            <div><strong>Phone:</strong> {currentProvider.phone || '(not set)'}</div>
                                            <div><strong>Email:</strong> {currentProvider.email || '(not set)'}</div>
                                            <div><strong>Website:</strong> {currentProvider.website || '(not set)'}</div>
                                            <div><strong>Address:</strong> {currentProvider.address || '(not set)'}</div>
                                            <div><strong>Description:</strong> {currentProvider.description || '(not set)'}</div>
                                            <div><strong>Tags:</strong> {currentProvider.tags?.join(', ') || '(none)'}</div>
                                            <div><strong>Specialties:</strong> {currentProvider.specialties?.join(', ') || '(none)'}</div>
                                            <div><strong>Service Areas:</strong> {currentProvider.service_areas?.join(', ') || '(none)'}</div>
                                            <div><strong>Bonita Discount:</strong> {currentProvider.bonita_resident_discount || '(none)'}</div>
                                            <div><strong>Member Status:</strong> {currentProvider.is_member ? 'Yes' : 'No'}</div>
                                            <div><strong>Booking Enabled:</strong> {currentProvider.booking_enabled ? 'Yes' : 'No'}</div>
                                            {currentProvider.booking_enabled && (
                                              <>
                                                <div><strong>Booking Type:</strong> {currentProvider.booking_type || '(not set)'}</div>
                                                <div><strong>Booking Instructions:</strong> {currentProvider.booking_instructions || '(not set)'}</div>
                                                <div><strong>Booking URL:</strong> {currentProvider.booking_url || '(not set)'}</div>
                                              </>
                                            )}
                                            <div><strong>Images:</strong> {currentProvider.images?.length || 0} image(s)</div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Show all proposed changes for non-update types */}
                                      {r.type !== 'update' && r.changes && Object.keys(r.changes).length > 0 && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                          <div className="text-xs font-medium text-gray-700 mb-1">
                                            Proposed Changes:
                                          </div>
                                          <div className="text-xs text-gray-600 space-y-1">
                                            {Object.entries(r.changes || {}).map(([field, value]) => (
                                              <div key={field} className="flex justify-between">
                                                <span className="font-medium capitalize">
                                                  {field.replace(/_/g, ' ')}:
                                                </span>
                                                <span className="ml-2">{formatValueForDisplay(value)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {r.reason && (
                                        <div className="text-xs text-neutral-600 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                          <strong>Reason:</strong> {r.reason}
                                        </div>
                                      )}

                                      <div className="mt-3 flex items-center gap-2">
                                        <button
                                          onClick={() => approveChangeRequest(r)}
                                          className="btn btn-primary text-xs"
                                          disabled={r.status !== 'pending'}
                                        >
                                          {r.status === 'pending' ? 'Approve' : r.status}
                                        </button>
                                        <button
                                          onClick={() => rejectChangeRequest(r)}
                                          className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                                          disabled={r.status !== 'pending'}
                                        >
                                          {r.status === 'pending' ? 'Reject' : r.status}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Change Logs (Featured Businesses) */}
              {changeRequests.some(
                (r) => r.status === 'approved' && r.reason?.includes('Featured business update')
              ) && (
                <div className="mb-4">
                  <div className="font-medium text-green-800 mb-2">📝 Recent Change Logs (Featured Businesses)</div>
                  <div className="space-y-2">
                    {changeRequests
                      .filter((r) => r.status === 'approved' && r.reason?.includes('Featured business update'))
                      .slice(0, 10) // Show last 10 changes
                      .map((r) => {
                        const currentProvider = providers.find(p => p.id === r.provider_id)
                        const changeDiff = computeChangeDiff(currentProvider, r.changes)
                        
                        return (
                          <div key={r.id} className="rounded-xl border border-green-200 p-3 bg-green-50 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-green-900">
                                ✅ Auto-Applied Changes
                              </div>
                              <div className="text-xs text-green-600">{new Date(r.created_at).toLocaleString()}</div>
                            </div>
                            
                            {/* Business Information */}
                            <div className="text-xs text-green-700 mt-2 space-y-1">
                              <div><strong>Business:</strong> {r.providers?.name || 'Unknown Business'}</div>
                              <div><strong>Owner:</strong> {r.profiles?.name || r.profiles?.email || 'Loading...'}</div>
                            </div>
                            
                            {/* Show what changed */}
                            {r.type === 'update' && changeDiff.length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs font-semibold text-green-800 mb-2">
                                  Changes Applied ({changeDiff.length} field{changeDiff.length !== 1 ? 's' : ''}):
                                </div>
                                
                                {/* Show changed fields */}
                                <div className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
                                  {changeDiff.map((diff, idx) => (
                                    <div key={diff.field} className={`${idx > 0 ? 'pt-2 border-t border-green-200' : ''}`}>
                                      <div className="text-xs font-semibold text-green-900 mb-1">
                                        {diff.fieldLabel}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-red-700 font-medium">Old:</span>
                                          <div className="text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200 break-words">
                                            {formatValueForDisplay(diff.oldValue)}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-green-700 font-medium">New:</span>
                                          <div className="text-green-600 mt-1 p-2 bg-green-50 rounded border border-green-200 break-words">
                                            {formatValueForDisplay(diff.newValue)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* No requests message */}
              {changeRequests.length === 0 && (
                <div className="text-neutral-500">No requests or changes yet.</div>
              )}
            </div>
          </div>
        )}
          {isAdmin && section === 'job-posts' && (
          <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
            <div className="font-medium">Job Posts</div>
            
            {/* Debug Info */}
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
              <div className="font-medium text-yellow-800 mb-1">Debug Info:</div>
              <div className="text-yellow-700">
                Total jobs: {jobPosts.length} | 
                Pending: {jobPosts.filter(j => j.status === 'pending').length} | 
                Approved: {jobPosts.filter(j => j.status === 'approved').length} | 
                Rejected: {jobPosts.filter(j => j.status === 'rejected').length}
              </div>
              {jobPosts.length > 0 && (
                <div className="mt-1 text-yellow-600">
                  Statuses: {jobPosts.map(j => j.status).join(', ')}
                </div>
              )}
            </div>
            
            <div className="mt-2 space-y-2 text-sm">
              {jobPosts.length === 0 && <div className="text-neutral-500">No job posts yet.</div>}
              
              {/* All Jobs - Grouped by Status */}
              {jobPosts.length > 0 && (
                <div className="space-y-4">
                  {/* Pending Jobs */}
                  {jobPosts.filter((j) => j.status === 'pending').length > 0 && (
                    <div>
                      <h4 className="font-medium text-amber-800 mb-2">Pending Review ({jobPosts.filter((j) => j.status === 'pending').length})</h4>
                      {jobPosts.filter((j) => j.status === 'pending').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                  
                  {/* Approved Jobs */}
                  {jobPosts.filter((j) => j.status === 'approved').length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">Approved ({jobPosts.filter((j) => j.status === 'approved').length})</h4>
                      {jobPosts.filter((j) => j.status === 'approved').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                  
                  {/* Rejected Jobs */}
                  {jobPosts.filter((j) => j.status === 'rejected').length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Rejected ({jobPosts.filter((j) => j.status === 'rejected').length})</h4>
                      {jobPosts.filter((j) => j.status === 'rejected').map((j) => (
                        <JobCard key={j.id} job={j} onApprove={() => approveJobPost(j)} onReject={() => rejectJobPost(j)} onDelete={() => deleteJobPost(j.id)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Legacy pending jobs display - keeping for now */}
              {false && jobPosts.filter((j) => j.status === 'pending').map((j) => (
                <div key={j.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{j.title}</div>
                    <div className="text-xs text-neutral-500">{new Date(j.created_at).toLocaleString()}</div>
                  </div>
                  {j.description && <div className="mt-1 text-xs text-neutral-700 whitespace-pre-wrap">{j.description}</div>}
                  <div className="mt-1 text-xs text-neutral-600">Apply: {j.apply_url || '-'}</div>
                  <div className="mt-1 text-xs text-neutral-600">Salary: {j.salary_range || '-'}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => approveJobPost(j)} className="btn btn-primary text-xs">Approve</button>
                    <button onClick={() => rejectJobPost(j)} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        {isAdmin && section === 'blog' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Blog Post Manager</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-2">
                  <select value={blogDraft.category_key} onChange={(e) => setBlogDraft((d) => ({ ...d, category_key: e.target.value }))} className="rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                    <option value="restaurants-cafes">Restaurants & Cafés — Top 5 Restaurants This Month</option>
                    <option value="home-services">Home Services — Bonita Home Service Deals</option>
                    <option value="health-wellness">Health & Wellness — Wellness Spotlight</option>
                    <option value="real-estate">Real Estate — Property Opportunities in Bonita</option>
                    <option value="professional-services">Professional Services — Top Professional Services of Bonita</option>
                  </select>
                  <input value={blogDraft.title} onChange={(e) => setBlogDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Post title" className="rounded-xl border border-neutral-200 px-3 py-2" />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-neutral-500">Format:</span>
                    <button type="button" onClick={() => applyFormat('bold')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white font-semibold">B</button>
                    <button type="button" onClick={() => applyFormat('italic')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white italic">I</button>
                    <button type="button" onClick={() => applyFormat('underline')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white underline">U</button>
                    <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:20px;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Large</button>
                    <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:24px; font-weight:700;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">XL Bold</button>
                    <button type="button" onClick={clearFormattingToNormal} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Normal</button>
                    <button type="button" onClick={() => setEmojiOpen(true)} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Emoji</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={syncEditorToState}
                    className="rounded-xl border border-neutral-200 px-3 py-2 min-h-[200px] bg-white prose max-w-none space-y-4"
                    style={{ outline: 'none' as any }}
                  />
                  {emojiOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/20" onClick={() => setEmojiOpen(false)}></div>
                      <div className="relative rounded-2xl border border-neutral-200 bg-white p-3 w-[380px] max-h-[70vh] flex flex-col shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">Choose Emoji</div>
                          <button className="text-sm" onClick={() => setEmojiOpen(false)}>Close</button>
                        </div>
                        <input value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Search…" className="mt-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                        <div className="mt-2 grid grid-cols-8 gap-1 overflow-auto">
                          {filteredEmojis.map((e, i) => (
                            <button key={i} type="button" onClick={() => { insertEmoji(e); setEmojiOpen(false) }} className="h-9 w-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-lg">{e}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Image Upload Section */}
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium text-neutral-700">Images</div>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length === 0) return
                          
                          setMessage('Uploading images...')
                          const uploadPromises = files.map(file => uploadBlogImage(file))
                          const urls = await Promise.all(uploadPromises)
                          const validUrls = urls.filter(url => url !== null) as string[]
                          
                          if (validUrls.length > 0) {
                            setBlogDraft(prev => ({
                              ...prev,
                              images: [...(prev.images || []), ...validUrls]
                            }))
                            setMessage(`${validUrls.length} image(s) uploaded successfully`)
                          } else {
                            setMessage('Failed to upload images')
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white"
                      />
                      <div className="text-xs text-neutral-500">
                        Upload AI-generated images or photos to make your blog posts more engaging
                      </div>
                    </div>
                    
                    {/* Display uploaded images */}
                    {blogDraft.images && blogDraft.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {blogDraft.images.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Blog image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                            />
                            <button
                              onClick={async () => {
                                const imageUrl = blogDraft.images?.[index]
                                if (!imageUrl) return
                                
                                // Delete from storage first
                                const { error } = await deleteBlogImage(imageUrl)
                                if (error) {
                                  setError(`Failed to delete image: ${error}`)
                                  return
                                }
                                
                                // Remove from local state
                                setBlogDraft(prev => ({
                                  ...prev,
                                  images: prev.images?.filter((_, i) => i !== index) || []
                                }))
                                
                                setMessage('Image deleted successfully')
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setError(null); setMessage(null)
                        const { error } = await upsertBlogPost({ id: blogDraft.id, category_key: blogDraft.category_key, title: blogDraft.title, content: blogDraft.content, images: blogDraft.images } as any)
                        if (error) setError(error)
                        else {
                          setMessage('Blog post saved')
                          const posts = await fetchAllBlogPosts()
                          setBlogPosts(posts)
                          setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '', images: [] })
                        }
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Save Post
                    </button>
                    {blogDraft.id && (
                      <button onClick={() => setBlogDraft({ category_key: blogDraft.category_key, title: '', content: '', images: [] })} className="text-xs underline">New</button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Existing Posts</div>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {blogPosts.length === 0 && <div className="text-neutral-500">No posts yet.</div>}
                  {blogPosts.map((bp) => (
                    <div key={bp.id} className="rounded-xl border border-neutral-200 p-2">
                      <div className="font-medium text-sm">{bp.title}</div>
                      <div className="text-[11px] text-neutral-500">{bp.category_key} • {new Date(bp.created_at).toLocaleString()}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => setBlogDraft({ id: bp.id, category_key: bp.category_key, title: bp.title, content: bp.content, images: bp.images || [] })} className="btn btn-secondary text-xs">Edit</button>
                        <button onClick={async () => { const { error } = await deleteBlogPost(bp.id); if (error) setError(error); else { setMessage('Post deleted'); setBlogPosts((arr) => arr.filter((p) => p.id !== bp.id)) } }} className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {isAdmin && section === 'calendar-events' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="font-medium">Calendar Events Manager</div>
            <div className="mt-2 text-sm text-neutral-600">
              Manage local events for the Bonita community calendar. Events are automatically fetched from RSS feeds and can be manually curated.
            </div>
            
            {/* Zip Code Filter Button */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900">Filter Events by Zip Code</div>
                  <div className="text-xs text-blue-700 mt-1">
                    Remove events outside the Bonita/Chula Vista area (~20 minute radius). 
                    This will delete events without zip codes or outside allowed zip codes.
                  </div>
                </div>
                <button
                  onClick={openZipFilterModal}
                  disabled={calendarEvents.length === 0}
                  className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    calendarEvents.length === 0
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Filter by Zip Code
                </button>
              </div>
            </div>

            {/* Zip Code Filter Modal */}
            {showZipFilterModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-neutral-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-neutral-900">Filter Events by Zip Code</h2>
                        <div className="mt-2 text-sm text-neutral-600">
                          Review and select events to delete. Events are pre-selected based on zip code filtering.
                        </div>
                        <div className="mt-3 flex gap-4 text-sm">
                          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                            {eventsToFilter.toDelete.length} events to review
                          </div>
                          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                            {eventsToFilter.toKeep.length} events will be kept
                          </div>
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                            {selectedEventIds.size} selected for deletion
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowZipFilterModal(false)}
                        className="text-neutral-400 hover:text-neutral-600 text-2xl font-bold leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Modal Body - Scrollable Events List */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Select All Checkbox */}
                    <div className="mb-4 pb-4 border-b border-neutral-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEventIds.size === eventsToFilter.toDelete.length && eventsToFilter.toDelete.length > 0}
                          onChange={toggleAllEventSelection}
                          className="w-5 h-5 text-blue-600 rounded border-neutral-300 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-medium text-neutral-900">
                          {selectedEventIds.size === eventsToFilter.toDelete.length && eventsToFilter.toDelete.length > 0
                            ? 'Deselect All'
                            : 'Select All'}
                        </span>
                      </label>
                    </div>

                    {/* Events List */}
                    <div className="space-y-4">
                      {eventsToFilter.toDelete.map((event) => (
                        <div
                          key={event.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            selectedEventIds.has(event.id)
                              ? 'border-red-300 bg-red-50'
                              : 'border-neutral-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 pt-1">
                              <input
                                type="checkbox"
                                checked={selectedEventIds.has(event.id)}
                                onChange={() => toggleEventSelection(event.id)}
                                className="w-5 h-5 text-red-600 rounded border-neutral-300 focus:ring-2 focus:ring-red-500 cursor-pointer"
                              />
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 min-w-0">
                              {/* Title and Reason */}
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="font-medium text-neutral-900">{event.title}</h3>
                                <span className="flex-shrink-0 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  {event.reason}
                                </span>
                              </div>

                              {/* Date, Time, Location */}
                              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">📅</span>
                                  <span>{new Date(event.date).toLocaleDateString()} {event.time && `at ${event.time}`}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">📍</span>
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.address && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">🏠</span>
                                    <span>{event.address}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">🏷️</span>
                                  <span>{event.category} • {event.source}</span>
                                </div>
                              </div>

                              {/* Description - Selectable */}
                              {event.description && (
                                <div className="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                  <div className="text-xs font-medium text-neutral-500 mb-1">Description (selectable):</div>
                                  <div className="text-sm text-neutral-700 select-text">
                                    {event.description}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {eventsToFilter.toDelete.length === 0 && (
                        <div className="text-center py-12 text-neutral-500">
                          <div className="text-4xl mb-2">✓</div>
                          <div className="text-lg font-medium">All events are in allowed zip codes!</div>
                          <div className="text-sm mt-1">No events need to be filtered.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-neutral-200 bg-neutral-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-neutral-600">
                        {selectedEventIds.size > 0 ? (
                          <span className="font-medium text-red-600">
                            {selectedEventIds.size} event{selectedEventIds.size !== 1 ? 's' : ''} will be deleted
                          </span>
                        ) : (
                          <span>No events selected</span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowZipFilterModal(false)}
                          className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-100 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeZipFilterDeletion}
                          disabled={filteringByZipCode || selectedEventIds.size === 0}
                          className={`px-6 py-2 rounded-lg font-medium ${
                            filteringByZipCode || selectedEventIds.size === 0
                              ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {filteringByZipCode ? 'Deleting...' : `Delete Selected (${selectedEventIds.size})`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Calendar Events List */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Current Events ({calendarEvents.length})</div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {calendarEvents.length === 0 ? (
                  <div className="text-neutral-500 text-sm">No events found. Events will appear here from RSS feeds and manual additions.</div>
                ) : (
                  calendarEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-neutral-200 p-3">
                      {editingEventId === event.id && editingEvent ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-neutral-700">Title</label>
                            <input
                              type="text"
                              value={editingEvent.title}
                              onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-neutral-700">Date</label>
                              <input
                                type="date"
                                value={editingEvent.date.split('T')[0]}
                                onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value + 'T12:00:00' })}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-neutral-700">Time</label>
                              <input
                                type="time"
                                value={editingEvent.time || '12:00'}
                                onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-neutral-700">Location</label>
                            <input
                              type="text"
                              value={editingEvent.location || ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-neutral-700">Address</label>
                            <input
                              type="text"
                              value={editingEvent.address || ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, address: e.target.value })}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-neutral-700">Category</label>
                            <input
                              type="text"
                              value={editingEvent.category}
                              onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-neutral-700">Description</label>
                            <textarea
                              value={editingEvent.description || ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={saveCalendarEvent}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEditingEvent}
                              className="px-4 py-2 bg-neutral-200 text-neutral-800 text-sm rounded-lg hover:bg-neutral-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{event.title}</div>
                              <div className="text-xs text-neutral-500 mt-1">
                                {new Date(event.date).toLocaleDateString()} at {event.time || 'TBD'}
                              </div>
                              <div className="text-xs text-neutral-600 mt-1">
                                {event.location && <span>📍 {event.location}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  event.source.includes('San Diego') ? 'bg-blue-100 text-blue-800' :
                                  event.source.includes('Library') ? 'bg-green-100 text-green-800' :
                                  event.source.includes('Parks') ? 'bg-emerald-100 text-emerald-800' :
                                  event.source.includes('Museum') ? 'bg-purple-100 text-purple-800' :
                                  event.source === 'Local' ? 'bg-neutral-100 text-neutral-800' :
                                  event.source === 'Recurring' ? 'bg-orange-100 text-orange-800' :
                                  'bg-neutral-100 text-neutral-800'
                                }`}>
                                  {event.source}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  event.category === 'Community' ? 'bg-green-100 text-green-700' :
                                  event.category === 'Family' ? 'bg-blue-100 text-blue-700' :
                                  event.category === 'Business' ? 'bg-purple-100 text-purple-700' :
                                  event.category === 'Culture' ? 'bg-indigo-100 text-indigo-700' :
                                  event.category === 'Education' ? 'bg-cyan-100 text-cyan-700' :
                                  event.category === 'Recurring' ? 'bg-orange-100 text-orange-700' :
                                  'bg-neutral-100 text-neutral-700'
                                }`}>
                                  {event.category}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-neutral-500">
                                  <span>👍 {event.upvotes}</span>
                                  <span>👎 {event.downvotes}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => startEditingEvent(event)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
                                    deleteCalendarEvent(event.id)
                                  }
                                }}
                                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {event.description && (
                            <>
                              <div className={`mt-2 text-xs text-neutral-600 ${expandedEventIds.has(event.id) ? '' : 'line-clamp-2'}`}>
                                {event.description}
                              </div>
                              <button
                                onClick={() => toggleEventExpansion(event.id)}
                                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                {expandedEventIds.has(event.id) ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    <span>Show less</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    <span>Show more</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Event Management Buttons */}
            <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddEventForm(!showAddEventForm)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  {showAddEventForm ? '✕ Cancel' : '+ Add Single Event'}
                </button>
                
                <button
                  onClick={() => setShowBulkImportForm(!showBulkImportForm)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showBulkImportForm ? '✕ Cancel' : '📥 Bulk Import CSV'}
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Clear all existing events and add sample Bonita events?')) {
                      addSampleBonitaEvents()
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🏘️ Add Bonita Events
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Trigger server-side iCalendar refresh? This will fetch events from government and civic organizations using the Netlify function.')) {
                      refreshICalFeedsServer()
                    }
                  }}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  🔄 Refresh iCal Feeds (Server)
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Fetch events from Voice of San Diego? This will import their latest community events.')) {
                      refreshVosdEvents()
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  📰 Fetch Voice of SD Events
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Fetch events from KPBS? This will scrape and import their latest community events.')) {
                      refreshKpbsEvents()
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📺 Fetch KPBS Events
                </button>
              </div>
              
              <div className="text-xs text-neutral-500">
                <strong>Bulk Import:</strong> Use CSV format: Title,Date,Time,Location,Address,Category,Description<br/>
                <strong>Sample:</strong> Farmers Market,2024-01-15,09:00,Bonita Park,3215 Bonita Rd,Community,Weekly market<br/>
                <strong>iCal Feeds:</strong> Automatically imports events from City of San Diego, Libraries, UC San Diego, Zoo, and Balboa Park
              </div>
            </div>
            
            {/* Add Single Event Form */}
            {showAddEventForm && (
              <div className="mt-4 p-6 rounded-xl border-2 border-green-200 bg-green-50">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Add New Event</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const date = formData.get('date') as string
                  const time = formData.get('time') as string
                  
                  addCalendarEvent({
                    title: formData.get('title') as string,
                    description: formData.get('description') as string || '',
                    date: new Date(date + 'T' + time).toISOString(),
                    time: time,
                    location: formData.get('location') as string || '',
                    address: formData.get('address') as string || '',
                    category: formData.get('category') as string,
                    source: 'Local',
                    upvotes: 0,
                    downvotes: 0
                  })
                  setShowAddEventForm(false)
                  e.currentTarget.reset()
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Event Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="e.g., Bonita Farmers Market"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date"
                        required
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="time"
                        required
                        defaultValue="12:00"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        placeholder="e.g., Bonita Community Park"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        placeholder="e.g., 3215 Bonita Rd, Bonita, CA 91902"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        required
                        defaultValue="Community"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="Community">Community</option>
                        <option value="Family">Family</option>
                        <option value="Business">Business</option>
                        <option value="Health & Wellness">Health & Wellness</option>
                        <option value="Food & Entertainment">Food & Entertainment</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Senior Activities">Senior Activities</option>
                        <option value="Arts & Crafts">Arts & Crafts</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        placeholder="Event description, details, and any additional information..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEventForm(false)}
                      className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Bulk Import CSV Form */}
            {showBulkImportForm && (
              <div className="mt-4 p-6 rounded-xl border-2 border-blue-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bulk Import Events (CSV)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Upload CSV File <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 hover:border-blue-500 transition-colors text-center">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setCsvFile(file)
                              }
                            }}
                            className="hidden"
                          />
                          <div className="text-blue-600 mb-2">📁</div>
                          {csvFile ? (
                            <div>
                              <div className="font-medium text-neutral-900">{csvFile.name}</div>
                              <div className="text-sm text-neutral-500">{(csvFile.size / 1024).toFixed(2)} KB</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-neutral-700">Click to upload CSV file</div>
                              <div className="text-sm text-neutral-500 mt-1">or drag and drop</div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-2">CSV Format:</h4>
                    <code className="block text-xs bg-neutral-100 p-3 rounded font-mono overflow-x-auto">
                      Title,Date,Time,Location,Address,Category,Description<br/>
                      Farmers Market,2024-01-15,09:00,Bonita Park,3215 Bonita Rd,Community,Weekly market
                    </code>
                    <p className="text-xs text-neutral-600 mt-2">
                      <strong>Note:</strong> First row can be a header (will be auto-detected and skipped)
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkImportForm(false)
                        setCsvFile(null)
                      }}
                      className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (csvFile) {
                          handleCsvUpload(csvFile)
                        } else {
                          alert('Please select a CSV file first')
                        }
                      }}
                      disabled={!csvFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Import Events
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flagged Events Section */}
        {isAdmin && section === 'flagged-events' && (
          <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-medium text-lg">Flagged Events</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Review community-reported events and take appropriate action
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  flaggedEvents.length > 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {flaggedEvents.length} Flagged Event{flaggedEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {flaggedEvents.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-lg">
                <div className="text-4xl mb-3">✓</div>
                <div className="text-lg font-medium text-neutral-700">No Flagged Events</div>
                <div className="text-sm text-neutral-500 mt-1">
                  All events are looking good! Flagged events will appear here.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedEvents.map((flag) => (
                  <div
                    key={flag.id}
                    className="border-2 border-red-200 rounded-xl p-4 bg-red-50"
                  >
                    {/* Flag Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full uppercase">
                            {flag.reason.replace(/-/g, ' ')}
                          </span>
                          <span className="text-xs text-neutral-500">
                            Reported {new Date(flag.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-600">
                          Reporter: {flag.reporter_email}
                        </div>
                      </div>
                    </div>

                    {/* Event Info */}
                    {flag.event ? (
                      <div className="bg-white rounded-lg p-4 border border-neutral-200 mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-neutral-900">{flag.event.title}</h3>
                          <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                            {flag.event.source}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-neutral-600">
                          <div>📅 {new Date(flag.event.date).toLocaleDateString()} {flag.event.time && `at ${flag.event.time}`}</div>
                          {flag.event.location && <div>📍 {flag.event.location}</div>}
                          {flag.event.address && <div>🏠 {flag.event.address}</div>}
                          <div>🏷️ {flag.event.category}</div>
                        </div>
                        {flag.event.description && (
                          <div className="mt-2 pt-2 border-t border-neutral-200">
                            <div className="text-xs font-medium text-neutral-500 mb-1">Description:</div>
                            <div className="text-sm text-neutral-700">{flag.event.description}</div>
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-neutral-200 flex items-center gap-4 text-xs text-neutral-500">
                          <span>👍 {flag.event.upvotes} upvotes</span>
                          <span>👎 {flag.event.downvotes} downvotes</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-neutral-100 rounded-lg p-4 mb-3 text-center text-sm text-neutral-500">
                        Event has been deleted
                      </div>
                    )}

                    {/* Flag Details */}
                    {flag.details && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                        <div className="text-xs font-medium text-yellow-900 mb-1">Reporter's Comments:</div>
                        <div className="text-sm text-yellow-800">{flag.details}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-neutral-500">
                        Event ID: {flag.event_id.substring(0, 8)}...
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!confirm('Dismiss this flag? The event will remain on the calendar.')) return
                            try {
                              const { error } = await supabase
                                .from('event_flags')
                                .delete()
                                .eq('id', flag.id)
                              
                              if (error) throw error
                              
                              // Refresh flagged events
                              setFlaggedEvents(prev => prev.filter(f => f.id !== flag.id))
                              alert('Flag dismissed successfully')
                            } catch (error: any) {
                              console.error('Error dismissing flag:', error)
                              alert('Failed to dismiss flag: ' + error.message)
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          ✓ Dismiss Flag
                        </button>
                        {flag.event && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete event "${flag.event?.title}"? This cannot be undone.`)) return
                              try {
                                // Delete the event
                                const { error: eventError } = await supabase
                                  .from('calendar_events')
                                  .delete()
                                  .eq('id', flag.event_id)
                                
                                if (eventError) throw eventError

                                // Delete all flags for this event
                                const { error: flagError } = await supabase
                                  .from('event_flags')
                                  .delete()
                                  .eq('event_id', flag.event_id)
                                
                                if (flagError) console.warn('Error deleting flags:', flagError)
                                
                                // Refresh flagged events
                                setFlaggedEvents(prev => prev.filter(f => f.event_id !== flag.event_id))
                                
                                // Refresh calendar events in case admin switches tabs
                                try {
                                  const { fetchCalendarEvents } = await import('./Calendar')
                                  const events = await fetchCalendarEvents()
                                  setCalendarEvents(events)
                                } catch (refreshError) {
                                  console.warn('Could not refresh calendar events:', refreshError)
                                }
                                
                                alert('Event deleted successfully')
                              } catch (error: any) {
                                console.error('Error deleting event:', error)
                                alert('Failed to delete event: ' + error.message)
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            🗑️ Delete Event
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
function JobCard({ 
  job, 
  onApprove, 
  onReject, 
  onDelete 
}: { 
  job: ProviderJobPostWithDetails
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'rejected': return '❌'
      default: return '📄'
    }
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${getStatusColor(job.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(job.status)}</span>
            <h4 className="font-semibold text-lg">{job.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          <div className="text-sm text-neutral-600">
            Posted: {new Date(job.created_at).toLocaleString()}
            {job.decided_at && (
              <span className="ml-2">
                | Decided: {new Date(job.decided_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        {job.description && (
          <div>
            <span className="text-sm font-medium">Description:</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Apply URL:</span>
            <div className="mt-1">
              {job.apply_url ? (
                <a 
                  href={job.apply_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {job.apply_url}
                </a>
              ) : (
                <span className="text-neutral-500">Not provided</span>
              )}
            </div>
          </div>
          
          <div>
            <span className="font-medium">Salary Range:</span>
            <div className="mt-1">
              {job.salary_range || <span className="text-neutral-500">Not specified</span>}
            </div>
          </div>
        </div>

        {/* Provider Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <div className="text-xs font-medium text-blue-800 mb-1">Business Information</div>
            <div className="space-y-1 text-sm">
              {job.provider ? (
                <>
                  <div>
                    <span className="font-medium">Business Name:</span>
                    <span className="ml-2 text-blue-900">{job.provider.name}</span>
                  </div>
                  {job.provider.email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <a href={`mailto:${job.provider.email}`} className="ml-2 text-blue-600 hover:underline">
                        {job.provider.email}
                      </a>
                    </div>
                  )}
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">Provider ID:</span>
                    <span className="ml-1 font-mono">{job.provider_id}</span>
                  </div>
                </>
              ) : (
                <div className="text-neutral-600">
                  Provider ID: {job.provider_id}
                  <div className="text-xs text-neutral-500 mt-1">(Details not available)</div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-blue-800 mb-1">Posted By (Owner)</div>
            <div className="space-y-1 text-sm">
              {job.owner ? (
                <>
                  {job.owner.name && (
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2 text-blue-900">{job.owner.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Email:</span>
                    <a href={`mailto:${job.owner.email}`} className="ml-2 text-blue-600 hover:underline">
                      {job.owner.email}
                    </a>
                  </div>
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">User ID:</span>
                    <span className="ml-1 font-mono">{job.owner_user_id}</span>
                  </div>
                </>
              ) : (
                <div className="text-neutral-600">
                  Owner ID: {job.owner_user_id}
                  <div className="text-xs text-neutral-500 mt-1">(Details not available)</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-current border-opacity-20">
        {job.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'approved' && (
          <>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'rejected' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
          </>
        )}
        
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-neutral-600 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}


