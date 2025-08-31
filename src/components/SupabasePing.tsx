import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SupabasePing() {
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data, error }) => {
        // You should see this in the browser console
        console.log('[Supabase] auth.getSession()', { data, error })
      })
      .catch((err) => console.error('[Supabase] auth.getSession() error', err))
  }, [])

  return null
}




