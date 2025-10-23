import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ProviderChangeRequest } from '../../../lib/supabaseData'
import type { ProviderRow } from '../../../types/admin'

/**
 * CHANGE REQUESTS SECTION
 * 
 * Step 12 of gradual Admin.tsx extraction (Phase 3)
 * Complete change request management system with approval workflow.
 * 
 * Features:
 * - Business grouping with collapsible dropdowns
 * - Status grouping (pending/approved/rejected/auto-applied)
 * - Visual change diff system (old vs new comparison)
 * - Full business details expansion
 * - Approve/reject workflow with notifications
 * - Auto-applied changes history
 * - Complex multi-level UI
 * 
 * This is one of the most complex admin sections with nested state management.
 */

// Extended type with joined data
export interface ProviderChangeRequestWithDetails extends ProviderChangeRequest {
  providers?: {
    id: string
    name: string
    email?: string
  }
  profiles?: {
    id: string
    email: string
    name?: string
  }
}

interface ChangeRequestsSectionProps {
  providers: ProviderRow[]  // Need providers for diff comparison
  onMessage: (msg: string) => void
  onError: (err: string) => void
}

export function ChangeRequestsSection({ 
  providers, 
  onMessage, 
  onError 
}: ChangeRequestsSectionProps) {
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBusinessDropdowns, setExpandedBusinessDropdowns] = useState<Set<string>>(new Set())
  const [expandedChangeRequestIds, setExpandedChangeRequestIds] = useState<Set<string>>(new Set())

  // Load change requests on mount
  useEffect(() => {
    loadChangeRequests()
  }, [])

  /**
   * Load change requests using Netlify function (bypasses RLS with service role)
   */
  const loadChangeRequests = async () => {
    try {
      setLoading(true)
      console.log('[ChangeRequestsSection] STARTING loadChangeRequests')
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('[ChangeRequestsSection] ❌ No auth token available')
        onError('Not authenticated')
        return
      }

      // Call Netlify function that uses service role
      const url = '/.netlify/functions/admin-list-change-requests'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ChangeRequestsSection] ❌ Error response body:', errorText)
        onError(`Failed to load change requests (HTTP ${response.status}): ${errorText}`)
        return
      }

      const result = await response.json()
      
      if (!result.requests) {
        console.error('[ChangeRequestsSection] ❌ Result has no requests property:', result)
        onError('Invalid response from server')
        return
      }
      
      console.log('[ChangeRequestsSection] ✓ Setting changeRequests state with', result.requests.length, 'items')
      setChangeRequests(result.requests)
      
    } catch (error: any) {
      console.error('[ChangeRequestsSection] ❌ EXCEPTION in loadChangeRequests:', error)
      console.error('[ChangeRequestsSection] Error stack:', error.stack)
      onError(`Failed to load change requests: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Notify user helper
   */
  const notifyUser = async (user_id: string | null | undefined, subject: string, body?: string, data?: any) => {
    if (!user_id) return
    try { 
      await supabase.from('user_notifications').insert([{ 
        user_id, 
        subject, 
        body: body || null, 
        data: data || null 
      }]) 
    } catch (err) {
      console.error('[ChangeRequestsSection] Failed to send notification:', err)
    }
  }

  /**
   * Approve a change request
   */
  const approveChangeRequest = async (req: ProviderChangeRequestWithDetails) => {
    onMessage('')
    try {
      if (req.type === 'update') {
        const { error } = await supabase
          .from('providers')
          .update(req.changes as any)
          .eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'delete') {
        const res = await supabase
          .from('providers')
          .delete()
          .eq('id', req.provider_id)
          .select('id')
        if (res.error) {
          // If cannot hard delete, soft-delete by adding 'deleted' badge
          const { data: row } = await supabase
            .from('providers')
            .select('badges')
            .eq('id', req.provider_id)
            .single()
          const badges = Array.isArray((row as any)?.badges) ? ((row as any)?.badges as string[]) : []
          const next = Array.from(new Set([...(badges || []), 'deleted']))
          await supabase.from('providers').update({ badges: next as any }).eq('id', req.provider_id)
        }
      } else if (req.type === 'feature_request') {
        const { error } = await supabase
          .from('providers')
          .update({ is_member: true })
          .eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      } else if (req.type === 'claim') {
        const { error } = await supabase
          .from('providers')
          .update({ owner_user_id: req.owner_user_id })
          .eq('id', req.provider_id)
        if (error) throw new Error(error.message)
      }
      
      await supabase
        .from('provider_change_requests')
        .update({ 
          status: 'approved', 
          decided_at: new Date().toISOString() as any 
        })
        .eq('id', req.id)
      
      await notifyUser(
        req.owner_user_id, 
        'Request approved', 
        `Your ${req.type} request was approved.`, 
        { reqId: req.id }
      )
      
      onMessage('Change request approved')
      
      try { 
        window.dispatchEvent(new CustomEvent('bf-refresh-providers')) 
      } catch {}
      
      // Refresh the change requests list
      await loadChangeRequests()
    } catch (err: any) {
      onError(err?.message || 'Failed to approve request')
    }
  }

  /**
   * Reject a change request
   */
  const rejectChangeRequest = async (req: ProviderChangeRequestWithDetails, reason?: string) => {
    onMessage('')
    try {
      await supabase
        .from('provider_change_requests')
        .update({ 
          status: 'rejected', 
          reason: reason || null, 
          decided_at: new Date().toISOString() as any 
        })
        .eq('id', req.id)
      
      await notifyUser(
        req.owner_user_id, 
        'Request rejected', 
        reason || `Your ${req.type} request was rejected.`, 
        { reqId: req.id }
      )
      
      onMessage('Change request rejected')
      
      // Refresh the change requests list
      await loadChangeRequests()
    } catch (err: any) {
      onError(err?.message || 'Failed to reject request')
    }
  }

  /**
   * Compute field-by-field differences between old and new values
   */
  const computeChangeDiff = (currentProvider: ProviderRow | undefined, proposedChanges: Record<string, any> | null) => {
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
      description: 'Description',
      tags: 'Tags',
      specialties: 'Specialties',
      service_areas: 'Service Areas',
      bonita_resident_discount: 'Bonita Resident Discount',
      booking_enabled: 'Online Booking',
      booking_type: 'Booking Type',
      booking_instructions: 'Booking Instructions',
      booking_url: 'Booking URL'
    }

    for (const field in proposedChanges) {
      const oldValue = (currentProvider as any)[field]
      const newValue = proposedChanges[field]
      
      // Deep comparison for arrays and objects
      const isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue)
      
      if (isDifferent) {
        diffs.push({
          field,
          oldValue,
          newValue,
          fieldLabel: fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        })
      }
    }
    
    return diffs
  }

  /**
   * Format value for display
   */
  const formatValueForDisplay = (value: any): string => {
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
  const toggleChangeRequestExpansion = (requestId: string) => {
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
  const toggleBusinessDropdown = (businessName: string) => {
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
        <div className="font-medium">Owner Change Requests & Logs</div>
        <div className="mt-4 text-center text-neutral-500">Loading change requests...</div>
      </div>
    )
  }

  // Group requests by business name
  const businessGroups = changeRequests.reduce<Record<string, typeof changeRequests[number][]>>((groups, r) => {
    const businessName = r.providers?.name || 'Unknown Business'
    if (!groups[businessName]) {
      groups[businessName] = []
    }
    groups[businessName].push(r)
    return groups
  }, {})

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Owner Change Requests & Logs</div>
      <div className="mt-2 space-y-2 text-sm">
        {Object.entries(businessGroups).map(([businessName, requests]) => {
          const isExpanded = expandedBusinessDropdowns.has(businessName)
          const pendingCount = requests.filter(r => r.status === 'pending').length
          const approvedCount = requests.filter(r => r.status === 'approved').length
          const rejectedCount = requests.filter(r => r.status === 'rejected').length

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
                          const currentProvider = providers.find(p => p.id === r.provider_id)
                          const changeDiff = computeChangeDiff(currentProvider, r.changes)
                          const isRequestExpanded = expandedChangeRequestIds.has(r.id)

                          return (
                            <div
                              key={r.id}
                              className={`rounded-xl border-2 p-3 shadow-sm ${
                                r.type === 'feature_request' 
                                  ? 'border-yellow-400 bg-yellow-50' 
                                  : r.type === 'update'
                                  ? 'border-blue-300 bg-white'
                                  : r.type === 'delete'
                                  ? 'border-red-300 bg-white'
                                  : 'border-neutral-200 bg-white'
                              }`}
                            >
                              {/* Request Type Badge */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                    r.type === 'feature_request'
                                      ? 'bg-yellow-200 text-yellow-900 border-2 border-yellow-400'
                                      : r.type === 'update'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : r.type === 'delete'
                                      ? 'bg-red-100 text-red-900 border border-red-300'
                                      : r.type === 'claim'
                                      ? 'bg-green-100 text-green-900 border border-green-300'
                                      : 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                                  }`}>
                                    {r.type === 'update' && '📝'}
                                    {r.type === 'feature_request' && '⭐'}
                                    {r.type === 'delete' && '🗑️'}
                                    {r.type === 'claim' && '✋'}
                                    {' '}
                                    {r.type === 'update'
                                      ? 'LISTING UPDATE'
                                      : r.type === 'delete'
                                      ? 'DELETE REQUEST'
                                      : r.type === 'feature_request'
                                      ? 'FEATURED UPGRADE ($97/YEAR)'
                                      : r.type === 'claim'
                                      ? 'BUSINESS CLAIM'
                                      : String(r.type).toUpperCase()}
                                  </span>
                                  {/* Debug: Show raw type value */}
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    type={r.type}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-500 whitespace-nowrap">
                                  {new Date(r.created_at).toLocaleString()}
                                </div>
                              </div>
                              
                              {/* Business Name */}
                              <div className="font-bold text-lg text-neutral-900 mb-2">
                                {r.providers?.name || 'Unknown Business'}
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

                              {/* Feature Request Specific Info */}
                              {r.type === 'feature_request' && (
                                <div className="mt-3 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
                                  <div className="text-sm font-bold text-yellow-900 mb-2">
                                    ⭐ FEATURED UPGRADE REQUEST ⭐
                                  </div>
                                  <div className="text-xs text-yellow-900 space-y-1">
                                    <div className="font-bold">💰 Pricing: $97/year</div>
                                    <div className="font-semibold mt-2">Benefits Include:</div>
                                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                                      <li>Priority placement in search results</li>
                                      <li>Enhanced business description</li>
                                      <li>Multiple images support</li>
                                      <li>Social media links integration</li>
                                      <li>Google Maps integration</li>
                                      <li>Booking system integration</li>
                                      <li>Analytics and insights</li>
                                      <li>Premium customer support</li>
                                    </ul>
                                  </div>
                                  {r.reason && (
                                    <div className="mt-2 text-xs text-yellow-800">
                                      <strong>Reason:</strong> {r.reason}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Show what changed for UPDATE requests */}
                              {r.type === 'update' && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                                  <div className="text-sm font-bold text-blue-900 mb-2">
                                    📝 LISTING UPDATE REQUEST
                                  </div>
                                  <div className="text-xs text-blue-800 mb-3">
                                    This user wants to update their business information. No payment involved.
                                  </div>
                                  {r.reason && (
                                    <div className="text-xs text-blue-800 mb-2">
                                      <strong>Reason:</strong> {r.reason}
                                    </div>
                                  )}
                                  {changeDiff.length > 0 && (
                                    <>
                                      <div className="text-xs font-semibold text-blue-900 mb-2">
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
                                    </>
                                  )}
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

                              {/* Action Buttons */}
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  onClick={() => approveChangeRequest(r)}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Reason for rejection (optional):')
                                    if (reason !== null) {
                                      rejectChangeRequest(r, reason)
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Approved/Rejected Requests */}
                  {requests.some(r => r.status === 'approved') && (
                    <div>
                      <div className="font-medium text-green-800 mb-3">✅ Approved Requests</div>
                      <div className="space-y-2">
                        {requests
                          .filter(r => r.status === 'approved')
                          .slice(0, 5)
                          .map((r) => (
                            <div key={r.id} className="rounded-xl border border-green-200 p-3 bg-green-50 text-xs">
                              <div className="flex justify-between">
                                <span className="font-medium">{r.type}</span>
                                <span className="text-green-600">{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {requests.some(r => r.status === 'rejected') && (
                    <div>
                      <div className="font-medium text-red-800 mb-3">❌ Rejected Requests</div>
                      <div className="space-y-2">
                        {requests
                          .filter(r => r.status === 'rejected')
                          .slice(0, 5)
                          .map((r) => (
                            <div key={r.id} className="rounded-xl border border-red-200 p-3 bg-red-50 text-xs">
                              <div className="flex justify-between">
                                <span className="font-medium">{r.type}</span>
                                <span className="text-red-600">{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                              {r.reason && (
                                <div className="mt-1 text-red-700">
                                  <strong>Reason:</strong> {r.reason}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-Applied Changes History (Last 10) */}
                  {requests.some(r => r.status === 'approved' && r.type === 'update') && (
                    <div>
                      <div className="font-medium text-blue-800 mb-3">🔄 Recent Auto-Applied Changes (Last 10)</div>
                      <div className="space-y-2">
                        {requests
                          .filter(r => r.status === 'approved' && r.type === 'update')
                          .slice(0, 10)
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
                                
                                {/* Show changes */}
                                {changeDiff.length > 0 && (
                                  <div className="mt-2 text-xs">
                                    <div className="font-semibold text-green-800 mb-1">
                                      Fields Updated ({changeDiff.length}):
                                    </div>
                                    <div className="text-green-700">
                                      {changeDiff.map(d => d.fieldLabel).join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* No requests message */}
        {changeRequests.length === 0 && (
          <div className="text-neutral-500">No requests or changes yet.</div>
        )}
      </div>
    </div>
  )
}

