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
}

export async function fetchProvidersFromSupabase(): Promise<DbProvider[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('id,name,category_key,tags,rating,phone,email,website,address,images,badges')
      .limit(500)
    if (error) {
      console.warn('[Supabase] providers select error', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] providers select failed', err)
    return []
  }
}



