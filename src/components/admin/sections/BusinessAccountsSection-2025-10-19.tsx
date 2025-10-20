import React from 'react'

interface BusinessAccountsSectionProps {
  profiles: Array<{
    id: string
    email: string | null
    name: string | null
    role?: string | null
  }>
  expandedBusinessDetails: Record<string, any[]>
  loadingBusinessDetails: Record<string, boolean>
  deletingUserId: string | null
  onSetDeletingUserId: (userId: string | null) => void
  onFetchBusinessDetails: (userId: string) => Promise<void>
  onCollapseBusinessDetails: (userId: string) => void
  onDeleteUser: (userId: string) => Promise<void>
}

export const BusinessAccountsSection: React.FC<BusinessAccountsSectionProps> = ({
  profiles,
  expandedBusinessDetails,
  loadingBusinessDetails,
  deletingUserId,
  onSetDeletingUserId,
  onFetchBusinessDetails,
  onCollapseBusinessDetails,
  onDeleteUser
}) => {
  const businessAccounts = profiles.filter((p) => String(p.role || '').toLowerCase() === 'business')

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Business Accounts</div>
      <div className="mt-2 text-sm">
        {businessAccounts.length === 0 && (
          <div className="text-neutral-500">No business accounts yet.</div>
        )}
        {businessAccounts.map((p) => (
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
                    onClick={() => onCollapseBusinessDetails(p.id)} 
                    className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs hover:bg-red-100"
                  >
                    Back
                  </button>
                ) : (
                  <button 
                    onClick={() => onFetchBusinessDetails(p.id)} 
                    className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 border border-blue-200 text-xs hover:bg-blue-100"
                    disabled={loadingBusinessDetails[p.id]}
                  >
                    {loadingBusinessDetails[p.id] ? 'Loading...' : 'See More'}
                  </button>
                )}
                {deletingUserId === p.id ? (
                  <>
                    <button 
                      onClick={() => onDeleteUser(p.id)} 
                      className="rounded-full bg-red-600 text-white px-3 py-1.5 border border-red-700 text-xs hover:bg-red-700 font-medium"
                    >
                      Confirm Delete
                    </button>
                    <button 
                      onClick={() => onSetDeletingUserId(null)} 
                      className="text-xs underline text-neutral-600 hover:text-neutral-900"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => onSetDeletingUserId(p.id)} 
                    className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs"
                  >
                    Delete
                  </button>
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
  )
}

