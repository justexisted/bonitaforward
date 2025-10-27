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
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.provider_id || !formData.title) return
      
      onSave(formData.provider_id, {
        title: formData.title,
        description: formData.description || undefined,
        apply_url: formData.apply_url || undefined,
        salary_range: formData.salary_range || undefined
      })
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
                  className="flex-1 bg-neutral-900 text-white px-6 py-2 rounded-lg hover:bg-neutral-800"
                >
                  {editingJob ? 'Update Job Post' : 'Create Job Post'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
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