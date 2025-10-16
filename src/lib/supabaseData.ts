import { supabase } from './supabase'

export type DbProvider = {
  id: string
  name: string
  category_key: string // FIXED: Real database uses 'category_key' not 'category'
  tags?: string[] | null
  rating?: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  images?: string[] | null
  badges?: string[] | null
  // Enhanced business management fields
  description?: string | null
  specialties?: string[] | null
  social_links?: Record<string, string> | null
  business_hours?: Record<string, string> | null
  service_areas?: string[] | null
  google_maps_url?: string | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  owner_user_id?: string | null
  bonita_resident_discount?: string | null
  // Membership/featured columns (optional in DB)
  is_member?: boolean | number | string | null
  member?: boolean | number | string | null
  is_featured?: boolean | number | string | null
  featured?: boolean | number | string | null
  // REMOVED: paid, plan, tier - These columns don't exist in the real database
  // Using existing subscription_type, is_member, is_featured fields instead
  featured_since?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
  // Booking system fields
  booking_enabled?: boolean | null
  booking_type?: 'appointment' | 'reservation' | 'consultation' | 'walk-in' | null
  booking_instructions?: string | null
  booking_url?: string | null
  // Contact method toggles
  enable_calendar_booking?: boolean | null
  enable_call_contact?: boolean | null
  enable_email_contact?: boolean | null
  // Coupon fields
  coupon_code?: string | null
  coupon_discount?: string | null
  coupon_description?: string | null
  coupon_expires_at?: string | null
}

// Helper function to fix image URLs if they're relative paths
function fixImageUrls(images: string[] | null): string[] | null {
  if (!images || !Array.isArray(images)) return null
  
  return images.map(img => {
    if (!img || typeof img !== 'string') return img
    
    // If it's already a full URL, return as-is
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img
    }
    
    // If it's a Supabase storage path, convert to public URL
    if (img.startsWith('business-images/') || img.startsWith('blog-images/')) {
      const { data } = supabase.storage.from('business-images').getPublicUrl(img)
      return data.publicUrl
    }
    
    // If it's a relative path, assume it's in business-images bucket
    if (img.startsWith('/') || !img.includes('/')) {
      const { data } = supabase.storage.from('business-images').getPublicUrl(img)
      return data.publicUrl
    }
    
    // Return as-is if we can't determine the format
    return img
  }).filter(Boolean)
}

