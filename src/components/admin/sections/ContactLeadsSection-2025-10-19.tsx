import React, { useState } from 'react'
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

  const filteredProviders = providers.filter(p => {
    if (featuredProviderFilter === 'featured') {
      return isFeaturedProvider(p)
    } else if (featuredProviderFilter === 'non-featured') {
      return !p.is_featured && !p.is_member
    }
    return true
  })

  const handleEditLead = async (row: ContactLeadRow) => {
    const newBusinessName = prompt('Business Name:', row.business_name || '')
    const newEmail = prompt('Contact Email:', row.contact_email || '')
    const newDetails = prompt('Details:', row.details || '')
    
    if (newBusinessName !== null && newEmail !== null && newDetails !== null) {
      const { error } = await supabase
        .from('contact_leads')
        .update({
          business_name: newBusinessName,
          contact_email: newEmail,
          details: newDetails
        })
        .eq('id', row.id)
      
      if (error) {
        onError(`Failed to update lead: ${error.message}`)
      } else {
        onMessage('Lead updated successfully')
        onContactLeadsUpdate(
          contactLeads.map(l => 
            l.id === row.id 
              ? { ...l, business_name: newBusinessName, contact_email: newEmail, details: newDetails }
              : l
          )
        )
      }
    }
  }

  const handleDeleteLead = async (row: ContactLeadRow) => {
    if (!confirm(`Delete lead from "${row.business_name || 'Unnamed Business'}"? This action cannot be undone.`)) return
    
    const { error } = await supabase
      .from('contact_leads')
      .delete()
      .eq('id', row.id)
    
    if (error) {
      onError(`Failed to delete lead: ${error.message}`)
    } else {
      onMessage('Lead deleted successfully')
      onContactLeadsUpdate(contactLeads.filter(l => l.id !== row.id))
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Featured Provider Management</div>
      
      {/* Featured Provider Filter Toggle */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-neutral-700">Filter Providers:</label>
          <div className="flex rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setFeaturedProviderFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                featuredProviderFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({providers.length})
            </button>
            <button
              onClick={() => setFeaturedProviderFilter('featured')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                featuredProviderFilter === 'featured'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Featured ({providers.filter(p => isFeaturedProvider(p)).length})
            </button>
            <button
              onClick={() => setFeaturedProviderFilter('non-featured')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                featuredProviderFilter === 'non-featured'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Non-Featured ({providers.filter(p => !p.is_featured && !p.is_member).length})
            </button>
          </div>
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

      {/* Featured Providers Management */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 mb-3">
          Provider Management ({filteredProviders.length} {featuredProviderFilter === 'all' ? 'total' : featuredProviderFilter})
        </h3>
        <div className="space-y-3 text-sm">
          {filteredProviders.length === 0 && (
            <div className="text-neutral-500 text-center py-4">
              No {featuredProviderFilter === 'all' ? '' : featuredProviderFilter} providers found.
            </div>
          )}
          {filteredProviders.map((provider) => (
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
        </div>
      </div>
    </div>
  )
}

