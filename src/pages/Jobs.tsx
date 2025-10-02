/**
 * JOBS PAGE
 * 
 * This page displays all approved job postings from businesses in the community.
 * It provides a clean, professional interface for job seekers to browse and apply for positions.
 * 
 * Features:
 * - Display all approved job postings
 * - Search and filter functionality
 * - Professional job cards with company information
 * - Direct application links
 * - Mobile-responsive design
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

// Type definition for job posts with provider information
type JobPostWithProvider = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description: string | null
  apply_url: string | null
  salary_range: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  decided_at: string | null
  // Provider information
  provider: {
    id: string
    name: string
    category_key: string
    address: string | null
    phone: string | null
    email: string | null
    website: string | null
    images: string[] | null
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPostWithProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredJobs, setFilteredJobs] = useState<JobPostWithProvider[]>([])

  // Load all job postings
  const loadJobs = async () => {
    try {
      setLoading(true)
      
      // Get all approved and pending jobs first
      const { data: allJobs, error: allJobsError } = await supabase
        .from('provider_job_posts')
        .select('*')
        .in('status', ['approved', 'pending'])
        .order('created_at', { ascending: false })

      if (allJobsError) {
        console.error('[Jobs] Error loading jobs:', allJobsError)
        throw allJobsError
      }

      if (!allJobs || allJobs.length === 0) {
        setJobs([])
        return
      }

      // Now get provider data for these jobs
      const providerIds = [...new Set(allJobs.map(job => job.provider_id))]

      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('id, name, category_key, address, phone, email, website, images')
        .in('id', providerIds)

      // Manually join the data
      const jobs = allJobs.map(job => {
        const provider = providersData?.find(p => p.id === job.provider_id)
        return {
          ...job,
          provider: provider || {
            id: job.provider_id,
            name: `Company (ID: ${job.provider_id})`,
            category_key: 'unknown',
            address: null,
            phone: null,
            email: null,
            website: null,
            images: null
          }
        }
      }) as JobPostWithProvider[]
      
      setJobs(jobs)
      
      // If we still have no jobs, try a fallback approach
      if (jobs.length === 0 && allJobs && allJobs.length > 0) {
        const fallbackJobs = allJobs.map(job => ({
          ...job,
          provider: {
            id: job.provider_id,
            name: `Business (ID: ${job.provider_id})`,
            category_key: 'business',
            address: null,
            phone: null,
            email: null,
            website: null,
            images: null
          }
        })) as JobPostWithProvider[]
        setJobs(fallbackJobs)
      }
    } catch (error: any) {
      console.error('[Jobs] Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter jobs based on search term and category
  useEffect(() => {
    let filtered = jobs

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.provider.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(job => job.provider.category_key === selectedCategory)
    }

    setFilteredJobs(filtered)
  }, [jobs, searchTerm, selectedCategory])

  // Get unique categories for filter
  const categories = Array.from(new Set(jobs.map(job => job.provider.category_key)))

  useEffect(() => {
    loadJobs()
  }, [])

  if (loading) {
    return (
      <section className="py-8">
        <div className="container-px mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/3 mb-6"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-neutral-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Job Opportunities</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-4">
            Discover exciting career opportunities with local businesses in our community
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-3xl mx-auto">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Note:</span> Jobs marked with "⏳ Pending Review" are awaiting admin approval and will be fully visible once approved. 
              Approved jobs are marked with "✓ Approved".
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs, companies, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory !== 'all' && ` in ${selectedCategory.replace('_', ' ')}`}
          </span>
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>

        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Jobs Found</h3>
            <p className="text-neutral-600 mb-6">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search criteria or filters'
                : 'No job postings are currently available. Check back soon!'
              }
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Call to Action for Businesses */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-semibold text-neutral-900 mb-4">Are you a business owner?</h3>
          <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
            Post your job openings and reach qualified local candidates. Join our community of businesses and start hiring today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/my-business"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Job
            </Link>
            <Link
              to="/business"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Job Card Component
function JobCard({ job }: { job: JobPostWithProvider }) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const truncateDescription = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Company Info */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
            {job.provider.images && job.provider.images.length > 0 ? (
              <img
                src={job.provider.images[0]}
                alt={job.provider.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">{job.title}</h3>
              <div className="flex items-center gap-4 text-sm text-neutral-600 mb-2">
                <span className="font-medium">{job.provider.name}</span>
                <span className="px-2 py-1 bg-neutral-100 rounded-full text-xs">
                  {job.provider.category_key.charAt(0).toUpperCase() + job.provider.category_key.slice(1).replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  job.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : job.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {job.status === 'approved' ? '✓ Approved' : job.status === 'pending' ? '⏳ Pending Review' : job.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-500">
                <span>Posted {formatDate(job.created_at)}</span>
                {job.salary_range && (
                  <span className="text-green-600 font-medium">{job.salary_range}</span>
                )}
              </div>
            </div>
          </div>

          {/* Job Description */}
          {job.description && (
            <div className="mb-4">
              <p className="text-neutral-700 leading-relaxed">
                {showFullDescription ? job.description : truncateDescription(job.description)}
              </p>
              {job.description.length > 200 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                >
                  {showFullDescription ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Company Details */}
          <div className="flex flex-wrap gap-4 text-sm text-neutral-600 mb-6">
            {job.provider.address && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{job.provider.address}</span>
              </div>
            )}
            {job.provider.phone && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{job.provider.phone}</span>
              </div>
            )}
            {job.provider.website && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <a href={job.provider.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Website
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {job.apply_url ? (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Apply Now
              </a>
            ) : (
              <div className="inline-flex items-center justify-center px-6 py-3 bg-neutral-100 text-neutral-500 font-medium rounded-lg cursor-not-allowed">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Company
              </div>
            )}
            
            <Link
              to={`/provider/${job.provider.id}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              View Company
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

