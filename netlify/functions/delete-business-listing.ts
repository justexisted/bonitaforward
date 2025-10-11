// Netlify function to delete business listings using SERVICE_ROLE_KEY to bypass RLS
// This is a workaround for RLS policy issues on the providers table

type Handler = (event: {
  httpMethod: string
  headers: Record<string, string>
  body?: string | null
}, context: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>

import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' }
  }
  
  try {
    // Verify authentication
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return { statusCode: 401, headers, body: 'Unauthorized' }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
    
    // Create two clients: one for auth verification (anon), one for data operations (service role)
    const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    // Verify user token using ANON key (service role can't verify user tokens)
    const { data: userData, error: getUserErr } = await (sbAnon as any).auth.getUser(token)
    if (getUserErr || !userData?.user?.id) {
      console.error('[delete-business-listing] Token verification failed:', getUserErr)
      return { statusCode: 401, headers, body: 'Invalid token' }
    }

    const userId = userData.user.id
    const userEmail = userData.user.email

    console.log('[Delete Listing] User:', { userId, userEmail })

    // Get listing ID from request body
    const body = JSON.parse(event.body || '{}') as { listing_id?: string }
    const listingId = body.listing_id
    
    if (!listingId) {
      return { statusCode: 400, headers, body: 'Missing listing_id' }
    }

    console.log('[Delete Listing] Attempting to delete:', listingId)

    // Fetch the listing to verify ownership
    const { data: listing, error: fetchError } = await sb
      .from('providers')
      .select('*')
      .eq('id', listingId)
      .single()
    
    if (fetchError || !listing) {
      console.error('[Delete Listing] Listing not found:', fetchError)
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Listing not found' })
      }
    }

    console.log('[Delete Listing] Found listing:', listing)

    // Verify ownership
    const isOwner = listing.owner_user_id === userId || listing.email === userEmail
    
    if (!isOwner) {
      console.error('[Delete Listing] User does not own listing')
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ error: 'You do not have permission to delete this listing' })
      }
    }

    console.log('[Delete Listing] Ownership verified, proceeding with deletion')

    // Delete related records first (using service role bypasses RLS)
    console.log('[Delete Listing] Deleting related records...')
    
    // Delete provider change requests
    await sb.from('provider_change_requests').delete().eq('provider_id', listingId)
    
    // Delete provider job posts
    await sb.from('provider_job_posts').delete().eq('provider_id', listingId)
    
    // Delete from saved_providers
    await sb.from('saved_providers').delete().eq('provider_id', listingId)
    
    // Delete from coupon_redemptions
    await sb.from('coupon_redemptions').delete().eq('provider_id', listingId)
    
    // Update bookings (set provider_id to null)
    await sb.from('bookings').update({ provider_id: null }).eq('provider_id', listingId)

    console.log('[Delete Listing] Related records deleted, deleting main provider record...')

    // Delete the main provider record (service role bypasses RLS)
    const { error: deleteError, count } = await sb
      .from('providers')
      .delete({ count: 'exact' })
      .eq('id', listingId)

    console.log('[Delete Listing] Delete result:', { error: deleteError, count })

    if (deleteError) {
      console.error('[Delete Listing] Delete failed:', deleteError)
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ 
          error: 'Failed to delete listing',
          details: deleteError.message 
        })
      }
    }

    if (count === 0) {
      console.error('[Delete Listing] No rows deleted')
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ 
          error: 'Failed to delete listing - no rows affected'
        })
      }
    }

    console.log('[Delete Listing] Successfully deleted listing')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Business listing deleted successfully'
      })
    }
    
  } catch (err: any) {
    console.error('[Delete Listing] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err?.message || 'Server error'
      })
    }
  }
}

