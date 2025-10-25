import React, { useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { isFeaturedProvider } from '../../../utils/helpers'

interface ContactLeadRow {
  id: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at: string
}

interface Provider {
  id: string
  name: string
  category_key: string
  email: string | null
  phone: string | null
  created_at?: string | null | undefined
  is_featured?: boolean | null
  is_member?: boolean | null
  featured_since?: string | null
  subscription_type?: string | null
}

interface ContactLeadsSectionProps {
  contactLeads: ContactLeadRow[]
  providers: Provider[]
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
  onContactLeadsUpdate: (leads: ContactLeadRow[]) => void
  onToggleFeaturedStatus: (providerId: string, currentStatus: boolean) => Promise<void>
  onUpdateSubscriptionType: (providerId: string, subscriptionType: 'monthly' | 'yearly') => Promise<void>
}

type FeaturedProviderFilter = 'all' | 'featured' | 'non-featured'

export const ContactLeadsSection: React.FC<ContactLeadsSectionProps> = ({
  contactLeads,
  providers,
  onMessage,
  onError,
  onContactLeadsUpdate,
  onToggleFeaturedStatus,
  onUpdateSubscriptionType
}) => {
  const [featuredProviderFilter, setFeaturedProviderFilter] = useState<FeaturedProviderFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isProviderListExpanded, setIsProviderListExpanded] = useState(false)
  const [showCount, setShowCount] = useState(20) // Show 20 providers initially
  
  // Edit lead modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState<ContactLeadRow | null>(null)
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDetails, setEditDetails] = useState('')
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLead, setDeletingLead] = useState<ContactLeadRow | null>(null)

  // Get unique categories from providers
  const categories = useMemo(() => {
    const uniqueCategories = new Set(providers.map(p => p.category_key))
    return Array.from(uniqueCategories).sort()
  }, [providers])

  // Memoized filtered and searched providers for performance
  const filteredProviders = useMemo(() => {
    let filtered = providers

    // Featured status filter
    if (featuredProviderFilter === 'featured') {
      filtered = filtered.filter(p => isFeaturedProvider(p))
    } else if (featuredProviderFilter === 'non-featured') {
      filtered = filtered.filter(p => !p.is_featured && !p.is_member)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category_key === categoryFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.category_key.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [providers, featuredProviderFilter, categoryFilter, searchQuery])

  // Displayed providers (limited by showCount)
  const displayedProviders = filteredProviders.slice(0, showCount)

  const handleEditLead = async (row: ContactLeadRow) => {
    setEditingLead(row)
    setEditBusinessName(row.business_name || '')
    setEditEmail(row.contact_email || '')
    setEditDetails(row.details || '')
    setShowEditModal(true)
  }

  const saveEditedLead = async () => {
    if (!editingLead) return
    
    const { error } = await supabase
      .from('contact_leads')
      .update({
        business_name: editBusinessName,
        contact_email: editEmail,
        details: editDetails
      })
      .eq('id', editingLead.id)
    
    if (error) {
      onError(`Failed to update lead: ${error.message}`)
    } else {
      onMessage('Lead updated successfully')
      onContactLeadsUpdate(
        contactLeads.map(l => 
          l.id === editingLead.id 
            ? { ...l, business_name: editBusinessName, contact_email: editEmail, details: editDetails }
            : l
        )
      )
      setShowEditModal(false)
      setEditingLead(null)
    }
  }

  const handleDeleteLead = async (row: ContactLeadRow) => {
    setDeletingLead(row)
    setShowDeleteModal(true)
  }

  const confirmDeleteLead = async () => {
    if (!deletingLead) return
    
    const { error } = await supabase
      .from('contact_leads')
      .delete()
      .eq('id', deletingLead.id)
    
    if (error) {
      onError(`Failed to delete lead: ${error.message}`)
    } else {
      onMessage('Lead deleted successfully')
      onContactLeadsUpdate(contactLeads.filter(l => l.id !== deletingLead.id))
    }
    
    setShowDeleteModal(false)
    setDeletingLead(null)
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Featured Provider Management</div>
      
      {/* Search and Filter Controls */}
      <div className="mt-4 mb-6 space-y-4">
        {/* Search Bar */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Search Providers</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowCount(20) // Reset to show first 20 when searching
              }}
              placeholder="Search by name, email, phone, or category..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setShowCount(20)
              }}
              className="px-3 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Featured Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Status:</label>
            <div className="flex rounded-lg bg-neutral-100 p-1">
              <button
                onClick={() => {
                  setFeaturedProviderFilter('all')
                  setShowCount(20)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  featuredProviderFilter === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFeaturedProviderFilter('featured')
                  setShowCount(20)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  featuredProviderFilter === 'featured'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Featured
              </button>
              <button
                onClick={() => {
                  setFeaturedProviderFilter('non-featured')
                  setShowCount(20)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  featuredProviderFilter === 'non-featured'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Non-Featured
              </button>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || categoryFilter !== 'all' || featuredProviderFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setFeaturedProviderFilter('all')
                setShowCount(20)
              }}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-xs text-neutral-600">
          Showing {displayedProviders.length} of {filteredProviders.length} providers
          {filteredProviders.length !== providers.length && ` (${providers.length} total)`}
        </div>
      </div>

      {/* Contact Leads Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-neutral-700 mb-3">Contact Leads ({contactLeads.length})</h3>
        <div className="space-y-2 text-sm">
        {contactLeads.length === 0 && <div className="text-neutral-500">No leads yet.</div>}
        {contactLeads.map((row) => (
          <div key={row.id} className="rounded-xl border border-neutral-200 p-3 bg-white hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-neutral-900">{row.business_name || 'Unnamed Business'}</div>
              <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              <span className="font-medium">Email:</span> {row.contact_email || 'No email provided'}
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              <span className="font-medium">Details:</span> {row.details || 'No details provided'}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
              {/* Message Button */}
              {row.contact_email && (
                <a
                  href={`mailto:${row.contact_email}?subject=Re: Featured Listing Request - ${row.business_name || 'Your Business'}&body=Hi,

Thank you for reaching out about getting featured on Bonita Forward!

${row.details ? `Regarding your inquiry: "${row.details}"` : ''}

We'd love to discuss how we can help promote your business. Here are our featured listing options:

- Featured Placement: Your business appears at the top of relevant category searches
- Enhanced Profile: Showcase your business with photos, special offers, and more
- Priority Support: Get dedicated assistance with your listing

Would you like to schedule a quick call to discuss the best option for ${row.business_name || 'your business'}?

Best regards,
Bonita Forward Team`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Message
                </a>
              )}
              
              {/* Edit Button */}
              <button
                onClick={() => handleEditLead(row)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              
              {/* Delete Button */}
              <button
                onClick={() => handleDeleteLead(row)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Featured Providers Management - Collapsible */}
      <div>
        <button
          onClick={() => setIsProviderListExpanded(!isProviderListExpanded)}
          className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-neutral-700">
              Provider Management
            </h3>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {filteredProviders.length} found
            </span>
          </div>
          <svg 
            className={`w-5 h-5 text-neutral-500 transition-transform ${isProviderListExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isProviderListExpanded && (
          <div className="mt-3 space-y-3 text-sm">
            {filteredProviders.length === 0 && (
              <div className="text-neutral-500 text-center py-8 bg-neutral-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="font-medium">No providers found</p>
                <p className="text-xs mt-1">Try adjusting your search or filters</p>
              </div>
            )}
            {displayedProviders.map((provider) => (
            <div key={provider.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      provider.is_featured || provider.is_member
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.is_featured || provider.is_member ? 'Featured' : 'Standard'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600">
                    <div><strong>Category:</strong> {provider.category_key}</div>
                    <div><strong>Email:</strong> {provider.email || 'N/A'}</div>
                    <div><strong>Phone:</strong> {provider.phone || 'N/A'}</div>
                    <div><strong>Created:</strong> {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'N/A'}</div>
                    
                    {/* Featured Status Information */}
                    {provider.is_featured || provider.is_member ? (
                      <>
                        <div><strong>Featured Since:</strong> {provider.featured_since ? new Date(provider.featured_since).toLocaleDateString() : 'Unknown'}</div>
                        <div><strong>Subscription:</strong> {provider.subscription_type || 'Not set'}</div>
                      </>
                    ) : null}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  {/* Featured Status Toggle */}
                  <button
                    onClick={() => onToggleFeaturedStatus(provider.id, !!(provider.is_featured || provider.is_member))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      provider.is_featured || provider.is_member
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {provider.is_featured || provider.is_member ? 'Remove Featured' : 'Make Featured'}
                  </button>
                  
                  {/* Subscription Type Selector (only for featured providers) */}
                  {(provider.is_featured || provider.is_member) && (
                    <select
                      value={provider.subscription_type || ''}
                      onChange={(e) => {
                        const value = e.target.value as 'monthly' | 'yearly'
                        if (value) onUpdateSubscriptionType(provider.id, value)
                      }}
                      className="px-2 py-1 text-xs border border-neutral-300 rounded-md bg-white"
                    >
                      <option value="">Set Plan</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}

            {/* Show More Button */}
            {displayedProviders.length < filteredProviders.length && (
              <div className="text-center py-4">
                <button
                  onClick={() => setShowCount(prev => prev + 20)}
                  className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Show More ({filteredProviders.length - displayedProviders.length} remaining)
                </button>
              </div>
            )}

            {/* Show All Button (when filtered) */}
            {filteredProviders.length > 20 && displayedProviders.length >= 20 && displayedProviders.length < filteredProviders.length && (
              <div className="text-center">
                <button
                  onClick={() => setShowCount(filteredProviders.length)}
                  className="px-4 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  Show All {filteredProviders.length}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Edit Contact Lead</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Details
                </label>
                <textarea
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={saveEditedLead}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingLead(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Delete Contact Lead</h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to delete the lead from <span className="font-medium">"{deletingLead.business_name || 'Unnamed Business'}"</span>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteLead}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Lead
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingLead(null)
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

