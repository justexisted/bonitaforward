import React, { useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'

interface FunnelRow {
  id: string
  user_email: string
  category_key: string
  answers: Record<string, string>
  created_at: string
}

interface FunnelResponsesSectionProps {
  funnels: FunnelRow[]
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
  onFunnelsUpdate: (funnels: FunnelRow[]) => void
}

export const FunnelResponsesSection: React.FC<FunnelResponsesSectionProps> = ({
  funnels,
  onMessage,
  onError,
  onFunnelsUpdate
}) => {
  const [funnelUserFilter, setFunnelUserFilter] = useState('')
  const [editFunnel, setEditFunnel] = useState<Record<string, string>>({})

  // Filtered funnel responses based on user email filter
  const filteredFunnels = useMemo(() => {
    if (!funnelUserFilter.trim()) {
      return funnels
    }
    const filterLower = funnelUserFilter.toLowerCase().trim()
    return funnels.filter(funnel => 
      funnel.user_email.toLowerCase().includes(filterLower)
    )
  }, [funnels, funnelUserFilter])

  // Get unique user emails for the datalist
  const userEmails = useMemo(() => {
    return Array.from(new Set(funnels.map(f => f.user_email).filter(Boolean))).sort()
  }, [funnels])

  const handleSaveFunnel = async (row: FunnelRow) => {
    try {
      const next = (() => {
        try {
          return JSON.parse(editFunnel[row.id] || JSON.stringify(row.answers || {}))
        } catch {
          return row.answers
        }
      })()
      
      const { error } = await supabase
        .from('funnel_responses')
        .update({ answers: next as any })
        .eq('id', row.id)
      
      if (error) {
        onError(error.message)
      } else {
        onMessage('Funnel updated')
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to save funnel')
    }
  }

  const handleDeleteFunnel = async (row: FunnelRow) => {
    const { error } = await supabase
      .from('funnel_responses')
      .delete()
      .eq('id', row.id)
    
    if (error) {
      onError(error.message)
    } else {
      onFunnelsUpdate(funnels.filter((f) => f.id !== row.id))
      onMessage('Funnel deleted')
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Funnel Responses</div>
      
      {/* User Filter Section - allows filtering by specific user email to avoid overwhelming display */}
      <div className="mt-3 mb-4">
        <div className="flex items-center gap-3">
          <label htmlFor="funnel-user-filter" className="text-sm font-medium text-neutral-700">
            Filter by user email:
          </label>
          <div className="flex-1 relative">
            <input
              id="funnel-user-filter"
              type="text"
              value={funnelUserFilter}
              onChange={(e) => setFunnelUserFilter(e.target.value)}
              placeholder="Enter user email to filter..."
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400"
              list="funnel-user-emails"
            />
            {/* Dropdown with existing user emails for quick selection */}
            <datalist id="funnel-user-emails">
              {userEmails.map(email => (
                <option key={email} value={email} />
              ))}
            </datalist>
          </div>
          {funnelUserFilter && (
            <button
              onClick={() => setFunnelUserFilter('')}
              className="rounded-full bg-neutral-100 text-neutral-600 px-3 py-1.5 text-xs hover:bg-neutral-200"
            >
              Clear
            </button>
          )}
        </div>
        {/* Show filter status and count */}
        <div className="mt-2 text-xs text-neutral-500">
          {funnelUserFilter ? (
            <>Showing {filteredFunnels.length} of {funnels.length} responses</>
          ) : (
            <>Showing all {funnels.length} responses</>
          )}
        </div>
      </div>
      
      <div className="mt-2 space-y-2 text-sm">
        {filteredFunnels.length === 0 && (
          <div className="text-neutral-500">
            {funnelUserFilter ? 'No responses found for this user.' : 'No entries yet.'}
          </div>
        )}
        {filteredFunnels.map((row) => (
          <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
            <div className="text-neutral-800 font-medium">{row.category_key}</div>
            <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
            <div className="mt-1 text-xs text-neutral-600">User: {row.user_email}</div>
            <textarea 
              className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" 
              style={{ height: '14vh' }} 
              defaultValue={JSON.stringify(row.answers, null, 2)} 
              onChange={(e) => setEditFunnel((m) => ({ ...m, [row.id]: e.target.value }))} 
            />
            <div className="mt-2 flex items-center gap-2">
              <button 
                onClick={() => handleSaveFunnel(row)} 
                className="btn btn-secondary text-xs"
              >
                Save
              </button>
              <button 
                onClick={() => handleDeleteFunnel(row)} 
                className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

