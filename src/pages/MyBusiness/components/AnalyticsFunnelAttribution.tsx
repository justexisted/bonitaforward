/**
 * ANALYTICS FUNNEL ATTRIBUTION
 * 
 * Displays funnel responses that were attributed to this listing
 * Shows which leads came from users who viewed this listing
 */

import type { FunnelAttribution } from '../../../types/analytics'

interface AnalyticsFunnelAttributionProps {
  attributions: FunnelAttribution[]
  providerName: string
}

export function AnalyticsFunnelAttribution({ attributions, providerName }: AnalyticsFunnelAttributionProps) {
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

  if (attributions.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Funnel Lead Attribution</h3>
            <p className="text-sm text-neutral-600">
              {attributions.length} lead{attributions.length !== 1 && 's'} attributed to {providerName}
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
                Date Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Session ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Referrer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Attribution Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {attributions.map((attribution) => (
              <tr key={attribution.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                  {formatDate(attribution.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-500">
                  {attribution.session_id?.substring(0, 20)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {attribution.referrer_url ? (
                    <span className="text-blue-600">{new URL(attribution.referrer_url).hostname}</span>
                  ) : (
                    <span className="text-neutral-400">Direct</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {attribution.provider_id ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Listing View
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                      Direct
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200">
        <p className="text-xs text-neutral-600">
          <strong>How attribution works:</strong> When a user views your listing and submits a funnel form within 30 minutes, 
          the lead is attributed to your listing. This helps you understand which listings are driving the most interest.
        </p>
      </div>
    </div>
  )
}

