import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use environment variable for site URL if available, otherwise fallback to current origin
    redirectTo: import.meta.env.VITE_SITE_URL
      ? `${import.meta.env.VITE_SITE_URL}/onboarding`
      : `${window.location.origin}/onboarding`
  }
})




