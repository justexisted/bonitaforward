/**
 * USE ADMIN DATA HOOK
 * 
 * Custom hook for managing admin data loading and state.
 * Encapsulates all data fetching logic and provides a clean API
 * for the Admin page components.
 * 
 * Features:
 * - Centralized data loading
 * - Loading states
 * - Error handling
 * - Refresh functionality
 * - Memoized data
 * 
 * Usage:
 * ```typescript
 * function AdminPage() {
 *   const { data, loading, error, refresh } = useAdminData()
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return <div>{data.providers.length} providers</div>
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { AdminDataService } from '../services/adminDataService'
import type { AdminData } from '../types/admin'

// ============================================================================
// HOOK INTERFACE
// ============================================================================

interface UseAdminDataReturn {
  /** All admin data */
  data: AdminData | null
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh all data */
  refresh: () => Promise<void>
  /** Refresh specific data entity */
  refreshEntity: (entity: keyof AdminData) => Promise<void>
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for managing admin data
 * 
 * @returns Admin data, loading state, error state, and refresh functions
 */
export function useAdminData(): UseAdminDataReturn {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all admin data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const adminData = await AdminDataService.loadAllAdminData()
      
      setData(adminData as AdminData)
    } catch (err) {
      console.error('[useAdminData] Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  /**
   * Refresh a specific entity
   */
  const refreshEntity = useCallback(async (entity: keyof AdminData) => {
    if (!data) return

    try {
      let newEntityData: any

      switch (entity) {
        case 'providers':
          newEntityData = await AdminDataService.fetchProviders()
          break
        case 'funnels':
          newEntityData = await AdminDataService.fetchFunnels()
          break
        case 'bookings':
          newEntityData = await AdminDataService.fetchBookings()
          break
        case 'bookingEvents':
          newEntityData = await AdminDataService.fetchBookingEvents()
          break
        case 'calendarEvents':
          newEntityData = await AdminDataService.fetchCalendarEvents()
          break
        case 'flaggedEvents':
          newEntityData = await AdminDataService.fetchFlaggedEvents()
          break
        case 'businessApplications':
          newEntityData = await AdminDataService.fetchBusinessApplications()
          break
        case 'contactLeads':
          newEntityData = await AdminDataService.fetchContactLeads()
          break
        case 'profiles':
          newEntityData = await AdminDataService.fetchProfiles()
          break
        case 'changeRequests':
          newEntityData = await AdminDataService.fetchProviderChangeRequests()
          break
        case 'jobPosts':
          newEntityData = await AdminDataService.fetchProviderJobPosts()
          break
        default:
          console.warn(`[useAdminData] Unknown entity: ${entity}`)
          return
      }

      setData(prev => prev ? { ...prev, [entity]: newEntityData } : null)
    } catch (err) {
      console.error(`[useAdminData] Error refreshing ${entity}:`, err)
    }
  }, [data])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    refresh,
    refreshEntity
  }
}

export default useAdminData

