import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProviderJobPostWithDetails } from '../types/admin'

export function useAdminJobPosts() {
  const [jobPosts, setJobPosts] = useState<ProviderJobPostWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJobPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      // Call Netlify function with service role to bypass RLS
      const isLocal = window.location.hostname === 'localhost'
      const fnBase = isLocal ? 'http://localhost:8888' : ''
      const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-job-posts` : '/.netlify/functions/admin-list-job-posts'
      
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

      // Process the job posts data
      const jobPostsData = result.jobPosts || []
      setJobPosts(jobPostsData)
      
    } catch (err: any) {
      setError(`Failed to load job posts: ${err.message}`)
      setJobPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const approveJobPost = useCallback(async (job: ProviderJobPostWithDetails) => {
    setLoading(true)
    setError(null)
    try {
      await supabase
        .from('provider_job_posts')
        .update({ 
          status: 'approved', 
          decided_at: new Date().toISOString() 
        })
        .eq('id', job.id)
      
      setJobPosts(prev => 
        prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'approved', decided_at: new Date().toISOString() }
            : j
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err?.message || 'Failed to approve job post')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const rejectJobPost = useCallback(async (job: ProviderJobPostWithDetails, _reason?: string) => {
    setLoading(true)
    setError(null)
    try {
      await supabase
        .from('provider_job_posts')
        .update({ 
          status: 'rejected', 
          decided_at: new Date().toISOString() 
        })
        .eq('id', job.id)
      
      setJobPosts(prev => 
        prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'rejected', decided_at: new Date().toISOString() }
            : j
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err?.message || 'Failed to reject job post')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteJobPost = useCallback(async (jobId: string) => {
    setLoading(true)
    setError(null)
    try {
      await supabase
        .from('provider_job_posts')
        .delete()
        .eq('id', jobId)
      
      setJobPosts(prev => prev.filter(j => j.id !== jobId))
      
      return { success: true }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete job post')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // State
    jobPosts,
    loading,
    error,
    
    // Actions
    loadJobPosts,
    approveJobPost,
    rejectJobPost,
    deleteJobPost,
    
    // Setters
    setError,
  }
}
