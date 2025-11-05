import { supabase } from './supabase'
import { query, update } from './supabaseQuery'

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

/**
 * Fetch all providers from Supabase
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function fetchProvidersFromSupabase(): Promise<DbProvider[]> {
  try {
    // First, let's get all providers to see what we're working with
    const result = await query('providers', { logPrefix: '[Supabase]' })
      .select('*')
      .limit(1000)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    const allData = result.data

    const allRows = (allData || []) as DbProvider[]
    
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

    // Exclude soft-deleted providers and providers without valid category_key
    const filtered = publishedRows.filter((r) => {
      // Must have valid category_key
      const hasValidCategory = r.category_key && typeof r.category_key === 'string' && r.category_key.trim().length > 0
      if (!hasValidCategory) {
        // Only log exclusion in development mode
        if (import.meta.env.DEV) {
          console.log(`[Supabase] Excluding provider without category_key: ${r.name} (category_key: "${r.category_key}")`)
        }
        return false
      }
      
      // Exclude deleted providers
      const isNotDeleted = !Array.isArray(r.badges) || !r.badges?.includes('deleted')
      return isNotDeleted
    })
    
    // Calculate category breakdown for summary log
    const categoryBreakdown: Record<string, number> = {}
    filtered.forEach(r => {
      const cat = r.category_key || 'unknown'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })
    
    // Single summary log instead of multiple logs
    console.log(`[Supabase] Loaded ${filtered.length} providers (${allRows.length} total, ${publishedRows.length} published)`, categoryBreakdown)
    
    // Detailed debug logs only in development mode
    if (import.meta.env.DEV) {
      // Debug: Show health-wellness specifically
      const healthWellnessCount = filtered.filter(r => r.category_key === 'health-wellness').length
      
      // Debug: Analyze health-wellness provider tags to understand what types exist
      const healthWellnessProviders = filtered.filter(r => r.category_key === 'health-wellness')
      if (healthWellnessProviders.length > 0) {
        // Collect all unique tags from health-wellness providers
        const allTags = new Set<string>()
        
        healthWellnessProviders.forEach(provider => {
          const tags = provider.tags || []
          tags.forEach(tag => allTags.add(tag.toLowerCase()))
        })
        
        console.log(`[Supabase] Health-wellness: ${healthWellnessCount} providers, ${allTags.size} unique tags`)
        
        // Show sample providers and their tags (only first 3 in dev)
        if (healthWellnessProviders.length > 0 && allTags.size > 0) {
          console.log('[Supabase] Sample health-wellness providers:', 
            healthWellnessProviders.slice(0, 3).map(p => `${p.name}: [${(p.tags || []).slice(0, 3).join(', ')}]`)
          )
        }
      }
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

/**
 * Fetch all blog posts
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const result = await query('blog_posts', { logPrefix: '[Supabase]' })
      .select('id,category_key,title,content,images,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(200)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as BlogPost[]
  } catch (err) {
    console.warn('[Supabase] blog_posts select failed', err)
    return []
  }
}

/**
 * Fetch latest blog post by category
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function fetchLatestBlogPostByCategory(category_key: string): Promise<BlogPost | null> {
  try {
    const result = await query('blog_posts', { logPrefix: '[Supabase]' })
      .select('id,category_key,title,content,images,created_at,updated_at')
      .eq('category_key', category_key)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return null
    }
    
    return result.data as BlogPost | null
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

/**
 * Fetch blog posts by category
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function fetchBlogPostsByCategory(category_key: string): Promise<BlogPost[]> {
  try {
    const result = await query('blog_posts', { logPrefix: '[Supabase]' })
      .select('id,category_key,title,content,created_at,updated_at')
      .eq('category_key', category_key)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as BlogPost[]
  } catch (err) {
    console.warn('[Supabase] blog_posts select by category (all) failed', err)
    return []
  }
}

/**
 * Upsert blog post
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function upsertBlogPost(post: Partial<BlogPost>): Promise<{ error?: string }> {
  try {
    const payload: any = {
      id: post.id,
      category_key: post.category_key,
      title: post.title,
      content: post.content,
    }
    
    const result = await query('blog_posts', { logPrefix: '[Supabase]' })
      .upsert(payload, { onConflict: 'id' })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to save blog post' }
  }
}

/**
 * Delete blog post
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function deleteBlogPost(id: string): Promise<{ error?: string }> {
  try {
    const result = await query('blog_posts', { logPrefix: '[Supabase]' })
      .delete()
      .eq('id', id)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
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

/**
 * Create provider change request
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
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
    const result = await query('provider_change_requests', { logPrefix: '[Supabase]' })
      .insert([insertPayload])
      .select('id')
      .single()
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
    return { id: (result.data as any)?.id as string }
  } catch (err: any) {
    return { error: err?.message || 'Failed to submit change request' }
  }
}

/**
 * List owner change requests
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function listOwnerChangeRequests(owner_user_id: string): Promise<ProviderChangeRequest[]> {
  try {
    const result = await query('provider_change_requests', { logPrefix: '[Supabase]' })
      .select('*')
      .eq('owner_user_id', owner_user_id)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProviderChangeRequest[]
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

/**
 * Create job post
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
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
    const result = await query('provider_job_posts', { logPrefix: '[Supabase]' })
      .insert([insertPayload])
      .select('id')
      .single()
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
    return { id: (result.data as any)?.id as string }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create job post' }
  }
}

/**
 * List job posts by provider
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function listJobPostsByProvider(provider_id: string): Promise<ProviderJobPost[]> {
  try {
    const result = await query('provider_job_posts', { logPrefix: '[Supabase]' })
      .select('*')
      .eq('provider_id', provider_id)
      .in('status', ['approved'])
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as ProviderJobPost[]
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

/**
 * List user notifications
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function listUserNotifications(user_id: string): Promise<UserNotification[]> {
  try {
    const result = await query('user_notifications', { logPrefix: '[Supabase]' })
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100)
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as UserNotification[]
  } catch {
    return []
  }
}

/**
 * Mark notification as read
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  try {
    const result = await update(
      'user_notifications',
      { read_at: new Date().toISOString() as any },
      { id },
      { logPrefix: '[Supabase]' }
    )
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
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

/**
 * Dismiss notification
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
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
    const result = await query('dismissed_notifications', { logPrefix: '[Supabase]' })
      .upsert(payload, { 
        onConflict: 'user_id,notification_type',
        ignoreDuplicates: false 
      })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return { error: result.error.message }
    }
    
    return {}
  } catch (err: any) {
    return { error: err?.message || 'Failed to dismiss notification' }
  }
}

/**
 * Get dismissed notifications
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function getDismissedNotifications(user_id: string): Promise<DismissedNotification[]> {
  try {
    const result = await query('dismissed_notifications', { logPrefix: '[Supabase]' })
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .execute()
    
    if (result.error) {
      // Error already logged by query utility
      return []
    }
    
    return (result.data || []) as DismissedNotification[]
  } catch {
    return []
  }
}

/**
 * Get latest activity timestamp
 * MIGRATED: Now uses centralized query utility with retry logic and standardized error handling
 */
export async function getLatestActivityTimestamp(
  user_id: string, 
  notification_type: 'pending' | 'approved' | 'rejected'
): Promise<string | null> {
  try {
    let builder = query('provider_change_requests', { logPrefix: '[Supabase]' })
      .select('created_at,decided_at')
    
    if (notification_type === 'pending') {
      builder = builder.eq('owner_user_id', user_id).eq('status', 'pending') as any
    } else if (notification_type === 'approved') {
      builder = builder.eq('owner_user_id', user_id).eq('status', 'approved').not('decided_at', 'is', null) as any
    } else if (notification_type === 'rejected') {
      builder = builder.eq('owner_user_id', user_id).eq('status', 'rejected').not('decided_at', 'is', null) as any
    }
    
    const result = await builder
      .order(notification_type === 'pending' ? 'created_at' : 'decided_at', { ascending: false })
      .limit(1)
      .single()
      .execute()
    
    if (result.error || !result.data) return null
    
    // For pending requests, use created_at. For approved/rejected, use decided_at
    const data = result.data as any
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