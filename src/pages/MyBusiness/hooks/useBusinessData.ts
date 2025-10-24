import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { BusinessListing, BusinessApplication, JobPost } from '../types'

/**
 * Custom hook for managing all business-related data for the logged-in user
 * 
 * Features:
 * - Loads listings, applications, and job posts
 * - Handles change requests
 * - Provides loading and error states
 * - Auto-refreshes on mount
 * 
 * @param userId - The authenticated user's ID
 * @param userEmail - The authenticated user's email
 * @returns Object with data arrays, loading state, error, and refresh function
 */
export function useBusinessData(userId: string | null, userEmail: string | null) {
  const [listings, setListings] = useState<BusinessListing[]>([])
  const [applications, setApplications] = useState<BusinessApplication[]>([])
  const [jobPosts, setJobPosts] = useState<JobPost[]>([])
  const [changeRequests, setChangeRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Loads all business listings owned by the user
   */
  const loadListings = useCallback(async () => {
    if (!userId) return []

    console.log('[useBusinessData] Loading listings for user:', userId)

    try {
      const { data, error: listingsError } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })

      if (listingsError) {
        console.error('[useBusinessData] Error loading listings:', listingsError)
        throw listingsError
      }

      console.log(`[useBusinessData] Loaded ${data?.length || 0} listings`)
      return data || []
    } catch (err: any) {
      console.error('[useBusinessData] Unexpected error loading listings:', err)
      return []
    }
  }, [userId])

  /**
   * Loads all business applications submitted by the user
   */
  const loadApplications = useCallback(async () => {
    if (!userEmail) return []

    console.log('[useBusinessData] Loading applications for email:', userEmail)

    try {
      const { data, error: appsError } = await supabase
        .from('business_applications')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })

      if (appsError) {
        console.error('[useBusinessData] Error loading applications:', appsError)
        throw appsError
      }

      console.log(`[useBusinessData] Loaded ${data?.length || 0} applications`)
      return data || []
    } catch (err: any) {
      console.error('[useBusinessData] Unexpected error loading applications:', err)
      return []
    }
  }, [userEmail])

  /**
   * Loads all job posts for the user's businesses
   */
  const loadJobPosts = useCallback(async () => {
    if (!userId) return []

    console.log('[useBusinessData] Loading job posts for user:', userId)

    try {
      // First get all provider IDs owned by this user
      const { data: userProviders } = await supabase
        .from('providers')
        .select('id')
        .eq('owner_user_id', userId)

      if (!userProviders || userProviders.length === 0) {
        console.log('[useBusinessData] No providers found, no job posts to load')
        return []
      }

      const providerIds = userProviders.map(p => p.id)

      // Then get all job posts for those providers
      const { data, error: jobsError } = await supabase
        .from('provider_job_posts')
        .select(`
          *,
          providers (
            name
          )
        `)
        .in('provider_id', providerIds)
        .order('created_at', { ascending: false })

      if (jobsError) {
        console.error('[useBusinessData] Error loading job posts:', jobsError)
        throw jobsError
      }

      console.log(`[useBusinessData] Loaded ${data?.length || 0} job posts`)
      return data || []
    } catch (err: any) {
      console.error('[useBusinessData] Unexpected error loading job posts:', err)
      return []
    }
  }, [userId])

  /**
   * Loads all change requests for the user's businesses
   */
  const loadChangeRequests = useCallback(async () => {
    if (!userId) return []

    console.log('[useBusinessData] Loading change requests for user:', userId)

    try {
      // Get provider IDs owned by this user
      const { data: userProviders } = await supabase
        .from('providers')
        .select('id')
        .eq('owner_user_id', userId)

      if (!userProviders || userProviders.length === 0) {
        return []
      }

      const providerIds = userProviders.map(p => p.id)

      // Get change requests for those providers
      const { data, error: reqError } = await supabase
        .from('provider_change_requests')
        .select('*')
        .in('provider_id', providerIds)
        .order('created_at', { ascending: false })

      if (reqError) {
        console.error('[useBusinessData] Error loading change requests:', reqError)
        throw reqError
      }

      console.log(`[useBusinessData] Loaded ${data?.length || 0} change requests`)
      return data || []
    } catch (err: any) {
      console.error('[useBusinessData] Unexpected error loading change requests:', err)
      return []
    }
  }, [userId])

  /**
   * Refreshes all business data
   */
  const refreshData = useCallback(async () => {
    if (!userId || !userEmail) {
      console.log('[useBusinessData] Cannot refresh: missing user credentials')
      setLoading(false)
      return
    }

    console.log('[useBusinessData] Refreshing all business data...')
    setLoading(true)
    setError(null)

    try {
      const [
        listingsData,
        applicationsData,
        jobPostsData,
        changeRequestsData
      ] = await Promise.all([
        loadListings(),
        loadApplications(),
        loadJobPosts(),
        loadChangeRequests()
      ])

      setListings(listingsData)
      setApplications(applicationsData)
      setJobPosts(jobPostsData)
      setChangeRequests(changeRequestsData)

      console.log('[useBusinessData] Data refresh complete')
    } catch (err: any) {
      console.error('[useBusinessData] Error refreshing data:', err)
      setError(err.message || 'Failed to load business data')
    } finally {
      setLoading(false)
    }
  }, [userId, userEmail, loadListings, loadApplications, loadJobPosts, loadChangeRequests])

  // Auto-load data on mount and when user credentials change
  useEffect(() => {
    refreshData()
  }, [refreshData])

  return {
    listings,
    applications,
    jobPosts,
    changeRequests,
    loading,
    error,
    refreshData,
    setListings,
    setApplications,
    setJobPosts,
    setChangeRequests
  }
}

