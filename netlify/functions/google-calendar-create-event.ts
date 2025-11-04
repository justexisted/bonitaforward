/**
 * Create Event in Google Calendar
 * 
 * This function creates a booking event in the business owner's Google Calendar.
 * It handles token refresh automatically if the access token has expired.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Refresh Google access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth configuration')
      return null
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Token refresh failed:', errorData)
      return null
    }

    const data = await response.json()
    return {
      access_token: data.access_token,
      expires_in: data.expires_in
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(providerId: string): Promise<string | null> {
  const { data: provider, error } = await supabase
    .from('providers')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', providerId)
    .single()

  if (error || !provider) {
    console.error('Failed to get provider:', error)
    return null
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiresAt = new Date(provider.google_token_expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return provider.google_access_token
  }

  // Token expired or expiring soon - refresh it
  console.log('Access token expired, refreshing...')
  const refreshed = await refreshAccessToken(provider.google_refresh_token)

  if (!refreshed) {
    return null
  }

  // Update the stored access token
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await supabase
    .from('providers')
    .update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: newExpiresAt
    })
    .eq('id', providerId)

  return refreshed.access_token
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { 
      provider_id, 
      customer_email, 
      customer_name,
      customer_phone,
      booking_date,
      duration_minutes = 60,
      notes 
    } = JSON.parse(event.body || '{}')

    if (!provider_id || !booking_date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'provider_id and booking_date are required' })
      }
    }

    // Get provider's calendar info and owner email
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('name, google_calendar_connected, google_calendar_id, google_calendar_sync_enabled, owner_user_id')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Provider not found' })
      }
    }

    // Get owner's email from auth.users
    const { data: ownerData, error: ownerError } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', provider.owner_user_id)
      .single()

    if (ownerError || !ownerData) {
      console.error('Failed to get owner email:', ownerError)
      // Continue without owner email notification
    }

    if (!provider.google_calendar_connected || !provider.google_calendar_sync_enabled) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Google Calendar is not connected or sync is disabled' })
      }
    }

    // Get valid access token (gracefully handle missing/expired tokens)
    const accessToken = await getValidAccessToken(provider_id)

    // Calculate end time
    const startTime = new Date(booking_date)
    const endTime = new Date(startTime.getTime() + duration_minutes * 60 * 1000)

    // Create attendees list - include both customer and business owner
    const attendees = []
    if (customer_email) {
      attendees.push({ email: customer_email })
    }
    if (ownerData?.email) {
      attendees.push({ email: ownerData.email })
    }

    // Create event in Google Calendar (avoid shadowing handler's `event` param)
    const calendarEvent = {
      summary: `Booking: ${customer_name || customer_email || 'Customer'}`,
      description: notes || `Booking through Bonita Forward for ${provider.name}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Los_Angeles' // Adjust as needed
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }       // 1 hour before
        ]
      }
    }
    let createdEvent: any | null = null
    if (accessToken) {
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${provider.google_calendar_id}/events?sendUpdates=all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        }
      )

      if (calendarResponse.ok) {
        createdEvent = await calendarResponse.json()
      } else {
        const errorData = await calendarResponse.text()
        console.error('Failed to create calendar event:', errorData)
        // Continue with local booking storage as pending
      }
    } else {
      console.warn('No valid Google access token. Storing booking as pending and prompting reconnect.')
    }

    // Store booking in database (confirmed if Google event created, otherwise pending)
    const { data: booking, error: bookingError } = await supabase
      .from('booking_events')
      .insert([{
        provider_id,
        customer_email,
        customer_name,
        booking_date: startTime.toISOString(),
        booking_duration_minutes: duration_minutes,
        booking_notes: notes,
        google_event_id: createdEvent?.id || null,
        status: createdEvent ? 'confirmed' : 'pending'
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Failed to store booking:', bookingError)
      // Event was created in Google Calendar but not stored locally
      // You might want to handle this edge case
    }

    // Create notification for business owner
    if (provider.owner_user_id) {
      await supabase
        .from('user_notifications')
        .insert([{
          user_id: provider.owner_user_id,
          type: 'booking_received',
          title: 'New Booking Received',
          message: `You have a new booking from ${customer_name || customer_email} for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`,
          provider_id: provider_id,
          booking_id: booking?.id,
          is_read: false
        }])
    }

    // Send email notification to business owner
    if (ownerData?.email) {
      try {
        // Format booking time from startTime
        const bookingTime = startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })

        // Get base URL for email function (same pattern as send-verification-email)
        const baseUrl = process.env.SITE_URL || 'https://www.bonitaforward.com'
        
        console.log('[Booking] Sending booking confirmation email to:', ownerData.email)
        
        const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'booking_confirmation',
            to: ownerData.email,
            data: {
              businessName: provider.name,
              customerName: customer_name || customer_email || 'Customer',
              customerEmail: customer_email || '',
              customerPhone: customer_phone || undefined,
              serviceRequested: undefined, // Not available in current implementation
              bookingDate: startTime.toISOString(),
              bookingTime: bookingTime,
              message: notes || undefined,
            },
          }),
        })

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text()
          console.error('[Booking] Failed to send booking confirmation email:', emailError)
        } else {
          console.log('[Booking] ✅ Booking confirmation email sent successfully')
        }
      } catch (emailErr) {
        console.error('[Booking] Error sending booking confirmation email:', emailErr)
        // Don't fail booking creation just because email failed
      }
    }

    return {
      statusCode: createdEvent ? 200 : 200,
      body: JSON.stringify({
        success: true,
        booking_id: booking?.id,
        status: createdEvent ? 'confirmed' : 'pending',
        message: createdEvent ? undefined : 'Google connection expired. Booking saved as pending. Please reconnect Google Calendar in My Business.',
        google_event_id: createdEvent?.id,
        google_event_link: createdEvent?.htmlLink
      })
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create calendar event',
        details: error.message
      })
    }
  }
}


