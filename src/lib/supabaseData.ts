import { supabase } from './supabase'

export type DbProvider = {
  id: string
  name: string
  category_key: string
  tags?: string[] | null
  rating?: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  images?: string[] | null
  badges?: string[] | null
  // Membership/featured columns (optional in DB)
  is_member?: boolean | number | string | null
  member?: boolean | number | string | null
  is_featured?: boolean | number | string | null
  featured?: boolean | number | string | null
  paid?: boolean | number | string | null
  plan?: string | null
  tier?: string | null
}

export async function fetchProvidersFromSupabase(): Promise<DbProvider[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .limit(500)
    if (error) {
      console.warn('[Supabase] providers select error', error)
      return []
    }
    const rows = (data || []) as DbProvider[]
    // Exclude soft-deleted providers (badges includes 'deleted')
    return rows.filter((r) => !Array.isArray(r.badges) || !r.badges?.includes('deleted'))
  } catch (err) {
    console.warn('[Supabase] providers select failed', err)
    return []
  }
}

export type BlogPost = {
  id: string
  category_key: string
  title: string
  content: string
  created_at: string
  updated_at?: string | null
}

export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,category_key,title,content,created_at,updated_at')
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
      .select('id,category_key,title,content,created_at,updated_at')
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




