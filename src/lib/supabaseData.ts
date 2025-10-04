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
}

export async function fetchProvidersFromSupabase(): Promise<DbProvider[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('published', true) // Only fetch published providers
      .limit(500)
    if (error) {
      console.warn('[Supabase] providers select error', error)
      return []
    }
    const rows = (data || []) as DbProvider[]
    // Exclude soft-deleted providers (badges includes 'deleted')
    const filtered = rows.filter((r) => !Array.isArray(r.badges) || !r.badges?.includes('deleted'))
    console.log(`[Supabase] Fetched ${filtered.length} published providers (${rows.length} total)`)
    return filtered
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