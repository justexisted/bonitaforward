// Admin service functions - extracted API operations from Admin.tsx

import { supabase } from '../lib/supabase'
import { query, insert, update, deleteRows } from '../lib/supabaseQuery'
import type { 
  ProviderRow, 
  BusinessApplicationRow, 
  ContactLeadRow, 
  ProfileRow,
  ProviderJobPostWithDetails,
  ProviderChangeRequestWithDetails 
} from '../types/admin'

// Provider operations
export const providerService = {
  async loadProviders(): Promise<ProviderRow[]> {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async saveProvider(provider: ProviderRow): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .upsert([provider])
    
    if (error) throw error
  },

  async deleteProvider(providerId: string): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', providerId)
    
    if (error) throw error
  },

  async toggleFeaturedStatus(providerId: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .update({ 
        is_featured: !currentStatus,
        featured_since: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', providerId)
    
    if (error) throw error
  },

  async updateSubscriptionType(providerId: string, subscriptionType: 'monthly' | 'yearly'): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .update({ subscription_type: subscriptionType })
      .eq('id', providerId)
    
    if (error) throw error
  },

  async toggleBookingEnabled(providerId: string, currentlyEnabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .update({ booking_enabled: !currentlyEnabled })
      .eq('id', providerId)
    
    if (error) throw error
  }
}

// Business applications operations
// CRITICAL: Use centralized query utility for RLS compliance and error handling
export const businessApplicationService = {
  async loadApplications(): Promise<BusinessApplicationRow[]> {
    const result = await query('business_applications', { logPrefix: '[AdminService]' })
      .select('*')
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      console.error('[AdminService] ❌ Error loading applications:', result.error)
      throw result.error
    }
    return result.data || []
  },

  async approveApplication(appId: string): Promise<void> {
    const result = await update('business_applications', { status: 'approved' }, { id: appId }, { logPrefix: '[AdminService]' })
    
    if (result.error) {
      console.error('[AdminService] ❌ Error approving application:', result.error)
      throw result.error
    }
  },

  async deleteApplication(appId: string): Promise<void> {
    const result = await deleteRows('business_applications', { id: appId }, { logPrefix: '[AdminService]' })
    
    if (result.error) {
      console.error('[AdminService] ❌ Error deleting application:', result.error)
      throw result.error
    }
  }
}

// Contact leads operations
export const contactLeadService = {
  async loadContactLeads(): Promise<ContactLeadRow[]> {
    const { data, error } = await supabase
      .from('contact_leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// User operations
export const userService = {
  async loadProfiles(): Promise<ProfileRow[]> {
    // Use Netlify function to bypass RLS
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-profiles` : '/.netlify/functions/admin-list-profiles'
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load profiles: ${response.status}`)
    }

    const result = await response.json()
    return result.profiles || []
  },

  async deleteUser(userId: string): Promise<void> {
    // Use Netlify function for secure deletion
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = fnBase ? `${fnBase}/.netlify/functions/admin-delete-user` : '/.netlify/functions/admin-delete-user'
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`)
    }
  },

  async deleteCustomerUser(email: string): Promise<void> {
    // Use Netlify function for secure deletion
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = fnBase ? `${fnBase}/.netlify/functions/admin-delete-user` : '/.netlify/functions/admin-delete-user'
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      throw new Error(`Failed to delete customer: ${response.status}`)
    }
  }
}

// Change request operations
export const changeRequestService = {
  async loadChangeRequests(): Promise<ProviderChangeRequestWithDetails[]> {
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-change-requests` : '/.netlify/functions/admin-list-change-requests'
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load change requests: ${response.status}`)
    }

    const result = await response.json()
    return result.requests || []
  },

  async approveChangeRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_change_requests')
      .update({ 
        status: 'approved',
        decided_at: new Date().toISOString()
      })
      .eq('id', requestId)
    
    if (error) throw error
  },

  async rejectChangeRequest(requestId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('provider_change_requests')
      .update({ 
        status: 'rejected',
        decided_at: new Date().toISOString(),
        reason: reason || null
      })
      .eq('id', requestId)
    
    if (error) throw error
  }
}

// Job post operations
export const jobPostService = {
  async loadJobPosts(): Promise<ProviderJobPostWithDetails[]> {
    const isLocal = window.location.hostname === 'localhost'
    const fnBase = isLocal ? 'http://localhost:8888' : ''
    const url = fnBase ? `${fnBase}/.netlify/functions/admin-list-job-posts` : '/.netlify/functions/admin-list-job-posts'
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load job posts: ${response.status}`)
    }

    const result = await response.json()
    return result.jobPosts || []
  },

  async approveJobPost(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_job_posts')
      .update({ 
        status: 'approved', 
        decided_at: new Date().toISOString() 
      })
      .eq('id', jobId)
    
    if (error) throw error
  },

  async rejectJobPost(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_job_posts')
      .update({ 
        status: 'rejected', 
        decided_at: new Date().toISOString() 
      })
      .eq('id', jobId)
    
    if (error) throw error
  },

  async deleteJobPost(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_job_posts')
      .delete()
      .eq('id', jobId)
    
    if (error) throw error
  }
}

// Notification service
export const notificationService = {
  async notifyUser(userId: string | null | undefined, subject: string, body?: string, data?: any): Promise<void> {
    if (!userId) return

    const { error } = await supabase
      .from('user_notifications')
      .insert([{
        user_id: userId,
        subject,
        body: body || '',
        data: data ? JSON.stringify(data) : null,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to send notification:', error)
      // Don't throw - notifications are not critical
    }
  }
}
