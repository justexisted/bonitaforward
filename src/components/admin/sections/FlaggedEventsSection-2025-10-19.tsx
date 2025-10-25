import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { type CalendarEvent } from '../../../pages/Calendar'

interface FlaggedEventsSectionProps {
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
}

type FlaggedEvent = {
  id: string
  event_id: string
  user_id: string
  reason: string
  details: string | null
  created_at: string
  event?: CalendarEvent
  reporter_email?: string
}

export const FlaggedEventsSection: React.FC<FlaggedEventsSectionProps> = ({ onMessage, onError }) => {
  const [flaggedEvents, setFlaggedEvents] = useState<FlaggedEvent[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showDismissModal, setShowDismissModal] = useState(false)
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingFlag, setDeletingFlag] = useState<FlaggedEvent | null>(null)

  useEffect(() => {
    loadFlaggedEvents()
  }, [])

  const loadFlaggedEvents = async () => {
    setLoading(true)
    try {
      const { data: flags, error: flagsError } = await supabase
        .from('event_flags')
        .select('*, calendar_events(*), profiles(email)')
        .order('created_at', { ascending: false })

      if (flagsError) {
        onError(`Failed to load flagged events: ${flagsError.message}`)
        setFlaggedEvents([])
      } else {
        const processedFlags = (flags || []).map((f: any) => ({
          id: f.id,
          event_id: f.event_id,
          user_id: f.user_id,
          reason: f.reason,
          details: f.details,
          created_at: f.created_at,
          event: f.calendar_events || undefined,
          reporter_email: f.profiles?.email || 'Unknown'
        }))
        setFlaggedEvents(processedFlags)
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to load flagged events')
    } finally {
      setLoading(false)
    }
  }

  const dismissFlag = async (flagId: string) => {
    setDismissingFlagId(flagId)
    setShowDismissModal(true)
  }

  const confirmDismissFlag = async () => {
    if (!dismissingFlagId) return

    onMessage(null)
    onError(null)

    try {
      const { error } = await supabase
        .from('event_flags')
        .delete()
        .eq('id', dismissingFlagId)
      
      if (error) {
        onError(`Failed to dismiss flag: ${error.message}`)
        setShowDismissModal(false)
        setDismissingFlagId(null)
        return
      }
      
      // Refresh flagged events
      setFlaggedEvents(prev => prev.filter(f => f.id !== dismissingFlagId))
      onMessage('Flag dismissed successfully')
      setShowDismissModal(false)
      setDismissingFlagId(null)
    } catch (error: any) {
      onError(`Failed to dismiss flag: ${error.message}`)
      setShowDismissModal(false)
      setDismissingFlagId(null)
    }
  }

  const deleteEventAndFlags = async (flag: FlaggedEvent) => {
    setDeletingFlag(flag)
    setShowDeleteModal(true)
  }

  const confirmDeleteEvent = async () => {
    if (!deletingFlag) return

    onMessage(null)
    onError(null)

    try {
      // Delete the event
      const { error: eventError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', deletingFlag.event_id)
      
      if (eventError) {
        onError(`Failed to delete event: ${eventError.message}`)
        setShowDeleteModal(false)
        setDeletingFlag(null)
        return
      }

      // Delete all flags for this event
      const { error: flagError } = await supabase
        .from('event_flags')
        .delete()
        .eq('event_id', deletingFlag.event_id)
      
      if (flagError) {
        console.warn('Error deleting flags:', flagError)
      }
      
      // Refresh flagged events
      setFlaggedEvents(prev => prev.filter(f => f.event_id !== deletingFlag.event_id))
      
      onMessage('Event deleted successfully')
      setShowDeleteModal(false)
      setDeletingFlag(null)
    } catch (error: any) {
      onError(`Failed to delete event: ${error.message}`)
      setShowDeleteModal(false)
      setDeletingFlag(null)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-32 bg-neutral-100 rounded"></div>
          <div className="h-32 bg-neutral-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
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
                    onClick={() => dismissFlag(flag.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ✓ Dismiss Flag
                  </button>
                  {flag.event && (
                    <button
                      onClick={() => deleteEventAndFlags(flag)}
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

      {/* Dismiss Flag Modal */}
      {showDismissModal && dismissingFlagId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Dismiss Flag</h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to dismiss this flag? The event will remain on the calendar.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDismissFlag}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dismiss Flag
              </button>
              <button
                onClick={() => {
                  setShowDismissModal(false)
                  setDismissingFlagId(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {showDeleteModal && deletingFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Event</h3>
            
            <p className="text-sm text-neutral-600 mb-2">
              Are you sure you want to delete this event?
            </p>
            <div className="bg-neutral-50 p-3 rounded-lg mb-4 text-sm">
              <p className="font-medium">{deletingFlag.event?.title || 'Unknown Event'}</p>
              {deletingFlag.event?.description && (
                <p className="text-neutral-600 mt-1">{deletingFlag.event.description}</p>
              )}
            </div>
            <p className="text-sm text-neutral-600 mb-6">This action cannot be undone. All flags for this event will also be deleted.</p>
            
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
                  setDeletingFlag(null)
                }}
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

