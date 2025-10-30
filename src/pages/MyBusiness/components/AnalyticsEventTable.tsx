/**
 * ANALYTICS EVENT TABLE
 * 
 * Displays a table of all listing analytics events with:
 * - Event type (view, phone_click, website_click, save)
 * - Timestamp
 * - User info (if available)
 * - Session data
 * - Filtering by event type
 */

import { useState } from 'react'
import type { ListingAnalytics } from '../../../types/analytics'

interface AnalyticsEventTableProps {
  events: ListingAnalytics[]
}

type EventFilter = 'all' | 'view' | 'phone_click' | 'website_click' | 'save'

export function AnalyticsEventTable({ events }: AnalyticsEventTableProps) {
  const [filter, setFilter] = useState<EventFilter>('all')

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.event_type === filter)

  const eventTypeCounts = {
    all: events.length,
    view: events.filter(e => e.event_type === 'view').length,
    phone_click: events.filter(e => e.event_type === 'phone_click').length,
    website_click: events.filter(e => e.event_type === 'website_click').length,
    save: events.filter(e => e.event_type === 'save').length,
  }

  const getEventIcon = (type: ListingAnalytics['event_type']) => {
    switch (type) {
      case 'view':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )
      case 'phone_click':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.964 5.964l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )
      case 'website_click':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )
      case 'save':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
    }
  }

  const getEventLabel = (type: ListingAnalytics['event_type']) => {
    switch (type) {
      case 'view': return 'View'
      case 'phone_click': return 'Phone Click'
      case 'website_click': return 'Website Click'
      case 'save': return 'Save'
    }
  }

  const getEventColor = (type: ListingAnalytics['event_type']) => {
    switch (type) {
      case 'view': return 'text-blue-600 bg-blue-50'
      case 'phone_click': return 'text-green-600 bg-green-50'
      case 'website_click': return 'text-purple-600 bg-purple-50'
      case 'save': return 'text-yellow-600 bg-yellow-50'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  if (events.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-neutral-600 font-medium">No events recorded yet</p>
        <p className="text-sm text-neutral-500 mt-1">Events will appear here as users interact with your listing</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Event History</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            All ({eventTypeCounts.all})
          </button>
          <button
            onClick={() => setFilter('view')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'view'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            Views ({eventTypeCounts.view})
          </button>
          <button
            onClick={() => setFilter('phone_click')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'phone_click'
                ? 'bg-green-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            Phone Clicks ({eventTypeCounts.phone_click})
          </button>
          <button
            onClick={() => setFilter('website_click')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'website_click'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            Website Clicks ({eventTypeCounts.website_click})
          </button>
          <button
            onClick={() => setFilter('save')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'save'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            Saves ({eventTypeCounts.save})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredEvents.slice(0, 100).map((event) => (
              <tr key={event.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getEventColor(event.event_type)}`}>
                    {getEventIcon(event.event_type)}
                    <span className="text-sm font-medium">{getEventLabel(event.event_type)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                  {formatDate(event.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                  {event.user_id ? (
                    <span className="text-green-600">Logged In</span>
                  ) : (
                    <span className="text-neutral-400">Anonymous</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {event.referrer || event.metadata?.search_source || 'Direct'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filteredEvents.length > 100 && (
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 text-sm text-neutral-600 text-center">
          Showing first 100 of {filteredEvents.length} events
        </div>
      )}
    </div>
  )
}

