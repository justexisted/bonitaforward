import React from 'react'

interface BusinessApplicationRow {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  challenge: string | null
  created_at: string
  tier_requested: string | null
  status: string | null
}

interface CategoryOption {
  key: string
  name: string
}

interface BusinessApplicationsSectionProps {
  bizApps: BusinessApplicationRow[]
  appEdits: Record<string, { category: string; tagsInput: string }>
  catOptions: CategoryOption[]
  onAppEditsUpdate: (appId: string, category: string, tagsInput: string) => void
  onApproveApplication: (appId: string) => Promise<void>
  onDeleteApplication: (appId: string) => Promise<void>
}

export const BusinessApplicationsSection: React.FC<BusinessApplicationsSectionProps> = ({
  bizApps,
  appEdits,
  catOptions,
  onAppEditsUpdate,
  onApproveApplication,
  onDeleteApplication
}) => {
  return (
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
            <div 
              key={app.id} 
              className={`rounded-xl border-2 p-4 ${
                app.tier_requested === 'featured' 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-green-300 bg-white'
              }`}
            >
              {/* TIER REQUESTED - CRITICAL INFORMATION */}
              <div className="mb-3">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                  app.tier_requested === 'featured'
                    ? 'bg-yellow-200 text-yellow-900 border-2 border-yellow-400'
                    : 'bg-green-100 text-green-900 border-2 border-green-400'
                }`}>
                  {app.tier_requested === 'featured' ? '⭐ FEATURED TIER REQUESTED ($97/YEAR)' : '🆓 FREE TIER REQUESTED (NO PAYMENT)'}
                </span>
                {/* Debug: Show raw value */}
                <span className="ml-2 text-[10px] text-neutral-400 font-mono">
                  tier_requested={app.tier_requested || 'null'}
                </span>
              </div>

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
                    onChange={(e) => onAppEditsUpdate(
                      app.id,
                      e.target.value,
                      appEdits[app.id]?.tagsInput || ''
                    )}
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
                    onChange={(e) => onAppEditsUpdate(
                      app.id,
                      appEdits[app.id]?.category || 'professional-services',
                      e.target.value
                    )}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* TIER INFORMATION PANEL */}
              {app.tier_requested === 'featured' && (
                <div className="mb-4 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
                  <div className="text-sm font-bold text-yellow-900 mb-2">
                    ⭐ FEATURED TIER APPLICATION ⭐
                  </div>
                  <div className="text-xs text-yellow-900 space-y-1">
                    <div className="font-bold">💰 PRICING: $97/year (PAYMENT REQUIRED)</div>
                    <div className="font-semibold mt-2">What They Get:</div>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>Priority placement in search results</li>
                      <li>Enhanced business description</li>
                      <li>Multiple images support</li>
                      <li>Social media integration</li>
                      <li>Booking system</li>
                      <li>Analytics and insights</li>
                    </ul>
                    <div className="mt-2 font-bold text-red-800">
                      ⚠️ COLLECT PAYMENT BEFORE ACTIVATING FEATURED STATUS
                    </div>
                  </div>
                </div>
              )}
              
              {app.tier_requested !== 'featured' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="text-sm font-bold text-green-900 mb-1">
                    🆓 FREE TIER APPLICATION
                  </div>
                  <div className="text-xs text-green-800">
                    ✅ No payment required. This is a standard free listing request.
                  </div>
                </div>
              )}

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
                  onClick={() => onApproveApplication(app.id)} 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm transition-colors"
                >
                  ✓ Approve & Create Provider
                </button>
                <button 
                  onClick={() => onDeleteApplication(app.id)} 
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 border border-red-200 font-medium text-sm transition-colors"
                >
                  ✗ Reject Application
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

