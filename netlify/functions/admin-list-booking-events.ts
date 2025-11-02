import { Handler } from '@netlify/functions'
import { verifyAuthAndAdmin, authAdminErrorResponse } from './utils/authAdmin'
import { errorResponse, successResponse, handleOptions } from './utils/response'

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

    // Parse request body to get customer email filter
    const body = event.body ? JSON.parse(event.body) : {}
    const customerEmail = body.customerEmail

    // Build the query
    let query = supabaseClient
      .from('booking_events')
      .select(`
        id,
        provider_id,
        customer_email,
        customer_name,
        booking_date,
        booking_duration_minutes,
        booking_notes,
        status,
        created_at
      `)

    // Add customer email filter if provided
    if (customerEmail) {
      query = query.eq('customer_email', customerEmail)
    }

    // Add ordering and limit
    query = query.order('booking_date', { ascending: false }).limit(50)

    const { data: bookingEvents, error } = await query

    if (error) {
      console.error('[admin-list-booking-events] Error fetching booking events:', error)
      return errorResponse(500, 'Failed to fetch booking events', error.message)
    }

    // Enrich booking events with provider information
    const enrichedBookingEvents = await Promise.all(
      (bookingEvents || []).map(async (booking) => {
        let providerInfo = null

        // Fetch provider information
        if (booking.provider_id) {
          const { data: provider, error: providerError } = await supabaseClient
            .from('providers')
            .select('name, category_key, address, phone')
            .eq('id', booking.provider_id)
            .maybeSingle()
          
          if (!providerError && provider) {
            providerInfo = provider
          }
        }

        return {
          ...booking,
          providers: providerInfo
        }
      })
    )

    return successResponse({ bookingEvents: enrichedBookingEvents })
  } catch (error: any) {
    console.error('[admin-list-booking-events] Exception:', error)
    return errorResponse(500, 'Internal server error', error.message)
  }
}
