/**
 * ANALYTICS BOOKING CONVERSIONS
 * 
 * Displays bookings that were attributed to this listing
 * Shows which bookings came from users who viewed this listing
 */

import type { BookingAttribution } from '../../../types/analytics'

interface AnalyticsBookingConversionsProps {
  attributions: BookingAttribution[]
  providerName: string
}

export function AnalyticsBookingConversions({ attributions, providerName }: AnalyticsBookingConversionsProps) {
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

  const getSourceLabel = (source: BookingAttribution['source']) => {
    switch (source) {
      case 'listing_view': return 'Listing View'
      case 'search': return 'Search Results'
      case 'direct': return 'Direct'
      case 'calendar': return 'Calendar Page'
    }
  }

  const getSourceColor = (source: BookingAttribution['source']) => {
    switch (source) {
      case 'listing_view': return 'bg-green-50 text-green-700'
      case 'search': return 'bg-blue-50 text-blue-700'
      case 'direct': return 'bg-neutral-100 text-neutral-600'
      case 'calendar': return 'bg-purple-50 text-purple-700'
    }
  }

  if (attributions.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Booking Conversions</h3>
            <p className="text-sm text-neutral-600">
              {attributions.length} booking{attributions.length !== 1 && 's'} attributed to {providerName}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Booking Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Session ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {attributions.map((attribution) => (
              <tr key={attribution.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                  {formatDate(attribution.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSourceColor(attribution.source)}`}>
                    {getSourceLabel(attribution.source)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-500">
                  {attribution.session_id?.substring(0, 20)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source Breakdown */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['listing_view', 'search', 'direct', 'calendar'] as const).map(source => {
            const count = attributions.filter(a => a.source === source).length
            if (count === 0) return null
            return (
              <div key={source} className="text-center">
                <div className="text-2xl font-bold text-neutral-900">{count}</div>
                <div className="text-xs text-neutral-600 mt-1">{getSourceLabel(source)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-white border-t border-neutral-200">
        <p className="text-xs text-neutral-600">
          <strong>Booking sources:</strong> "Listing View" = booked from your listing page • "Search" = booked from search results • 
          "Direct" = direct booking link • "Calendar" = booked from calendar events page
        </p>
      </div>
    </div>
  )
}

