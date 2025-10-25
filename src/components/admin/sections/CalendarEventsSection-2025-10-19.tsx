import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { type CalendarEvent } from '../../../pages/Calendar'

interface CalendarEventsSectionProps {
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
}

type ZipFilterModalState = {
  toDelete: CalendarEvent[]
  toKeep: CalendarEvent[]
}

type CSVImportState = {
  status: 'idle' | 'processing' | 'success' | 'error'
  message: string
  processed: number
  total: number
}

export const CalendarEventsSection: React.FC<CalendarEventsSectionProps> = ({ onMessage, onError }) => {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set())
  const [eventEdit, setEventEdit] = useState<Partial<CalendarEvent> & { id?: string }>({})
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [showZipFilterModal, setShowZipFilterModal] = useState(false)
  const [eventsToFilter, setEventsToFilter] = useState<ZipFilterModalState>({ toDelete: [], toKeep: [] })
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [csvImportState, setCsvImportState] = useState<CSVImportState>({
    status: 'idle',
    message: '',
    processed: 0,
    total: 0
  })
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Delete modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  
  // PERFORMANCE OPTIMIZATION: Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'upcoming' | 'past' | 'this-month'>('all')
  const [showCount, setShowCount] = useState(30) // Show 30 events initially
  const [isEventsListExpanded, setIsEventsListExpanded] = useState(true) // Start expanded for easy access

  useEffect(() => {
    loadCalendarEvents()
  }, [])

  const loadCalendarEvents = async () => {
    setLoading(true)
    try {
      const { fetchCalendarEvents } = await import('../../../pages/Calendar')
      const events = await fetchCalendarEvents()
      setCalendarEvents(events || [])
    } catch (err: any) {
      onError(err?.message || 'Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  // PERFORMANCE OPTIMIZATION: Get unique categories and sources for filters
  const { categories, sources } = useMemo(() => {
    const uniqueCategories = new Set(calendarEvents.map(e => e.category || 'Community'))
    const uniqueSources = new Set(calendarEvents.map(e => e.source || 'Local'))
    return {
      categories: Array.from(uniqueCategories).sort(),
      sources: Array.from(uniqueSources).sort()
    }
  }, [calendarEvents])

  // PERFORMANCE OPTIMIZATION: Memoized filtered and searched events
  const filteredEvents = useMemo(() => {
    let filtered = calendarEvents

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.address?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => (e.category || 'Community') === categoryFilter)
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(e => (e.source || 'Local') === sourceFilter)
    }

    // Date range filter
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    if (dateRangeFilter === 'upcoming') {
      filtered = filtered.filter(e => new Date(e.date) >= now)
    } else if (dateRangeFilter === 'past') {
      filtered = filtered.filter(e => new Date(e.date) < now)
    } else if (dateRangeFilter === 'this-month') {
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.date)
        return eventDate >= startOfMonth && eventDate <= endOfMonth
      })
    }

    // Sort by date (upcoming first)
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [calendarEvents, searchQuery, categoryFilter, sourceFilter, dateRangeFilter])

  // PERFORMANCE OPTIMIZATION: Displayed events (limited by showCount)
  const displayedEvents = filteredEvents.slice(0, showCount)

  const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    onMessage(null)
    onError(null)
    try {
      // Convert date to ISO string if it isn't already
      const isoDate = typeof eventData.date === 'string' && eventData.date.includes('T')
        ? eventData.date
        : new Date(eventData.date).toISOString()

      const { error } = await supabase
        .from('calendar_events')
        .insert([{ ...eventData, date: isoDate }])
        .select()
        .single()

      if (error) {
        onError(`Failed to add event: ${error.message}`)
        return
      }

      onMessage('Event added successfully!')
      await loadCalendarEvents()
    } catch (err: any) {
      onError(err?.message || 'Failed to add event')
    }
  }

  const deleteCalendarEvent = async (eventId: string) => {
    setDeletingEventId(eventId)
    setShowDeleteModal(true)
  }

  const confirmDeleteEvent = async () => {
    if (!deletingEventId) return

    onMessage(null)
    onError(null)
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', deletingEventId)

      if (error) {
        onError(`Failed to delete event: ${error.message}`)
        setShowDeleteModal(false)
        setDeletingEventId(null)
        return
      }

      onMessage('Event deleted successfully!')
      await loadCalendarEvents()
      setShowDeleteModal(false)
      setDeletingEventId(null)
    } catch (err: any) {
      onError(err?.message || 'Failed to delete event')
      setShowDeleteModal(false)
      setDeletingEventId(null)
    }
  }

  const startEditingEvent = (event: CalendarEvent) => {
    setEventEdit({
      id: event.id,
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '',
      location: event.location || '',
      address: event.address || '',
      category: event.category || 'Community'
    })
  }

  const cancelEditingEvent = () => {
    setEventEdit({})
  }

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

  const extractZipCode = (locationString: string | null | undefined): string | null => {
    if (!locationString) return null
    
    // Match 5-digit zip codes
    const zipMatch = locationString.match(/\b\d{5}\b/)
    if (zipMatch) {
      return zipMatch[0]
    }
    
    return null
  }

  const openZipFilterModal = () => {
    // Define allowed zip codes (Bonita/Chula Vista area, ~20 minute radius)
    const allowedZips = new Set([
      '91902', // Bonita
      '91910', '91911', '91913', '91914', '91915', // Chula Vista
      '91932', // Imperial Beach
      '92154', // San Ysidro
      '91950', // National City
      '92173'  // San Diego (south)
    ])

    const toDelete: CalendarEvent[] = []
    const toKeep: CalendarEvent[] = []

    calendarEvents.forEach(event => {
      // Try multiple fields for zip code
      const zipFromLocation = extractZipCode(event.location)
      const zipFromAddress = extractZipCode(event.address)
      const zip = zipFromLocation || zipFromAddress

      if (!zip || !allowedZips.has(zip)) {
        toDelete.push(event)
      } else {
        toKeep.push(event)
      }
    })

    setEventsToFilter({ toDelete, toKeep })
    setSelectedEventIds(new Set(toDelete.map(e => e.id)))
    setShowZipFilterModal(true)
  }

  const executeZipFilterDeletion = async () => {
    if (selectedEventIds.size === 0) {
      onError('No events selected for deletion')
      return
    }

    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = async () => {
    onMessage(null)
    onError(null)

    try {
      // Delete events in batch
      const idsToDelete = Array.from(selectedEventIds)
      
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', idsToDelete)

      if (error) {
        onError(`Failed to delete events: ${error.message}`)
        setShowBulkDeleteModal(false)
        return
      }

      onMessage(`Successfully deleted ${idsToDelete.length} events!`)
      setShowBulkDeleteModal(false)
      setShowZipFilterModal(false)
      setSelectedEventIds(new Set())
      await loadCalendarEvents()
    } catch (err: any) {
      onError(err?.message || 'Failed to delete events')
      setShowBulkDeleteModal(false)
    }
  }

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

  const toggleAllEventSelection = () => {
    if (selectedEventIds.size === eventsToFilter.toDelete.length) {
      setSelectedEventIds(new Set())
    } else {
      setSelectedEventIds(new Set(eventsToFilter.toDelete.map(e => e.id)))
    }
  }

  const saveCalendarEvent = async () => {
    if (!eventEdit.id || !eventEdit.title) {
      onError('Missing required fields')
      return
    }

    onMessage(null)
    onError(null)

    try {
      // Convert date to ISO string if it isn't already
      let isoDate = eventEdit.date
      if (isoDate) {
        isoDate = typeof isoDate === 'string' && isoDate.includes('T')
          ? isoDate
          : new Date(isoDate).toISOString()
      }

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: eventEdit.title,
          description: eventEdit.description || '',
          date: isoDate,
          time: eventEdit.time || '',
          location: eventEdit.location || '',
          address: eventEdit.address || '',
          category: eventEdit.category || 'Community'
        })
        .eq('id', eventEdit.id)

      if (error) {
        onError(`Failed to update event: ${error.message}`)
        return
      }

      onMessage('Event updated successfully!')
      setEventEdit({})
      await loadCalendarEvents()
    } catch (err: any) {
      onError(err?.message || 'Failed to update event')
    }
  }

  const addMultipleEvents = async (events: Omit<CalendarEvent, 'id' | 'created_at'>[]) => {
    onMessage(null)
    onError(null)

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert(events)
        .select()

      if (error) {
        onError(`Failed to import events: ${error.message}`)
        return
      }

      onMessage(`Successfully imported ${events.length} events!`)
      await loadCalendarEvents()
    } catch (err: any) {
      onError(err?.message || 'Failed to import events')
    }
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const handleCsvUpload = async (file: File) => {
    setUploadingCsv(true)
    setCsvImportState({ status: 'processing', message: 'Reading CSV file...', processed: 0, total: 0 })
    onMessage(null)
    onError(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setCsvImportState({ status: 'error', message: 'CSV file is empty or invalid', processed: 0, total: 0 })
        setUploadingCsv(false)
        return
      }

      const cleanField = (field: string) => field?.trim().replace(/^["'\s]+|["'\s]+$/g, '') || ''

      const eventsToImport: Omit<CalendarEvent, 'id' | 'created_at'>[] = []

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i])
        
        if (fields.length < 3) {
          console.warn(`Skipping line ${i + 1}: insufficient fields`)
          continue
        }

        const title = cleanField(fields[0])
        const dateStr = cleanField(fields[1])
        const timeStr = cleanField(fields[2])
        const location = cleanField(fields[3])
        const address = cleanField(fields[4])
        const category = cleanField(fields[5]) || 'Community'
        const description = cleanField(fields[6]) || ''

        if (!title || !dateStr) {
          console.warn(`Skipping line ${i + 1}: missing title or date`)
          continue
        }

        // Parse date
        let eventDate: Date
        if (dateStr.includes('/')) {
          const [month, day, year] = dateStr.split('/')
          eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        } else if (dateStr.includes('-')) {
          eventDate = new Date(dateStr)
        } else {
          console.warn(`Skipping line ${i + 1}: invalid date format`)
          continue
        }

        // Combine date and time
        if (timeStr) {
          const [hours, minutes] = timeStr.split(':')
          eventDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0)
        } else {
          eventDate.setHours(12, 0, 0, 0)
        }

        eventsToImport.push({
          title,
          description,
          date: eventDate.toISOString(),
          time: timeStr || '12:00',
          location,
          address,
          category,
          source: 'CSV Import',
          upvotes: 0,
          downvotes: 0
        })

        setCsvImportState({
          status: 'processing',
          message: `Processing events... (${i}/${lines.length - 1})`,
          processed: i,
          total: lines.length - 1
        })
      }

      if (eventsToImport.length === 0) {
        setCsvImportState({ status: 'error', message: 'No valid events found in CSV', processed: 0, total: 0 })
        setUploadingCsv(false)
        return
      }

      // Import events
      setCsvImportState({
        status: 'processing',
        message: `Importing ${eventsToImport.length} events to database...`,
        processed: eventsToImport.length,
        total: eventsToImport.length
      })

      await addMultipleEvents(eventsToImport)

      setCsvImportState({
        status: 'success',
        message: `Successfully imported ${eventsToImport.length} events!`,
        processed: eventsToImport.length,
        total: eventsToImport.length
      })

      setTimeout(() => {
        setCsvImportState({ status: 'idle', message: '', processed: 0, total: 0 })
      }, 3000)
    } catch (err: any) {
      setCsvImportState({ status: 'error', message: err?.message || 'Failed to process CSV', processed: 0, total: 0 })
    } finally {
      setUploadingCsv(false)
    }
  }

  const addSampleBonitaEvents = async () => {
    const sampleEvents: Omit<CalendarEvent, 'id' | 'created_at'>[] = [
      {
        title: 'Bonita Farmers Market',
        description: 'Fresh local produce, artisan goods, and community gathering every Saturday morning.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: '09:00',
        location: 'Bonita Plaza',
        address: '3330 Plaza Bonita Rd, Bonita, CA 91902',
        category: 'Community',
        source: 'Local',
        upvotes: 0,
        downvotes: 0
      },
      {
        title: 'Rohr Park Summer Concert',
        description: 'Free outdoor concert featuring local bands and food trucks.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        time: '18:00',
        location: 'Rohr Park',
        address: '4548 Bonita Rd, Bonita, CA 91902',
        category: 'Music',
        source: 'Local',
        upvotes: 0,
        downvotes: 0
      },
      {
        title: 'Bonita Library Book Club',
        description: 'Monthly book discussion group. All readers welcome!',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        time: '14:00',
        location: 'Bonita Library',
        address: '4375 Bonita Rd, Bonita, CA 91902',
        category: 'Arts & Culture',
        source: 'Local',
        upvotes: 0,
        downvotes: 0
      }
    ]

    await addMultipleEvents(sampleEvents)
  }

  const refreshICalFeedsServer = async () => {
    onMessage('Refreshing all iCal feeds via server...')
    onError(null)

    try {
      const response = await fetch('/.netlify/functions/refresh-ical-feeds', {
        method: 'POST'
      })

      if (!response.ok) {
        const text = await response.text()
        onError(`Server error: ${text}`)
        return
      }

      const result = await response.json()
      onMessage(`Successfully refreshed ${result.totalImported} events from iCal feeds!`)
      await loadCalendarEvents()
    } catch (err: any) {
      onError(`Failed to refresh iCal feeds: ${err.message}`)
    }
  }

  const refreshVosdEvents = async () => {
    onMessage('Refreshing Village of San Diego events...')
    onError(null)

    try {
      const response = await fetch('/.netlify/functions/refresh-vosd-events', {
        method: 'POST'
      })

      if (!response.ok) {
        const text = await response.text()
        onError(`Server error: ${text}`)
        return
      }

      const result = await response.json()
      onMessage(`Successfully imported ${result.imported} VOSD events!`)
      await loadCalendarEvents()
    } catch (err: any) {
      onError(`Failed to refresh VOSD events: ${err.message}`)
    }
  }

  const refreshKpbsEvents = async () => {
    onMessage('Refreshing KPBS events...')
    onError(null)

    try {
      const response = await fetch('/.netlify/functions/refresh-kpbs-events', {
        method: 'POST'
      })

      if (!response.ok) {
        const text = await response.text()
        onError(`Server error: ${text}`)
        return
      }

      const result = await response.json()
      onMessage(`Successfully imported ${result.imported} KPBS events!`)
      await loadCalendarEvents()
    } catch (err: any) {
      onError(`Failed to refresh KPBS events: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-neutral-100 rounded"></div>
          <div className="h-16 bg-neutral-100 rounded"></div>
          <div className="h-16 bg-neutral-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
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
                          className="w-5 h-5 text-red-600 rounded border-neutral-300 focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-900">{event.title}</div>
                        <div className="text-sm text-neutral-600 mt-1">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {event.time && ` at ${event.time}`}
                        </div>
                        {event.location && (
                          <div className="text-sm text-neutral-600 mt-1">
                            📍 {event.location}
                          </div>
                        )}
                        {event.address && (
                          <div className="text-sm text-neutral-600">
                            {event.address}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                            {event.category || 'Community'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                            {event.source || 'Unknown Source'}
                          </span>
                          {extractZipCode(event.location) || extractZipCode(event.address) ? (
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                              Zip: {extractZipCode(event.location) || extractZipCode(event.address)}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                              No Zip Code
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {eventsToFilter.toDelete.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  No events need to be filtered. All events have valid zip codes!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="text-sm text-neutral-600">
                {selectedEventIds.size} of {eventsToFilter.toDelete.length} events selected for deletion
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowZipFilterModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeZipFilterDeletion}
                  disabled={selectedEventIds.size === 0}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    selectedEventIds.size === 0
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Delete {selectedEventIds.size} Selected Events
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Status */}
      {csvImportState.status !== 'idle' && (
        <div className={`mt-4 p-4 rounded-lg border ${
          csvImportState.status === 'success' ? 'bg-green-50 border-green-200' :
          csvImportState.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            {csvImportState.status === 'processing' && (
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {csvImportState.status === 'success' && (
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {csvImportState.status === 'error' && (
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                csvImportState.status === 'success' ? 'text-green-800' :
                csvImportState.status === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {csvImportState.message}
              </div>
              {csvImportState.status === 'processing' && csvImportState.total > 0 && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(csvImportState.processed / csvImportState.total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setShowAddEventForm(!showAddEventForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          {showAddEventForm ? 'Cancel' : '+ Add Single Event'}
        </button>

        <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium text-center cursor-pointer">
          📄 Upload CSV (Bulk Import)
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleCsvUpload(e.target.files[0])
              }
            }}
            className="hidden"
            disabled={uploadingCsv}
          />
        </label>

        <button
          onClick={addSampleBonitaEvents}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
        >
          Add Sample Bonita Events
        </button>

        <button
          onClick={refreshICalFeedsServer}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          🔄 Refresh All iCal Feeds
        </button>

        <button
          onClick={refreshVosdEvents}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          🔄 Refresh VOSD Events
        </button>

        <button
          onClick={refreshKpbsEvents}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium"
        >
          🔄 Refresh KPBS Events
        </button>
      </div>
      
      <div className="text-xs text-neutral-500">
        <strong>Bulk Import:</strong> Use CSV format: Title,Date,Time,Location,Address,Category,Description<br/>
        <strong>Sample:</strong> Farmers Market,2024-01-15,09:00,Bonita Park,3215 Bonita Rd,Community,Weekly market<br/>
        <strong>iCal Feeds:</strong> Automatically imports events from City of San Diego, Libraries, UC San Diego, Zoo, and Balboa Park
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
                  placeholder="Bonita Plaza"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Address (with zip code)
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="3330 Plaza Bonita Rd, Bonita, CA 91902"
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  <option value="Community">Community</option>
                  <option value="Arts & Culture">Arts & Culture</option>
                  <option value="Music">Music</option>
                  <option value="Sports & Recreation">Sports & Recreation</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Education">Education</option>
                  <option value="Family">Family</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Brief description of the event..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Add Event
              </button>
              <button
                type="button"
                onClick={() => setShowAddEventForm(false)}
                className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PERFORMANCE OPTIMIZATION: Search and Filter Controls */}
      <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700">Event Search & Filters</h3>
          {(searchQuery || categoryFilter !== 'all' || sourceFilter !== 'all' || dateRangeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setSourceFilter('all')
                setDateRangeFilter('all')
                setShowCount(30)
              }}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Search Events</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowCount(30)
              }}
              placeholder="Search by title, description, location, or address..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setShowCount(30)
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                setShowCount(30)
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Date Range</label>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as any)
                setShowCount(30)
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming Events</option>
              <option value="this-month">This Month</option>
              <option value="past">Past Events</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-xs text-neutral-600 bg-neutral-50 px-4 py-2 rounded-lg">
          <div>
            Showing <span className="font-medium">{displayedEvents.length}</span> of <span className="font-medium">{filteredEvents.length}</span> events
            {filteredEvents.length !== calendarEvents.length && (
              <span className="ml-1">
                (<span className="font-medium">{calendarEvents.length}</span> total)
              </span>
            )}
          </div>
          {filteredEvents.length > 0 && (
            <button
              onClick={() => setIsEventsListExpanded(!isEventsListExpanded)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isEventsListExpanded ? 'Collapse List' : 'Expand List'}
            </button>
          )}
        </div>
      </div>

      {/* Events List - Collapsible */}
      {isEventsListExpanded && (
        <div className="mt-4 space-y-3">
          {filteredEvents.length === 0 && (
            <div className="text-neutral-500 text-sm text-center py-8 bg-neutral-50 rounded-lg">
              {calendarEvents.length === 0 ? (
                <>
                  <svg className="mx-auto h-12 w-12 text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-medium">No events yet</p>
                  <p className="text-xs mt-1">Add events manually or import from CSV/iCal feeds</p>
                </>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="font-medium">No events found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          )}

          {displayedEvents.map((event) => {
          const isExpanded = expandedEventIds.has(event.id)
          const isEditing = eventEdit.id === event.id

          return (
            <div key={event.id} className="border border-neutral-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={eventEdit.title || ''}
                    onChange={(e) => setEventEdit({ ...eventEdit, title: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Event Title"
                  />
                  <textarea
                    value={eventEdit.description || ''}
                    onChange={(e) => setEventEdit({ ...eventEdit, description: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    rows={3}
                    placeholder="Description"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={eventEdit.date ? new Date(eventEdit.date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEventEdit({ ...eventEdit, date: e.target.value })}
                      className="px-3 py-2 border border-neutral-300 rounded-lg"
                    />
                    <input
                      type="time"
                      value={eventEdit.time || ''}
                      onChange={(e) => setEventEdit({ ...eventEdit, time: e.target.value })}
                      className="px-3 py-2 border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={eventEdit.location || ''}
                    onChange={(e) => setEventEdit({ ...eventEdit, location: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Location"
                  />
                  <input
                    type="text"
                    value={eventEdit.address || ''}
                    onChange={(e) => setEventEdit({ ...eventEdit, address: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Address"
                  />
                  <select
                    value={eventEdit.category || 'Community'}
                    onChange={(e) => setEventEdit({ ...eventEdit, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Community">Community</option>
                    <option value="Arts & Culture">Arts & Culture</option>
                    <option value="Music">Music</option>
                    <option value="Sports & Recreation">Sports & Recreation</option>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Education">Education</option>
                    <option value="Family">Family</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCalendarEvent}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditingEvent}
                      className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">{event.title}</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        {event.time && ` at ${event.time}`}
                      </div>
                      {event.location && (
                        <div className="text-sm text-neutral-600 mt-1">
                          📍 {event.location}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                          {event.category || 'Community'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                          {event.source || 'Local'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleEventExpansion(event.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                      <button
                        onClick={() => startEditingEvent(event)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCalendarEvent(event.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2 text-sm">
                      {event.description && (
                        <div>
                          <strong>Description:</strong> {event.description}
                        </div>
                      )}
                      {event.address && (
                        <div>
                          <strong>Address:</strong> {event.address}
                        </div>
                      )}
                      <div>
                        <strong>ID:</strong> <span className="font-mono text-xs">{event.id}</span>
                      </div>
                      <div>
                        <strong>Votes:</strong> 👍 {event.upvotes || 0} | 👎 {event.downvotes || 0}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

          {/* PERFORMANCE OPTIMIZATION: Pagination Controls */}
          {displayedEvents.length < filteredEvents.length && (
            <div className="text-center py-6 space-y-3">
              <div className="text-sm text-neutral-600">
                Showing {displayedEvents.length} of {filteredEvents.length} events
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCount(prev => prev + 30)}
                  className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Show 30 More
                </button>
                {filteredEvents.length > 50 && (
                  <button
                    onClick={() => setShowCount(filteredEvents.length)}
                    className="px-6 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    Show All {filteredEvents.length}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success message when all events are shown */}
          {displayedEvents.length > 0 && displayedEvents.length === filteredEvents.length && filteredEvents.length > 30 && (
            <div className="text-center py-4 text-sm text-green-600 bg-green-50 rounded-lg">
              ✓ All {filteredEvents.length} events loaded
            </div>
          )}
        </div>
      )}

      {/* Delete Single Event Modal */}
      {showDeleteModal && deletingEventId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Event</h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteEvent}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingEventId(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Events Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Multiple Events</h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedEventIds.size} events</span>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmBulkDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete {selectedEventIds.size} Events
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

