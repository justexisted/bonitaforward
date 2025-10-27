import { useState, useEffect } from 'react'
import type { BusinessListing, JobPost } from '../types'
import { useHideDock } from '../../../hooks/useHideDock'

/**
 * JOB POST FORM COMPONENT
 * 
 * This component provides a form for creating job posts for business listings.
 * It allows business owners to create job postings that will be reviewed by admin.
 * 
 * Features:
 * - Select business listing to post job for
 * - Job title and description
 * - Application URL and salary range
 * - Admin approval workflow
 */
export function JobPostForm({ 
    listings, 
    editingJob, // Optional job being edited
    onSave, 
    onCancel 
  }: { 
    listings: BusinessListing[]
    editingJob?: JobPost | null // Optional job being edited
    onSave: (providerId: string, jobData: {
      title: string
      description?: string
      apply_url?: string
      salary_range?: string
    }) => void
    onCancel: () => void 
  }) {
    const [formData, setFormData] = useState({
      provider_id: editingJob?.provider_id || '',
      title: editingJob?.title || '',
      description: editingJob?.description || '',
      apply_url: editingJob?.apply_url || '',
      salary_range: editingJob?.salary_range || ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
  
    // Update form data when editingJob changes
    useEffect(() => {
      if (editingJob) {
        setFormData({
          provider_id: editingJob.provider_id || '',
          title: editingJob.title || '',
          description: editingJob.description || '',
          apply_url: editingJob.apply_url || '',
          salary_range: editingJob.salary_range || ''
        })
      } else {
        // Reset form for new job creation
        setFormData({
          provider_id: '',
          title: '',
          description: '',
          apply_url: '',
          salary_range: ''
        })
      }
    }, [editingJob])
  
    // Hide Dock when this modal is open
    useHideDock(true)
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.provider_id || !formData.title || isSubmitting) return
      
      setIsSubmitting(true)
      try {
        await onSave(formData.provider_id, {
          title: formData.title,
          description: formData.description || undefined,
          apply_url: formData.apply_url || undefined,
          salary_range: formData.salary_range || undefined
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  
    return (
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto"
        onClick={onCancel}
      >
        <div 
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingJob ? 'Edit Job Post' : 'Create Job Post'}
              </h2>
              <button
                onClick={onCancel}
                className="text-neutral-500 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
  
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Business Listing Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Business Listing *
                </label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  required
                >
                  <option value="">Select a business listing</option>
                  {listings.map(listing => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name} ({listing.category_key})
                    </option>
                  ))}
                </select>
              </div>
  
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="e.g., Marketing Manager, Sales Associate"
                  required
                />
              </div>
  
              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Job Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </div>
  
              {/* Application URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Application URL
                </label>
                <input
                  type="url"
                  value={formData.apply_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, apply_url: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="https://example.com/apply"
                />
              </div>
  
              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Salary Range
                </label>
                <input
                  type="text"
                  value={formData.salary_range}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="e.g., $50,000 - $70,000, Competitive, Negotiable"
                />
              </div>
  
              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                    isSubmitting 
                      ? 'bg-blue-500 text-white cursor-wait shadow-lg' 
                      : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-md'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{editingJob ? 'Updating Job...' : 'Creating Job...'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{editingJob ? 'Update Job Post' : 'Create Job Post'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className={`px-6 py-3 border rounded-lg font-medium transition-colors ${
                    isSubmitting 
                      ? 'border-neutral-300 text-neutral-400 cursor-not-allowed bg-neutral-50' 
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  /**
   * ==================================================================================
   * 🔹 COMPONENT EXTRACTION MARKER - END: JobPostForm
   * ==================================================================================
   * Copy everything from "START: JobPostForm" (line ~4680) to here (line above)
   * Total: ~240 lines
   * ==================================================================================
   */