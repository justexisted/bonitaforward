import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ProviderJobPost } from '../../../lib/supabaseData'

/**
 * JOB POSTS SECTION
 * 
 * Step 11 of gradual Admin.tsx extraction (Phase 3)
 * Complete job posting management system with approval workflow.
 * 
 * Features:
 * - View all job posts grouped by status (pending/approved/rejected)
 * - Approve/reject job posts
 * - Delete job posts
 * - Display provider and owner information
 * - Debug info showing counts
 * - Notification system for users
 * 
 * This is a self-contained section with its own state management.
 */

// Extended type with joined data from providers and profiles tables
export interface ProviderJobPostWithDetails extends ProviderJobPost {
  provider?: {
    id: string
    name: string
    email: string | null
  } | null
  owner?: {
    id: string
    email: string
    name: string | null
  } | null
}

interface JobPostsSectionProps {
  onMessage: (msg: string) => void
  onError: (err: string) => void
}

export function JobPostsSection({ onMessage, onError }: JobPostsSectionProps) {
  const [jobPosts, setJobPosts] = useState<ProviderJobPostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)

  // Load job posts on mount
  useEffect(() => {
    loadJobPosts()
  }, [])

  const loadJobPosts = async () => {
    try {
      setLoading(true)
      
      // Step 1: Get all job posts
      const { data: jobPostsData, error: jobPostsError } = await supabase
        .from('provider_job_posts')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (jobPostsError) throw jobPostsError
      if (!jobPostsData || jobPostsData.length === 0) {
        setJobPosts([])
        return
      }
      
      // Step 2: Get unique provider IDs and owner user IDs
      const providerIds = [...new Set(jobPostsData.map(job => job.provider_id).filter(Boolean))]
      const ownerIds = [...new Set(jobPostsData.map(job => job.owner_user_id).filter(Boolean))]
      
      // Step 3: Fetch provider details
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, name, email')
        .in('id', providerIds)
      
      // Step 4: Fetch owner details from profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', ownerIds)
      
      // Step 5: Create lookup maps
      const providersMap = new Map(providersData?.map(p => [p.id, p]) || [])
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
      
      // Step 6: Merge data
      const enrichedJobPosts: ProviderJobPostWithDetails[] = jobPostsData.map(job => ({
        ...job,
        provider: job.provider_id ? providersMap.get(job.provider_id) || null : null,
        owner: job.owner_user_id ? profilesMap.get(job.owner_user_id) || null : null
      }))
      
      setJobPosts(enrichedJobPosts)
    } catch (err: any) {
      console.error('[JobPostsSection] Failed to load job posts:', err)
      onError(err.message || 'Failed to load job posts')
    } finally {
      setLoading(false)
    }
  }

  // Notify user helper
  const notifyUser = async (userId: string, title: string, message: string, metadata?: any) => {
    try {
      await supabase.from('user_notifications').insert({
        user_id: userId,
        title,
        message,
        metadata: metadata || {}
      })
    } catch (err) {
      console.error('[JobPostsSection] Failed to send notification:', err)
    }
  }

  const approveJobPost = async (job: ProviderJobPost) => {
    onMessage('')
    try {
      await supabase
        .from('provider_job_posts')
        .update({ 
          status: 'approved', 
          decided_at: new Date().toISOString() as any 
        })
        .eq('id', job.id)
      
      await notifyUser(
        job.owner_user_id, 
        'Job post approved', 
        `Your job post "${job.title}" was approved.`, 
        { jobId: job.id }
      )
      
      setJobPosts(arr => arr.map(j => 
        j.id === job.id 
          ? { ...j, status: 'approved', decided_at: new Date().toISOString() as any } 
          : j
      ))
      
      onMessage('Job post approved')
    } catch (err: any) {
      onError(err?.message || 'Failed to approve job post')
    }
  }

  const rejectJobPost = async (job: ProviderJobPost, reason?: string) => {
    onMessage('')
    try {
      await supabase
        .from('provider_job_posts')
        .update({ 
          status: 'rejected', 
          decided_at: new Date().toISOString() as any 
        })
        .eq('id', job.id)
      
      await notifyUser(
        job.owner_user_id, 
        'Job post rejected', 
        reason || `Your job post "${job.title}" was rejected.`, 
        { jobId: job.id }
      )
      
      setJobPosts(arr => arr.map(j => 
        j.id === job.id 
          ? { ...j, status: 'rejected', decided_at: new Date().toISOString() as any } 
          : j
      ))
      
      onMessage('Job post rejected')
    } catch (err: any) {
      onError(err?.message || 'Failed to reject job post')
    }
  }

  const deleteJobPost = async (jobId: string) => {
    setDeletingJobId(jobId)
    setShowDeleteModal(true)
  }

  const confirmDeleteJobPost = async () => {
    if (!deletingJobId) return

    onMessage('')
    try {
      await supabase.from('provider_job_posts').delete().eq('id', deletingJobId)
      setJobPosts(arr => arr.filter(j => j.id !== deletingJobId))
      onMessage('Job post deleted successfully')
      setShowDeleteModal(false)
      setDeletingJobId(null)
    } catch (err: any) {
      onError(err?.message || 'Failed to delete job post')
      setShowDeleteModal(false)
      setDeletingJobId(null)
    }
  }

  const pendingJobs = jobPosts.filter(j => j.status === 'pending')
  const approvedJobs = jobPosts.filter(j => j.status === 'approved')
  const rejectedJobs = jobPosts.filter(j => j.status === 'rejected')

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
        <div className="font-medium">Job Posts</div>
        <div className="mt-4 text-center text-neutral-500">Loading job posts...</div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Job Posts</div>
      
      {/* Debug Info */}
      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
        <div className="font-medium text-yellow-800 mb-1">Debug Info:</div>
        <div className="text-yellow-700">
          Total jobs: {jobPosts.length} | 
          Pending: {pendingJobs.length} | 
          Approved: {approvedJobs.length} | 
          Rejected: {rejectedJobs.length}
        </div>
        {jobPosts.length > 0 && (
          <div className="mt-1 text-yellow-600">
            Statuses: {jobPosts.map(j => j.status).join(', ')}
          </div>
        )}
      </div>
      
      <div className="mt-2 space-y-2 text-sm">
        {jobPosts.length === 0 && <div className="text-neutral-500">No job posts yet.</div>}
        
        {/* All Jobs - Grouped by Status */}
        {jobPosts.length > 0 && (
          <div className="space-y-4">
            {/* Pending Jobs */}
            {pendingJobs.length > 0 && (
              <div>
                <h4 className="font-medium text-amber-800 mb-2">
                  Pending Review ({pendingJobs.length})
                </h4>
                {pendingJobs.map(j => (
                  <JobCard 
                    key={j.id} 
                    job={j} 
                    onApprove={() => approveJobPost(j)} 
                    onReject={() => rejectJobPost(j)} 
                    onDelete={() => deleteJobPost(j.id)} 
                  />
                ))}
              </div>
            )}
            
            {/* Approved Jobs */}
            {approvedJobs.length > 0 && (
              <div>
                <h4 className="font-medium text-green-800 mb-2">
                  Approved ({approvedJobs.length})
                </h4>
                {approvedJobs.map(j => (
                  <JobCard 
                    key={j.id} 
                    job={j} 
                    onApprove={() => approveJobPost(j)} 
                    onReject={() => rejectJobPost(j)} 
                    onDelete={() => deleteJobPost(j.id)} 
                  />
                ))}
              </div>
            )}
            
            {/* Rejected Jobs */}
            {rejectedJobs.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2">
                  Rejected ({rejectedJobs.length})
                </h4>
                {rejectedJobs.map(j => (
                  <JobCard 
                    key={j.id} 
                    job={j} 
                    onApprove={() => approveJobPost(j)} 
                    onReject={() => rejectJobPost(j)} 
                    onDelete={() => deleteJobPost(j.id)} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Job Post</h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to delete this job post? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteJobPost}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Job Post
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingJobId(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Job Card Component
function JobCard({ 
  job, 
  onApprove, 
  onReject, 
  onDelete 
}: { 
  job: ProviderJobPostWithDetails
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'rejected': return '❌'
      default: return '📄'
    }
  }

  return (
    <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(job.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(job.status)}</span>
            <h4 className="font-semibold text-lg">{job.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          <div className="text-sm text-neutral-600">
            Posted: {new Date(job.created_at).toLocaleString()}
            {job.decided_at && (
              <span className="ml-2">
                | Decided: {new Date(job.decided_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        {job.description && (
          <div>
            <span className="text-sm font-medium">Description:</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Apply URL:</span>
            <div className="mt-1">
              {job.apply_url ? (
                <a 
                  href={job.apply_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {job.apply_url}
                </a>
              ) : (
                <span className="text-neutral-500">Not provided</span>
              )}
            </div>
          </div>
          
          <div>
            <span className="font-medium">Salary Range:</span>
            <div className="mt-1">
              {job.salary_range || <span className="text-neutral-500">Not specified</span>}
            </div>
          </div>
        </div>

        {/* Provider Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <div className="text-xs font-medium text-blue-800 mb-1">Business Information</div>
            <div className="space-y-1 text-sm">
              {job.provider ? (
                <>
                  <div>
                    <span className="font-medium">Business Name:</span>
                    <span className="ml-2 text-blue-900">{job.provider.name}</span>
                  </div>
                  {job.provider.email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <a href={`mailto:${job.provider.email}`} className="ml-2 text-blue-600 hover:underline">
                        {job.provider.email}
                      </a>
                    </div>
                  )}
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">Provider ID:</span>
                    <span className="ml-1 font-mono">{job.provider_id}</span>
                  </div>
                </>
              ) : (
                <div className="text-neutral-600">
                  Provider ID: {job.provider_id}
                  <div className="text-xs text-neutral-500 mt-1">(Details not available)</div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-blue-800 mb-1">Posted By (Owner)</div>
            <div className="space-y-1 text-sm">
              {job.owner ? (
                <>
                  {job.owner.name && (
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2 text-blue-900">{job.owner.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Email:</span>
                    <a href={`mailto:${job.owner.email}`} className="ml-2 text-blue-600 hover:underline">
                      {job.owner.email}
                    </a>
                  </div>
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">User ID:</span>
                    <span className="ml-1 font-mono">{job.owner_user_id}</span>
                  </div>
                </>
              ) : (
                <div className="text-neutral-600">
                  Owner ID: {job.owner_user_id}
                  <div className="text-xs text-neutral-500 mt-1">(Details not available)</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-current border-opacity-20">
        {job.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'approved' && (
          <>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {job.status === 'rejected' && (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Approve
            </button>
          </>
        )}
        
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-neutral-600 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

