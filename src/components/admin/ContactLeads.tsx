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

export default function ContactLeads({ 
  contactLeads, 
  setContactLeads,
  setMessage,
  setError 
}: ContactLeadsProps) {
  
  /**
   * Handle editing a contact lead
   */
  const handleEditLead = (lead: ContactLeadRow) => {
    const newBusinessName = prompt('Business Name:', lead.business_name || '')
    const newEmail = prompt('Contact Email:', lead.contact_email || '')
    const newDetails = prompt('Details:', lead.details || '')
    
    if (newBusinessName !== null && newEmail !== null && newDetails !== null) {
      supabase
        .from('contact_leads')
        .update({
          business_name: newBusinessName,
          contact_email: newEmail,
          details: newDetails
        })
        .eq('id', lead.id)
        .then(({ error }) => {
          if (error) {
            setError(`Failed to update lead: ${error.message}`)
          } else {
            setMessage('Lead updated successfully')
            setContactLeads(contactLeads.map(l => 
              l.id === lead.id 
                ? { ...l, business_name: newBusinessName, contact_email: newEmail, details: newDetails }
                : l
            ))
          }
        })
    }
  }

  /**
   * Handle deleting a contact lead
   */
  const handleDeleteLead = async (lead: ContactLeadRow) => {
    if (!confirm(`Delete lead from "${lead.business_name || 'Unnamed Business'}"? This action cannot be undone.`)) {
      return
    }
    
    const { error } = await supabase
      .from('contact_leads')
      .delete()
      .eq('id', lead.id)
    
    if (error) {
      setError(`Failed to delete lead: ${error.message}`)
    } else {
      setMessage('Lead deleted successfully')
      setContactLeads(contactLeads.filter(l => l.id !== lead.id))
    }
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
    </div>
  )
}

