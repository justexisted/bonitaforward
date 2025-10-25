/**
 * CONTACT LEADS ADMIN COMPONENT
 * 
 * Manages contact leads and featured listing requests from potential customers.
 * Allows admin to view, message, edit, and delete leads.
 */

import { supabase } from '../../lib/supabase'
import type { ContactLeadRow } from '../../types/admin'
import { formatAdminDate } from '../../utils/adminHelpers'

interface ContactLeadsProps {
  contactLeads: ContactLeadRow[]
  setContactLeads: (leads: ContactLeadRow[]) => void
  setMessage: (message: string) => void
  setError: (error: string) => void
}

import { useState } from 'react'

export default function ContactLeads({ 
  contactLeads, 
  setContactLeads,
  setMessage,
  setError 
}: ContactLeadsProps) {
  // Edit lead modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState<ContactLeadRow | null>(null)
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDetails, setEditDetails] = useState('')
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLead, setDeletingLead] = useState<ContactLeadRow | null>(null)
  
  /**
   * Handle editing a contact lead
   */
  const handleEditLead = (lead: ContactLeadRow) => {
    setEditingLead(lead)
    setEditBusinessName(lead.business_name || '')
    setEditEmail(lead.contact_email || '')
    setEditDetails(lead.details || '')
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
      setError(`Failed to update lead: ${error.message}`)
    } else {
      setMessage('Lead updated successfully')
      setContactLeads(contactLeads.map(l => 
        l.id === editingLead.id 
          ? { ...l, business_name: editBusinessName, contact_email: editEmail, details: editDetails }
          : l
      ))
      setShowEditModal(false)
      setEditingLead(null)
    }
  }

  /**
   * Handle deleting a contact lead
   */
  const handleDeleteLead = async (lead: ContactLeadRow) => {
    setDeletingLead(lead)
    setShowDeleteModal(true)
  }

  const confirmDeleteLead = async () => {
    if (!deletingLead) return
    
    const { error } = await supabase
      .from('contact_leads')
      .delete()
      .eq('id', deletingLead.id)
    
    if (error) {
      setError(`Failed to delete lead: ${error.message}`)
    } else {
      setMessage('Lead deleted successfully')
      setContactLeads(contactLeads.filter(l => l.id !== deletingLead.id))
    }
    
    setShowDeleteModal(false)
    setDeletingLead(null)
  }

  /**
   * Generate mailto link with pre-filled template
   */
  const getMailtoLink = (lead: ContactLeadRow): string => {
    const subject = `Re: Featured Listing Request - ${lead.business_name || 'Your Business'}`
    const body = `Hi,

Thank you for reaching out about getting featured on Bonita Forward!

${lead.details ? `Regarding your inquiry: "${lead.details}"` : ''}

We'd love to discuss how we can help promote your business. Here are our featured listing options:

- Featured Placement: Your business appears at the top of relevant category searches
- Enhanced Profile: Showcase your business with photos, special offers, and more
- Priority Support: Get dedicated assistance with your listing

Would you like to schedule a quick call to discuss the best option for ${lead.business_name || 'your business'}?

Best regards,
Bonita Forward Team`

    return `mailto:${lead.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-neutral-700 mb-3">
        Contact Leads ({contactLeads.length})
      </h3>
      
      <div className="space-y-2 text-sm">
        {contactLeads.length === 0 && (
          <div className="text-neutral-500 text-center py-4">
            No leads yet.
          </div>
        )}
        
        {contactLeads.map((lead) => (
          <div 
            key={lead.id} 
            className="rounded-xl border border-neutral-200 p-3 bg-white hover:border-blue-300 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-neutral-900">
                {lead.business_name || 'Unnamed Business'}
              </div>
              <div className="text-xs text-neutral-500">
                {formatAdminDate(lead.created_at)}
              </div>
            </div>
            
            {/* Email */}
            <div className="text-xs text-neutral-600 mt-1">
              <span className="font-medium">Email:</span> {lead.contact_email || 'No email provided'}
            </div>
            
            {/* Details */}
            <div className="text-xs text-neutral-600 mt-1">
              <span className="font-medium">Details:</span> {lead.details || 'No details provided'}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
              {/* Message Button */}
              {lead.contact_email && (
                <a
                  href={getMailtoLink(lead)}
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
                onClick={() => handleEditLead(lead)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              
              {/* Delete Button */}
              <button
                onClick={() => handleDeleteLead(lead)}
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

