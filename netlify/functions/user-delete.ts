import { Handler } from '@netlify/functions'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { createClient } from '@supabase/supabase-js'
import { errorResponse, successResponse, handleOptions } from './utils/response'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify token (user deleting themselves, not admin-only)
    const { url, serviceRole, anonKey } = getSupabaseConfig()
    const authResult = await extractAndVerifyToken(event, url, anonKey)
    
    if (!authResult.success || !authResult.user) {
      return errorResponse(401, 'Authentication failed', authResult.error)
    }

    const userId = authResult.user.id
    const userEmail = authResult.user.email || null
    const supabaseClient = createClient(url, serviceRole, { auth: { persistSession: false } })

    // Best-effort purge PII in application tables BEFORE deleting the auth user
    // Note: use service role to bypass RLS and ensure deletion
    // 1) profiles (id primary key = auth user id)
    try { 
      await supabaseClient.from('profiles').delete().eq('id', userId) 
    } catch {}
    
    // 2) funnel_responses (keyed by email)
    if (userEmail) { 
      try { 
        await supabaseClient.from('funnel_responses').delete().eq('user_email', userEmail) 
      } catch {} 
    }
    
    // 3) bookings (keyed by email)
    if (userEmail) { 
      try { 
        await supabaseClient.from('bookings').delete().eq('user_email', userEmail) 
      } catch {} 
    }
    
    // 4) provider_change_requests / provider_job_posts (owned by user)
    try { 
      await supabaseClient.from('provider_change_requests').delete().eq('owner_user_id', userId) 
    } catch {}
    try { 
      await supabaseClient.from('provider_job_posts').delete().eq('owner_user_id', userId) 
    } catch {}
    
    // 5) user_notifications
    try { 
      await supabaseClient.from('user_notifications').delete().eq('user_id', userId) 
    } catch {}
    
    // 6) providers owned by the user: archive (soft delete) to avoid breaking references for public directory; remove owner link
    try {
      const { data: provs } = await supabaseClient
        .from('providers')
        .select('id,badges')
        .eq('owner_user_id', userId)
      
      if (Array.isArray(provs) && provs.length) {
        for (const p of provs) {
          const badges = Array.isArray((p as any)?.badges) ? ((p as any)?.badges as string[]) : []
          const next = Array.from(new Set([...(badges || []), 'deleted']))
          await supabaseClient
            .from('providers')
            .update({ badges: next as any, owner_user_id: null as any })
            .eq('id', (p as any).id)
        }
      }
    } catch {}

    // Finally, delete the auth user
    const { error: delErr } = await (supabaseClient as any).auth.admin.deleteUser(userId)
    if (delErr) {
      return errorResponse(400, 'Failed to delete user', delErr.message)
    }

    return successResponse({ ok: true })
  } catch (err: any) {
    console.error('[user-delete] Exception:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
