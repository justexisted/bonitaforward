/**
 * JOB POSTS TAB
 * 
 * Displays and manages job posts for business listings.
 * Includes create button, empty states, and job post cards.
 */

import type { JobPost, BusinessListing } from '../types'
import { JobPostCard, JobPostsNoListingsState, JobPostsEmptyState } from './index'

interface JobPostsTabProps {
  jobPosts: JobPost[]
  listings: BusinessListing[]
  onCreateJob: () => void
  onCreateListing: () => void
  onEditJob: (job: JobPost) => void
  onDeleteJob: (jobId: string) => Promise<void>
}

export function JobPostsTab({
  jobPosts,
  listings,
  onCreateJob,
  onCreateListing,
  onEditJob,
  onDeleteJob
}: JobPostsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Job Posts</h2>
          <p className="text-sm text-neutral-600">Manage job postings for your business</p>
        </div>
        {listings.length > 0 && (
          <button
            onClick={onCreateJob}
            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            + Create Job Post
          </button>
        )}
      </div>

      {listings.length === 0 ? (
        <JobPostsNoListingsState onCreateListing={onCreateListing} />
      ) : jobPosts.length === 0 ? (
        <JobPostsEmptyState onCreateJob={onCreateJob} />
      ) : (
        jobPosts.map((job) => (
          <JobPostCard
            key={job.id}
            job={job}
            onEdit={onEditJob}
            onDelete={onDeleteJob}
          />
        ))
      )}
    </div>
  )
}

