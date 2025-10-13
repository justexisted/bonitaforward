import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  try {
    const { action, bookingId, updates, userEmail } = JSON.parse(event.body || '{}')

    if (!action || !bookingId || !userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // Verify the user has permission to modify this booking
    const { data: booking, error: fetchError } = await supabase
      .from('booking_events')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' })
      }
    }

    // Check if user is either the customer or the business owner
    const isCustomer = booking.customer_email === userEmail
    let isBusinessOwner = false

    if (!isCustomer) {
      // Check if user is the business owner
      const { data: provider } = await supabase
        .from('providers')
        .select('owner_user_id')
        .eq('id', booking.provider_id)
        .single()

      if (provider) {
        const { data: user } = await supabase.auth.admin.getUserById(provider.owner_user_id)
        isBusinessOwner = user.user?.email === userEmail
      }
    }

    if (!isCustomer && !isBusinessOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized to modify this booking' })
      }
    }

    let result

    switch (action) {
      case 'cancel':
        result = await supabase
          .from('booking_events')
          .update({ status: 'cancelled' })
          .eq('id', bookingId)
        break

      case 'confirm':
        result = await supabase
          .from('booking_events')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
        break

      case 'delete':
        result = await supabase
          .from('booking_events')
          .delete()
          .eq('id', bookingId)
        break

      case 'edit':
        if (!updates) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Updates required for edit action' })
          }
        }
        
        // Validate updates
        const allowedFields = ['customer_name', 'customer_email', 'booking_date', 'booking_duration_minutes', 'booking_notes']
        const validUpdates: any = {}
        
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            validUpdates[key] = value
          }
        }

        if (Object.keys(validUpdates).length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' })
          }
        }

        result = await supabase
          .from('booking_events')
          .update(validUpdates)
          .eq('id', bookingId)
        break

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        }
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database operation failed' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, action })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