export async function fetchProvidersFromSupabase(): Promise<DbProvider[]> {
  try {
    // First, let's get all providers to see what we're working with
    const { data: allData, error: allError } = await supabase
      .from('providers')
      .select('*')
      .limit(1000)
    
    if (allError) {
      console.warn('[Supabase] providers select error', allError)
      return []
    }

    const allRows = (allData || []) as DbProvider[]
    console.log(`[Supabase] Fetched ${allRows.length} providers from database (limit: 1000)`)
    
    // Warn if we hit the limit
    if (allRows.length === 1000) {
      console.warn(`[Supabase] WARNING: Hit 1000 record limit! You may have more providers that weren't fetched.`)
    }

    // Filter for published providers (handle both boolean true and string 'true')
    // Also include providers where published is null/undefined (treat as published)
    const publishedRows = allRows.filter((r) => {
      const publishedValue = r.published
      const isPublished = publishedValue === true || 
                         (typeof publishedValue === 'string' && publishedValue === 'true') ||
                         (typeof publishedValue === 'number' && publishedValue === 1) ||
                         publishedValue === null ||
                         publishedValue === undefined
      return isPublished
    })

    console.log(`[Supabase] Published providers: ${publishedRows.length}`)

    // Exclude soft-deleted providers and providers without valid category_key
    const filtered = publishedRows.filter((r) => {
      // Must have valid category_key
      const hasValidCategory = r.category_key && typeof r.category_key === 'string' && r.category_key.trim().length > 0
      if (!hasValidCategory) {
        console.log(`[Supabase] Excluding provider without category_key: ${r.name} (category_key: "${r.category_key}")`)
        return false
      }
      
      // Exclude deleted providers
      const isNotDeleted = !Array.isArray(r.badges) || !r.badges?.includes('deleted')
      return isNotDeleted
    })
    
    console.log(`[Supabase] Final filtered providers: ${filtered.length}`)
    
    // Log category breakdown
    const categoryBreakdown: Record<string, number> = {}
    filtered.forEach(r => {
      const cat = r.category_key || 'unknown'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })
    console.log('[Supabase] Category breakdown:', categoryBreakdown)
    
    // Debug: Show all unique category_key values to identify any issues
    const uniqueCategories = [...new Set(filtered.map(r => r.category_key).filter(Boolean))]
    console.log('[Supabase] Unique category_key values:', uniqueCategories)
    
    // Debug: Show health-wellness specifically
    const healthWellnessCount = filtered.filter(r => r.category_key === 'health-wellness').length
    console.log(`[Supabase] Health-wellness providers found: ${healthWellnessCount}`)
    
    // Debug: Show any providers with "health" in category_key
    const healthRelated = filtered.filter(r => 
      r.category_key && r.category_key.toLowerCase().includes('health')
    )
    console.log(`[Supabase] Providers with "health" in category_key: ${healthRelated.length}`)
    if (healthRelated.length > 0) {
      console.log('[Supabase] Health-related category_keys:', [...new Set(healthRelated.map(r => r.category_key))])
    }
    
    // Debug: Analyze health-wellness provider tags to understand what types exist
    const healthWellnessProviders = filtered.filter(r => r.category_key === 'health-wellness')
    if (healthWellnessProviders.length > 0) {
      console.log(`[Supabase] Analyzing ${healthWellnessProviders.length} health-wellness providers...`)
      
      // Collect all unique tags from health-wellness providers
      const allTags = new Set<string>()
      const providerTagMap = new Map<string, string[]>()
      
      healthWellnessProviders.forEach(provider => {
        const tags = provider.tags || []
        tags.forEach(tag => allTags.add(tag.toLowerCase()))
        providerTagMap.set(provider.name, tags.map(t => t.toLowerCase()))
      })
      
      console.log('[Supabase] All health-wellness tags:', Array.from(allTags).sort())
      
      // Show sample providers and their tags
      console.log('[Supabase] Sample health-wellness providers:')
      healthWellnessProviders.slice(0, 10).forEach(p => {
        console.log(`  ${p.name}: [${(p.tags || []).join(', ')}]`)
      })
      
      // Identify common provider types based on tags
      const providerTypes = new Map<string, number>()
      allTags.forEach(tag => {
        let type = 'other'
        if (tag.includes('dental') || tag.includes('dentist')) type = 'dental'
        else if (tag.includes('chiropractor') || tag.includes('chiro')) type = 'chiropractor'
        else if (tag.includes('gym') || tag.includes('fitness') || tag.includes('24 hour')) type = 'gym'
        else if (tag.includes('salon') || tag.includes('hair') || tag.includes('beauty')) type = 'salon'
        else if (tag.includes('spa') || tag.includes('medspa') || tag.includes('massage')) type = 'spa'
        else if (tag.includes('medical') || tag.includes('doctor') || tag.includes('physician')) type = 'medical'
        else if (tag.includes('therapy') || tag.includes('therapist') || tag.includes('physical therapy')) type = 'therapy'
        else if (tag.includes('naturopath') || tag.includes('naturopathic')) type = 'naturopathic'
        else if (tag.includes('mental') || tag.includes('psychology') || tag.includes('counseling')) type = 'mental health'
        else if (tag.includes('optometry') || tag.includes('vision') || tag.includes('eye')) type = 'vision'
        
        providerTypes.set(type, (providerTypes.get(type) || 0) + 1)
      })
      
      console.log('[Supabase] Provider types found:', Object.fromEntries(providerTypes))
    }
    
    // Fix image URLs for all providers
    const providersWithFixedImages = filtered.map(provider => ({
      ...provider,
      images: fixImageUrls(provider.images || null)
    }))
    
    // NO AUTOMATIC CATEGORY CORRECTION - providers stay in their actual category_key
    return providersWithFixedImages
  } catch (err) {
    console.warn('[Supabase] providers select failed', err)
    return []
  }
}

export type BlogPost = {
  id: string
  category_key: string // NOTE: Blog posts table uses category_key, providers table uses category
  title: string
  content: string
  images?: string[] | null
  created_at: string
  updated_at?: string | null
}

