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
    'X-Content-Type-Options': 'nosniff',
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

        // Send cancellation emails to both customer and business owner
        if (!result.error) {
          try {
            // Get provider details for business name
            const { data: provider } = await supabase
              .from('providers')
              .select('name, owner_user_id')
              .eq('id', booking.provider_id)
              .single()

            const businessName = provider?.name || 'the business'
            const cancelledBy = isCustomer ? 'customer' : 'business'

            // Get business owner email
            let ownerEmail: string | null = null
            if (provider?.owner_user_id) {
              const { data: ownerUser } = await supabase.auth.admin.getUserById(provider.owner_user_id)
              ownerEmail = ownerUser.user?.email || null
            }

            const baseUrl = process.env.SITE_URL || 'https://www.bonitaforward.com'
            const bookingTime = booking.booking_time 
              ? new Date(`2000-01-01T${booking.booking_time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : undefined

            // Send email to customer
            if (booking.customer_email) {
              console.log('[ManageBooking] Sending cancellation email to customer:', booking.customer_email)
              const customerEmailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'booking_cancelled',
                  to: booking.customer_email,
                  data: {
                    businessName,
                    customerName: booking.customer_name || booking.customer_email || 'Customer',
                    customerEmail: booking.customer_email,
                    bookingDate: booking.booking_date,
                    bookingTime: bookingTime,
                    cancelledBy,
                    reason: undefined, // Could add reason field in future
                  },
                }),
              })
              if (!customerEmailResponse.ok) {
                const emailError = await customerEmailResponse.text()
                console.error('[ManageBooking] Failed to send cancellation email to customer:', emailError)
              } else {
                console.log('[ManageBooking] ✅ Cancellation email sent to customer')
              }
            }

            // Send email to business owner
            if (ownerEmail) {
              console.log('[ManageBooking] Sending cancellation email to business owner:', ownerEmail)
              const ownerEmailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'booking_cancelled',
                  to: ownerEmail,
                  data: {
                    businessName,
                    customerName: booking.customer_name || booking.customer_email || 'Customer',
                    customerEmail: booking.customer_email,
                    bookingDate: booking.booking_date,
                    bookingTime: bookingTime,
                    cancelledBy,
                    reason: undefined,
                  },
                }),
              })
              if (!ownerEmailResponse.ok) {
                const emailError = await ownerEmailResponse.text()
                console.error('[ManageBooking] Failed to send cancellation email to business owner:', emailError)
              } else {
                console.log('[ManageBooking] ✅ Cancellation email sent to business owner')
              }
            }
          } catch (emailErr) {
            console.error('[ManageBooking] Error sending cancellation emails:', emailErr)
            // Don't fail the cancellation if email fails
          }
        }
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
        
        // Validate updates - only allow date, time, duration, and notes changes
        const allowedFields = ['booking_date', 'booking_duration_minutes', 'booking_notes']
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

        // If edit was successful and notification is requested, send email and create in-app notification
        if (!result.error && updates.sendNotification) {
          const { data: updatedBooking } = await supabase
            .from('booking_events')
            .select('*')
            .eq('id', bookingId)
            .single()

          if (updatedBooking) {
            // Create in-app notification for the customer
            await supabase
              .from('user_notifications')
              .insert({
                user_id: null, // Will be resolved by email
                email: updatedBooking.customer_email,
                provider_id: updatedBooking.provider_id,
                type: 'booking_updated',
                title: 'Booking Details Updated',
                message: `Your booking at ${updatedBooking.provider_id ? 'the business' : 'the business'} has been updated. Please check the new details.`,
                booking_id: bookingId
              })

            // Send email to customer (only if business owner is updating)
            if (!isCustomer && updatedBooking.customer_email) {
              try {
                // Get provider details for business name
                const { data: provider } = await supabase
                  .from('providers')
                  .select('name')
                  .eq('id', updatedBooking.provider_id)
                  .single()

                const businessName = provider?.name || 'the business'
                const baseUrl = process.env.SITE_URL || 'https://www.bonitaforward.com'
                const bookingTime = updatedBooking.booking_time 
                  ? new Date(`2000-01-01T${updatedBooking.booking_time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  : undefined

                // Determine which fields changed
                const changes: string[] = []
                if (validUpdates.booking_date) changes.push('date')
                if (validUpdates.booking_duration_minutes) changes.push('duration')
                if (validUpdates.booking_notes) changes.push('notes')

                console.log('[ManageBooking] Sending update email to customer:', updatedBooking.customer_email)
                const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'booking_updated',
                    to: updatedBooking.customer_email,
                    data: {
                      businessName,
                      customerName: updatedBooking.customer_name || updatedBooking.customer_email || 'Customer',
                      customerEmail: updatedBooking.customer_email,
                      customerPhone: updatedBooking.customer_phone || undefined,
                      bookingDate: updatedBooking.booking_date,
                      bookingTime: bookingTime,
                      bookingDuration: updatedBooking.booking_duration_minutes || undefined,
                      changes,
                      message: updatedBooking.booking_notes || undefined,
                    },
                  }),
                })
                if (!emailResponse.ok) {
                  const emailError = await emailResponse.text()
                  console.error('[ManageBooking] Failed to send update email to customer:', emailError)
                } else {
                  console.log('[ManageBooking] ✅ Update email sent to customer')
                }
              } catch (emailErr) {
                console.error('[ManageBooking] Error sending update email:', emailErr)
                // Don't fail the update if email fails
              }
            }
          }
        }
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
