/**
 * ANALYTICS TAB - Business Performance Dashboard
 * 
 * Displays comprehensive analytics for business listings including:
 * - Summary metrics (views, clicks, saves, conversions)
 * - Event breakdown table
 * - Funnel attribution
 * - Booking conversions
 * - Date range filtering
 * - Export functionality
 */

import { useState, useEffect } from 'react'
import type { BusinessListing } from '../types'
import { 
  getProviderAnalyticsSummary, 
  getProviderAnalytics,
  getFunnelResponsesFromProvider,
  getBookingsFromProvider
} from '../../../services/analyticsService'
import type { 
  ProviderAnalyticsSummary, 
  ListingAnalytics,
  FunnelAttribution,
  BookingAttribution
} from '../../../types/analytics'
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards'
import { AnalyticsEventTable } from './AnalyticsEventTable'
import { AnalyticsFunnelAttribution } from './AnalyticsFunnelAttribution'
import { AnalyticsBookingConversions } from './AnalyticsBookingConversions'

interface AnalyticsTabProps {
  listings: BusinessListing[]
}

export type DateRange = '7d' | '30d' | 'all' | 'custom'

export function AnalyticsTab({ listings }: AnalyticsTabProps) {
  const [selectedListing, setSelectedListing] = useState<BusinessListing | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Analytics data
  const [summary, setSummary] = useState<ProviderAnalyticsSummary | null>(null)
  const [events, setEvents] = useState<ListingAnalytics[]>([])
  const [funnelAttributions, setFunnelAttributions] = useState<FunnelAttribution[]>([])
  const [bookingAttributions, setBookingAttributions] = useState<BookingAttribution[]>([])

  // Auto-select first listing
  useEffect(() => {
    if (listings.length > 0 && !selectedListing) {
      setSelectedListing(listings[0])
    }
  }, [listings, selectedListing])

  // Calculate date range
  const getDateRangeValues = (): { start?: Date; end?: Date } => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    
    switch (dateRange) {
      case '7d':
        const start7 = new Date(now)
        start7.setDate(start7.getDate() - 7)
        start7.setHours(0, 0, 0, 0)
        return { start: start7, end }
      case '30d':
        const start30 = new Date(now)
        start30.setDate(start30.getDate() - 30)
        start30.setHours(0, 0, 0, 0)
        return { start: start30, end }
      case 'custom':
        if (!customStart || !customEnd) return {}
        return { start: customStart, end: customEnd }
      case 'all':
      default:
        return {}
    }
  }

  // Load analytics data
  useEffect(() => {
    async function loadAnalytics() {
      if (!selectedListing) return
      
      setLoading(true)
      setError(null)
      
      try {
        const { start, end } = getDateRangeValues()
        
        // Load all analytics data in parallel
        const [summaryResult, eventsResult, funnelResult, bookingResult] = await Promise.all([
          getProviderAnalyticsSummary(selectedListing.id, start, end),
          getProviderAnalytics(selectedListing.id, start, end),
          getFunnelResponsesFromProvider(selectedListing.id),
          getBookingsFromProvider(selectedListing.id)
        ])
        
        if (summaryResult.success && summaryResult.data) {
          setSummary({ ...summaryResult.data, provider_name: selectedListing.name })
        } else {
          setError(summaryResult.error || 'Failed to load summary')
        }
        
        if (eventsResult.success && eventsResult.data) {
          setEvents(eventsResult.data)
        }
        
        if (funnelResult.success && funnelResult.data) {
          setFunnelAttributions(funnelResult.data)
        }
        
        if (bookingResult.success && bookingResult.data) {
          setBookingAttributions(bookingResult.data)
        }
      } catch (err) {
        console.error('[AnalyticsTab] Failed to load analytics:', err)
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }
    
    void loadAnalytics()
  }, [selectedListing, dateRange, customStart, customEnd])

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">You don't have any business listings yet.</p>
        <p className="text-sm text-neutral-500 mt-2">Create a listing to start tracking analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with listing selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="listing-select" className="block text-sm font-medium text-neutral-700 mb-2">
            Select Business Listing
          </label>
          <select
            id="listing-select"
            value={selectedListing?.id || ''}
            onChange={(e) => {
              const listing = listings.find(l => l.id === e.target.value)
              setSelectedListing(listing || null)
            }}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          >
            {listings.map(listing => (
              <option key={listing.id} value={listing.id}>
                {listing.name} {listing.is_member && '⭐'}
              </option>
            ))}
          </select>
        </div>

        {/* Date range picker */}
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('7d')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              dateRange === '7d' 
                ? 'bg-neutral-900 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              dateRange === '30d' 
                ? 'bg-neutral-900 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              dateRange === 'all' 
                ? 'bg-neutral-900 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Custom date range inputs (if selected) */}
      {dateRange === 'custom' && (
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
            <input
              type="date"
              value={customStart?.toISOString().split('T')[0] || ''}
              onChange={(e) => setCustomStart(e.target.value ? new Date(e.target.value) : null)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
            <input
              type="date"
              value={customEnd?.toISOString().split('T')[0] || ''}
              onChange={(e) => setCustomEnd(e.target.value ? new Date(e.target.value) : null)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="mt-2 text-neutral-600">Loading analytics...</p>
        </div>
      )}

      {/* Analytics content */}
      {!loading && selectedListing && summary && (
        <>
          {/* Summary cards */}
          <AnalyticsSummaryCards summary={summary} />

          {/* Event breakdown table */}
          <AnalyticsEventTable events={events} />

          {/* Funnel attribution */}
          {funnelAttributions.length > 0 && (
            <AnalyticsFunnelAttribution 
              attributions={funnelAttributions} 
              providerName={selectedListing.name}
            />
          )}

          {/* Booking conversions */}
          {bookingAttributions.length > 0 && (
            <AnalyticsBookingConversions 
              attributions={bookingAttributions}
              providerName={selectedListing.name}
            />
          )}

          {/* Export button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                // TODO: Implement export to CSV
                alert('Export functionality coming soon!')
              }}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Export to CSV
            </button>
          </div>
        </>
      )}

      {/* No data state */}
      {!loading && !error && summary && summary.total_views === 0 && (
        <div className="text-center py-12 bg-neutral-50 rounded-lg">
          <svg className="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-neutral-600 font-medium">No analytics data yet</p>
          <p className="text-sm text-neutral-500 mt-2">Views and interactions will appear here once users visit your listing.</p>
        </div>
      )}
    </div>
  )
}

