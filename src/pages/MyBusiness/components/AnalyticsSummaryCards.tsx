/**
 * ANALYTICS SUMMARY CARDS
 * 
 * Displays key metrics in card format:
 * - Total Views
 * - Total Clicks (phone + website)
 * - Total Saves
 * - Total Conversions (funnel + booking)
 * - Conversion Rate
 */

import type { ProviderAnalyticsSummary } from '../../../types/analytics'

interface AnalyticsSummaryCardsProps {
  summary: ProviderAnalyticsSummary
}

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  const totalClicks = summary.total_phone_clicks + summary.total_website_clicks
  const totalConversions = summary.total_funnel_responses + summary.total_bookings

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Total Views */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-600 text-sm font-medium">Total Views</span>
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-neutral-900">{summary.total_views.toLocaleString()}</div>
        <p className="text-xs text-neutral-500 mt-1">Unique listing views</p>
      </div>

      {/* Total Clicks */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-600 text-sm font-medium">Total Clicks</span>
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-neutral-900">{totalClicks.toLocaleString()}</div>
        <div className="flex gap-2 text-xs text-neutral-500 mt-1">
          <span>📞 {summary.total_phone_clicks}</span>
          <span>•</span>
          <span>🌐 {summary.total_website_clicks}</span>
        </div>
      </div>

      {/* Total Saves */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-600 text-sm font-medium">Total Saves</span>
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-neutral-900">{summary.total_saves.toLocaleString()}</div>
        <p className="text-xs text-neutral-500 mt-1">Users saved your listing</p>
      </div>

      {/* Total Conversions */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-600 text-sm font-medium">Conversions</span>
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-neutral-900">{totalConversions.toLocaleString()}</div>
        <div className="flex gap-2 text-xs text-neutral-500 mt-1">
          <span>📝 {summary.total_funnel_responses} leads</span>
          {summary.total_bookings > 0 && (
            <>
              <span>•</span>
              <span>📅 {summary.total_bookings} bookings</span>
            </>
          )}
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-700 border border-neutral-800 rounded-lg p-6 shadow-sm text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/90 text-sm font-medium">Conversion Rate</span>
          <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="text-3xl font-bold">{summary.conversion_rate.toFixed(2)}%</div>
        <p className="text-xs text-white/70 mt-1">
          {summary.total_views > 0 ? `${totalConversions} of ${summary.total_views} views` : 'No views yet'}
        </p>
      </div>
    </div>
  )
}

