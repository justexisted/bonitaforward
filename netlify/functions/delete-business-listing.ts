import { Handler } from '@netlify/functions'
import { extractAndVerifyToken } from './utils/auth'
import { getSupabaseConfig } from './utils/env'
import { createClient } from '@supabase/supabase-js'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { checkIsAdmin } from './utils/admin'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify token
    const { url, serviceRole, anonKey } = getSupabaseConfig()
    const authResult = await extractAndVerifyToken(event, url, anonKey)
    
    if (!authResult.success || !authResult.user) {
      return errorResponse(401, 'Authentication failed', authResult.error)
    }

    const { id: userId, email: userEmail } = authResult.user
    const supabaseClient = createClient(url, serviceRole, { auth: { persistSession: false } })

    // Get listing ID from request body
    const body = JSON.parse(event.body || '{}') as { listing_id?: string }
    const listingId = body.listing_id
    
    if (!listingId) {
      return errorResponse(400, 'Missing listing_id')
    }

    console.log('[Delete Listing] User:', { userId, userEmail }, 'Attempting to delete:', listingId)

    // Fetch the listing to verify ownership
    const { data: listing, error: fetchError } = await supabaseClient
      .from('providers')
      .select('*')
      .eq('id', listingId)
      .single()
    
    if (fetchError || !listing) {
      console.error('[Delete Listing] Listing not found:', fetchError)
      return errorResponse(404, 'Listing not found', fetchError?.message)
    }

    console.log('[Delete Listing] Found listing:', listing)

    // Check if user is admin or owner
    const adminCheck = await checkIsAdmin(userId, userEmail, supabaseClient)
    const isAdmin = adminCheck.isAdmin
    const isOwner = listing.owner_user_id === userId || listing.email === userEmail
    
    if (!isOwner && !isAdmin) {
      console.error('[Delete Listing] User does not own listing and is not admin')
      return errorResponse(403, 'Permission denied', 'You do not have permission to delete this listing')
    }

    if (isAdmin) {
      console.log('[Delete Listing] Admin override - proceeding with deletion')
    } else {
      console.log('[Delete Listing] Ownership verified, proceeding with deletion')
    }

    // Delete related records first (using service role bypasses RLS)
    console.log('[Delete Listing] Deleting related records...')
    
    // Delete provider change requests
    await supabaseClient.from('provider_change_requests').delete().eq('provider_id', listingId)
    
    // Delete provider job posts
    await supabaseClient.from('provider_job_posts').delete().eq('provider_id', listingId)
    
    // Delete from saved_providers
    await supabaseClient.from('saved_providers').delete().eq('provider_id', listingId)
    
    // Delete from coupon_redemptions
    await supabaseClient.from('coupon_redemptions').delete().eq('provider_id', listingId)
    
    // Update bookings (set provider_id to null)
    await supabaseClient.from('bookings').update({ provider_id: null }).eq('provider_id', listingId)

    console.log('[Delete Listing] Related records deleted, deleting main provider record...')

    // Delete the main provider record (service role bypasses RLS)
    const { error: deleteError, count } = await supabaseClient
      .from('providers')
      .delete({ count: 'exact' })
      .eq('id', listingId)

    console.log('[Delete Listing] Delete result:', { error: deleteError, count })

    if (deleteError) {
      console.error('[Delete Listing] Delete failed:', deleteError)
      return errorResponse(500, 'Failed to delete listing', deleteError.message)
    }

    if (count === 0) {
      console.error('[Delete Listing] No rows deleted')
      return errorResponse(500, 'Failed to delete listing', 'No rows affected')
    }

    console.log('[Delete Listing] Successfully deleted listing')

    return successResponse({ 
      success: true,
      message: 'Business listing deleted successfully'
    })
  } catch (err: any) {
    console.error('[Delete Listing] Error:', err)
    return errorResponse(500, 'Server error', err?.message)
  }
}
