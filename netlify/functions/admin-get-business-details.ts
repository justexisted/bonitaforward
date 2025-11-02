import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'
import { getSupabaseConfig } from './utils/env'
import { createClient } from '@supabase/supabase-js'

export const handler: Handler = async (event) => {
  // Handle OPTIONS/preflight
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed')
  }

  try {
    // Verify auth and admin status
    const authAdminResult = await verifyAuthAndAdmin(event)
    
    if (!authAdminResult.success || !authAdminResult.supabaseClient) {
      return authAdminErrorResponse(authAdminResult)
    }

    const { supabaseClient } = authAdminResult

    // Parse the request body
    const { userId, userEmail, userName } = JSON.parse(event.body || '{}')

    if (!userId) {
      return errorResponse(400, 'Missing required fields', 'userId is required')
    }

    console.log('[Admin Business Details] Fetching business details for:', { userId, userEmail, userName })

    // Fetch providers by owner_user_id (primary method)
    const { data: businessDataByOwner, error: ownerError } = await supabaseClient
      .from('providers')
      .select('id, name, phone, email, website, address, category_key, tags, is_member, published, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })

    console.log('[Admin Business Details] Business data by owner_user_id:', businessDataByOwner?.length || 0, 'records')

    // Fetch providers by email (fallback method)
    let businessDataByEmail: any[] = []
    if (userEmail) {
      const { data: emailData, error: emailError } = await supabaseClient
        .from('providers')
        .select('id, name, phone, email, website, address, category_key, tags, is_member, published, created_at, owner_user_id')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })
      
      if (emailError) {
        console.warn('[Admin Business Details] Error fetching by email:', emailError)
      } else {
        businessDataByEmail = emailData || []
        console.log('[Admin Business Details] Business data by email:', businessDataByEmail.length, 'records')
      }
    }

    // Fetch providers by name search (additional fallback)
    let businessDataByName: any[] = []
    if (userName) {
      const { data: nameData, error: nameError } = await supabaseClient
        .from('providers')
        .select('id, name, phone, email, website, address, category_key, tags, is_member, published, created_at, owner_user_id')
        .ilike('name', `%${userName}%`)
        .order('created_at', { ascending: false })
      
      if (nameError) {
        console.warn('[Admin Business Details] Error fetching by name:', nameError)
      } else {
        businessDataByName = nameData || []
        console.log('[Admin Business Details] Business data by name search:', businessDataByName.length, 'records')
      }
    }

    // Combine all results and remove duplicates
    const allBusinessData = [
      ...(businessDataByOwner || []), 
      ...businessDataByEmail, 
      ...businessDataByName
    ]
    
    const uniqueBusinessData = allBusinessData.filter((business, index, self) => 
      index === self.findIndex(b => b.id === business.id)
    )

    console.log('[Admin Business Details] Combined unique business data:', uniqueBusinessData.length, 'records')

    // Check for errors in the primary query
    if (ownerError) {
      console.error('[Admin Business Details] Error in primary query:', ownerError)
      return errorResponse(500, 'Failed to fetch business details', ownerError.message)
    }

    return successResponse({
      success: true,
      businessData: uniqueBusinessData,
      counts: {
        byOwner: businessDataByOwner?.length || 0,
        byEmail: businessDataByEmail.length,
        byName: businessDataByName.length,
        total: uniqueBusinessData.length
      }
    })
  } catch (error: any) {
    console.error('[Admin Business Details] Unexpected error:', error)
    return errorResponse(500, 'Internal server error', error.message)
  }
}
