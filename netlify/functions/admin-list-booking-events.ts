import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Admin verification (similar to admin-verify function)
  const token = event.headers.authorization?.split(' ')[1]
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized: No token provided' }
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userResponse.user) {
    console.error('Admin verification failed:', userError?.message)
    return { statusCode: 401, body: `Unauthorized: ${userError?.message || 'Invalid token'}` }
  }

  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const userEmail = userResponse.user.email?.toLowerCase()

  if (!userEmail || !adminEmails.includes(userEmail)) {
    console.warn(`Non-admin user (${userEmail}) attempted to access admin-list-booking-events`)
    return { statusCode: 403, body: 'Forbidden: Not an administrator' }
  }

  try {
    // Parse request body to get customer email filter
    const body = event.body ? JSON.parse(event.body) : {}
    const customerEmail = body.customerEmail

    // Build the query
    let query = supabaseAdmin
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
      console.error('Error fetching booking events:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch booking events', details: error.message }),
      }
    }

    // Enrich booking events with provider information
    const enrichedBookingEvents = await Promise.all(
      (bookingEvents || []).map(async (booking) => {
        let providerInfo = null

        // Fetch provider information
        if (booking.provider_id) {
          const { data: provider, error: providerError } = await supabaseAdmin
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

    return {
      statusCode: 200,
      body: JSON.stringify({ bookingEvents: enrichedBookingEvents }),
    }
  } catch (error: any) {
    console.error('Exception in admin-list-booking-events:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}
