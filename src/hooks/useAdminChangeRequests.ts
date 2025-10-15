import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProviderChangeRequestWithDetails } from '../types/admin'

export function useAdminChangeRequests() {
  const [changeRequests, setChangeRequests] = useState<ProviderChangeRequestWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedChangeRequestIds, setExpandedChangeRequestIds] = useState<Set<string>>(new Set())
  const [expandedBusinessDropdowns, setExpandedBusinessDropdowns] = useState<Set<string>>(new Set())
  const [expandedBusinessDetails, setExpandedBusinessDetails] = useState<Record<string, any>>({})
  const [loadingBusinessDetails, setLoadingBusinessDetails] = useState<Record<string, boolean>>({})

  const loadChangeRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Call Netlify function with service role to bypass RLS
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-change-requests` : '/.netlify/functions/admin-list-change-requests'
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Function call failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      setChangeRequests(result.requests || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading change requests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const approveChangeRequest = useCallback(async (request: ProviderChangeRequestWithDetails) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('provider_change_requests')
        .update({ 
          status: 'approved',
          decided_at: new Date().toISOString()
        })
        .eq('id', request.id)
      
      if (error) throw error
      
      // Update local state
      setChangeRequests(prev => 
        prev.map(req => 
          req.id === request.id 
            ? { ...req, status: 'approved', decided_at: new Date().toISOString() }
            : req
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const rejectChangeRequest = useCallback(async (request: ProviderChangeRequestWithDetails, reason?: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('provider_change_requests')
        .update({ 
          status: 'rejected',
          decided_at: new Date().toISOString(),
          reason: reason || null
        })
        .eq('id', request.id)
      
      if (error) throw error
      
      // Update local state
      setChangeRequests(prev => 
        prev.map(req => 
          req.id === request.id 
            ? { ...req, status: 'rejected', decided_at: new Date().toISOString(), reason: reason || null }
            : req
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleChangeRequestExpansion = useCallback((requestId: string) => {
    setExpandedChangeRequestIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(requestId)) {
        newSet.delete(requestId)
      } else {
        newSet.add(requestId)
      }
      return newSet
    })
  }, [])

  const toggleBusinessDropdown = useCallback((businessName: string) => {
    setExpandedBusinessDropdowns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(businessName)) {
        newSet.delete(businessName)
      } else {
        newSet.add(businessName)
      }
      return newSet
    })
  }, [])

  const fetchBusinessDetails = useCallback(async (userId: string) => {
    setLoadingBusinessDetails(prev => ({ ...prev, [userId]: true }))
    try {
      // Implementation for fetching business details
      // This would need to be implemented based on your specific requirements
      console.log('Fetching business details for user:', userId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingBusinessDetails(prev => ({ ...prev, [userId]: false }))
    }
  }, [])

  const collapseBusinessDetails = useCallback((userId: string) => {
    setExpandedBusinessDetails(prev => {
      const newDetails = { ...prev }
      delete newDetails[userId]
      return newDetails
    })
  }, [])

  return {
    // State
    changeRequests,
    loading,
    error,
    expandedChangeRequestIds,
    expandedBusinessDropdowns,
    expandedBusinessDetails,
    loadingBusinessDetails,
    
    // Actions
    loadChangeRequests,
    approveChangeRequest,
    rejectChangeRequest,
    toggleChangeRequestExpansion,
    toggleBusinessDropdown,
    fetchBusinessDetails,
    collapseBusinessDetails,
    
    // Setters
    setError,
  }
}
