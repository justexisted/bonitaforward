import type { JobPost } from '../types'

/**
 * JOB POST CARD COMPONENT
 * 
 * Displays a single job post with status, description, salary, and action buttons.
 * Includes status badges (approved, pending, rejected) and edit/delete functionality.
 * 
 * Extracted from MyBusiness.tsx for better maintainability.
 */

interface JobPostCardProps {
  job: JobPost
  onEdit: (job: JobPost) => void
  onDelete: (jobId: string) => void
}

export function JobPostCard({ job, onEdit, onDelete }: JobPostCardProps) {
  return (
    <div key={job.id} className="rounded-2xl border border-neutral-100 p-1 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              job.status === 'approved' 
                ? 'bg-green-100 text-green-800'
                : job.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : job.status === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {job.status}
            </span>
          </div>
          
          {job.description && (
            <p className="text-sm text-neutral-600 mb-2">{job.description}</p>
          )}
          
          <div className="flex gap-4 text-sm text-neutral-600">
            {job.salary_range && (
              <span><strong>Salary:</strong> {job.salary_range}</span>
            )}
            <span><strong>Posted:</strong> {new Date(job.created_at).toLocaleDateString()}</span>
            {job.decided_at && (
              <span><strong>Decided:</strong> {new Date(job.decided_at).toLocaleDateString()}</span>
            )}
          </div>
          
          {job.apply_url && (
            <div className="mt-2">
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Apply Here →
              </a>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 ml-4">
          <button 
            onClick={() => {
              console.log('[JobPostCard] Edit button clicked for job:', job.id, job.title)
              onEdit(job)
            }}
            className="rounded-full bg-neutral-100 text-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-200"
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete(job.id)}
            className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs border border-red-200 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * EMPTY STATE - No Business Listings
 * Displayed when user needs to create a business listing before posting jobs
 */
export function JobPostsNoListingsState({ 
  onCreateListing 
}: { 
  onCreateListing: () => void 
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">Ready to Post Jobs?</h3>
      <p className="text-neutral-600 mb-2">First, you'll need to create a business listing.</p>
      <p className="text-sm text-neutral-500 mb-6">Job postings are linked to your business listings so candidates can learn more about your company.</p>
      <button
        onClick={onCreateListing}
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Business Listing
      </button>
      <p className="text-xs text-neutral-500 mt-4">
        After creating your listing, you can return here to post jobs
      </p>
    </div>
  )
}

/**
 * EMPTY STATE - No Job Posts
 * Displayed when user has listings but no job posts yet
 */
export function JobPostsEmptyState({ 
  onCreateJob 
}: { 
  onCreateJob: () => void 
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 p-8 bg-white text-center">
      <h3 className="text-lg font-medium text-neutral-900">No Job Posts</h3>
      <p className="mt-2 text-neutral-600">You haven't created any job posts yet.</p>
      <button
        onClick={onCreateJob}
        className="mt-4 inline-block rounded-full bg-neutral-900 text-white px-6 py-2"
      >
        Create Your First Job Post
      </button>
    </div>
  )
}