export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,category_key,title,content,images,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.warn('[Supabase] blog_posts select error', error)
      return []
    }
    return (data || []) as BlogPost[]
  } catch (err) {
    console.warn('[Supabase] blog_posts select failed', err)
    return []
  }
}

export async function fetchLatestBlogPostByCategory(category_key: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,category_key,title,content,images,created_at,updated_at')
      .eq('category_key', category_key)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) {
      console.warn('[Supabase] blog_posts select by category error', error)
      return null
    }
    return (data && data[0]) || null
  } catch (err) {
    console.warn('[Supabase] blog_posts select by category failed', err)
    return null
  }
}

export async function uploadBlogImage(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `blog-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('blog-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (err) {
    console.error('Error uploading blog image:', err)
    return null
  }
}

export async function deleteBlogImage(imageUrl: string): Promise<{ error?: string }> {
  try {
    // Extract the file path from the URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/blog-images/[filename]
    const urlParts = imageUrl.split('/blog-images/')
    if (urlParts.length !== 2) {
      return { error: 'Invalid image URL format' }
    }
    
    const fileName = urlParts[1]
    const filePath = `blog-images/${fileName}`

    const { error } = await supabase.storage
      .from('blog-images')
      .remove([filePath])

    if (error) {
      console.error('Error deleting blog image:', error)
      return { error: error.message }
    }

    return {}
  } catch (err: any) {
    console.error('Error deleting blog image:', err)
    return { error: err.message || 'Failed to delete image' }
  }
}

export async function fetchBlogPostsByCategory(category_key: string): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,category_key,title,content,created_at,updated_at')
      .eq('category_key', category_key)
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('[Supabase] blog_posts select by category (all) error', error)
      return []
    }
    return (data || []) as BlogPost[]
  } catch (err) {
    console.warn('[Supabase] blog_posts select by category (all) failed', err)
    return []
  }
}

export async function upsertBlogPost(post: Partial<BlogPost>): Promise<{ error?: string }> {
  try {
    const payload: any = {
      id: post.id,
      category_key: post.category_key,
      title: post.title,
      content: post.content,
    }
    const { error } = await supabase.from('blog_posts').upsert(payload, { onConflict: 'id' })
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to save blog post' }
  }
}

export async function deleteBlogPost(id: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete blog post' }
  }
}

// Business owner change request workflow
export type ProviderChangeRequest = {
  id: string
  provider_id: string
  owner_user_id: string
  type: 'update' | 'delete' | 'feature_request' | 'claim'
  changes: Record<string, any> | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason: string | null
  created_at: string
  decided_at?: string | null
}

export async function createProviderChangeRequest(payload: Omit<ProviderChangeRequest, 'id' | 'status' | 'created_at' | 'decided_at'> & { status?: ProviderChangeRequest['status'] }): Promise<{ error?: string; id?: string }> {
  try {
    const insertPayload: any = {
      provider_id: payload.provider_id,
      owner_user_id: payload.owner_user_id,
      type: payload.type,
      changes: payload.changes || {},
      status: payload.status || 'pending',
      reason: payload.reason || null,
    }
    const { data, error } = await supabase.from('provider_change_requests').insert([insertPayload]).select('id').single()
    if (error) return { error: error.message }
    return { id: (data as any)?.id as string }
  } catch (err: any) {
    return { error: err?.message || 'Failed to submit change request' }
  }
}

export async function listOwnerChangeRequests(owner_user_id: string): Promise<ProviderChangeRequest[]> {
  try {
    const { data, error } = await supabase
      .from('provider_change_requests')
      .select('*')
      .eq('owner_user_id', owner_user_id)
      .order('created_at', { ascending: false })
    if (error) return []
    return (data || []) as ProviderChangeRequest[]
  } catch {
    return []
  }
}

// Job posts
export type ProviderJobPost = {
  id: string
  provider_id: string
  owner_user_id: string
  title: string
  description: string | null
  apply_url: string | null
  salary_range: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  decided_at?: string | null
}

export async function createJobPost(payload: Omit<ProviderJobPost, 'id' | 'status' | 'created_at' | 'decided_at'> & { status?: ProviderJobPost['status'] }): Promise<{ error?: string; id?: string }> {
  try {
    const insertPayload: any = {
      provider_id: payload.provider_id,
      owner_user_id: payload.owner_user_id,
      title: payload.title,
      description: payload.description || null,
      apply_url: payload.apply_url || null,
      salary_range: payload.salary_range || null,
      status: payload.status || 'pending',
    }
    const { data, error } = await supabase.from('provider_job_posts').insert([insertPayload]).select('id').single()
    if (error) return { error: error.message }
    return { id: (data as any)?.id as string }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create job post' }
  }
}

export async function listJobPostsByProvider(provider_id: string): Promise<ProviderJobPost[]> {
  try {
    const { data, error } = await supabase
      .from('provider_job_posts')
      .select('*')
      .eq('provider_id', provider_id)
      .in('status', ['approved'])
      .order('created_at', { ascending: false })
    if (error) return []
    return (data || []) as ProviderJobPost[]
  } catch {
    return []
  }
}

// Notifications
export type UserNotification = {
  id: string
  user_id: string
  subject: string
  body: string | null
  data: Record<string, any> | null
  // SCHEMA MISMATCH:
  // Option A: Use boolean read field (matches schema)
  read?: boolean | null
  created_at: string
}

export async function listUserNotifications(user_id: string): Promise<UserNotification[]> {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return []
    return (data || []) as UserNotification[]
  } catch {
    return []
  }
}

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('user_notifications').update({ read_at: new Date().toISOString() as any }).eq('id', id)
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to mark as read' }
  }
}

// Notification dismissal tracking
export type DismissedNotification = {
  id: string
  user_id: string
  notification_type: 'pending' | 'approved' | 'rejected'
  dismissed_at: string
  last_activity_timestamp: string
  created_at: string
}

export async function dismissNotification(
  user_id: string, 
  notification_type: 'pending' | 'approved' | 'rejected', 
  last_activity_timestamp: string
): Promise<{ error?: string }> {
  try {
    const payload = {
      user_id,
      notification_type,
      last_activity_timestamp,
      dismissed_at: new Date().toISOString()
    }
    
    // Use upsert to update existing dismissal or create new one
    const { error } = await supabase
      .from('dismissed_notifications')
      .upsert(payload, { 
        onConflict: 'user_id,notification_type',
        ignoreDuplicates: false 
      })
    
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to dismiss notification' }
  }
}

export async function getDismissedNotifications(user_id: string): Promise<DismissedNotification[]> {
  try {
    const { data, error } = await supabase
      .from('dismissed_notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    
    if (error) return []
    return (data || []) as DismissedNotification[]
  } catch {
    return []
  }
}

export async function getLatestActivityTimestamp(
  user_id: string, 
  notification_type: 'pending' | 'approved' | 'rejected'
): Promise<string | null> {
  try {
    let query = supabase.from('provider_change_requests').select('created_at,decided_at')
    
    if (notification_type === 'pending') {
      query = query.eq('owner_user_id', user_id).eq('status', 'pending')
    } else if (notification_type === 'approved') {
      query = query.eq('owner_user_id', user_id).eq('status', 'approved').not('decided_at', 'is', null)
    } else if (notification_type === 'rejected') {
      query = query.eq('owner_user_id', user_id).eq('status', 'rejected').not('decided_at', 'is', null)
    }
    
    const { data, error } = await query
      .order(notification_type === 'pending' ? 'created_at' : 'decided_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) return null
    
    // For pending requests, use created_at. For approved/rejected, use decided_at
    const timestamp = notification_type === 'pending' ? data.created_at : data.decided_at
    return timestamp
  } catch {
    return null
  }
}

// Contact lead type
export type ContactLead = {
  id?: string
  business_name: string | null
  contact_email: string | null
  details: string | null
  created_at?: string
}

// Create a new contact lead
export async function createContactLead(contactData: Omit<ContactLead, 'id' | 'created_at'>): Promise<ContactLead> {
  const { data, error } = await supabase
    .from('contact_leads')
    .insert([contactData])
    .select()
    .single()

  if (error) {
    console.error('Error creating contact lead:', error)
    throw new Error(`Failed to create contact lead: ${error.message}`)
  }

  return data
}