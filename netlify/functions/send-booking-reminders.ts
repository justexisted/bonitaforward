/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - booking_events table: Must have booking_date, customer_email, provider_id columns
 *   → CRITICAL: Queries bookings by date to find upcoming bookings
 * - providers table: Must have name, owner_user_id columns
 *   → CRITICAL: Gets business name and owner email for reminders
 * - send-email Netlify function: Must handle 'booking_reminder' type
 *   → CRITICAL: Sends reminder emails to customers and business owners
 * - SITE_URL environment variable: For calling send-email function
 * 
 * WHAT DEPENDS ON THIS:
 * - Netlify Scheduled Functions: Runs daily at 06:00 UTC
 *   → CRITICAL: Must be configured in netlify.toml or Netlify dashboard
 * 
 * BREAKING CHANGES:
 * - If booking_date format changes → Query fails
 * - If send-email function changes → Email sending fails
 * - If provider or owner lookup fails → Missing emails
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Test manually: Run with test dates first
 * 2. Verify query: Check that bookings are found correctly
 * 3. Check emails: Verify emails are sent to correct recipients
 * 4. Monitor logs: Watch for errors in function execution
 * 
 * RELATED FILES:
 * - netlify/functions/send-email.ts: Handles email sending
 * - netlify/functions/manage-booking.ts: Handles booking updates/cancellations
 * - src/services/emailNotificationService.ts: Frontend email service
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs daily via Netlify Scheduled Functions to send booking reminders
export const config = {
  schedule: '0 6 * * *', // 06:00 UTC daily (runs at 11pm PST / 6am UTC)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

/**
 * Send booking reminder emails
 * Finds bookings that are 24 hours away and sends reminders to both customer and business owner
 */
export const handler: Handler = async (event) => {
  console.log('[SendBookingReminders] Starting scheduled reminder check...')

  try {
    // Calculate date range: 24 hours from now (between 23h and 25h to account for function run time)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    const tomorrowStart = new Date(tomorrow)
    tomorrowStart.setHours(0, 0, 0, 0) // Start of tomorrow
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999) // End of tomorrow

    // Find bookings that are tomorrow (within 24 hour window)
    const { data: upcomingBookings, error: fetchError } = await supabase
      .from('booking_events')
      .select('id, provider_id, customer_name, customer_email, customer_phone, booking_date, booking_time, booking_duration_minutes, status')
      .gte('booking_date', tomorrowStart.toISOString())
      .lte('booking_date', tomorrowEnd.toISOString())
      .in('status', ['pending', 'confirmed']) // Only send reminders for active bookings
      .not('customer_email', 'is', null) // Must have customer email

    if (fetchError) {
      console.error('[SendBookingReminders] ❌ Failed to fetch upcoming bookings:', fetchError)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to fetch bookings',
          details: fetchError.message 
        })
      }
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      console.log('[SendBookingReminders] ✓ No upcoming bookings found for tomorrow')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'No bookings to remind',
          count: 0
        })
      }
    }

    console.log(`[SendBookingReminders] 📅 Found ${upcomingBookings.length} booking(s) tomorrow`)

    const baseUrl = process.env.SITE_URL || 'https://www.bonitaforward.com'
    let successCount = 0
    let errorCount = 0

    // Process each booking
    for (const booking of upcomingBookings) {
      try {
        // Get provider details
        const { data: provider, error: providerError } = await supabase
          .from('providers')
          .select('name, owner_user_id')
          .eq('id', booking.provider_id)
          .single()

        if (providerError || !provider) {
          console.error(`[SendBookingReminders] ❌ Failed to get provider ${booking.provider_id}:`, providerError)
          errorCount++
          continue
        }

        const businessName = provider.name || 'the business'

        // Get business owner email
        let ownerEmail: string | null = null
        if (provider.owner_user_id) {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(provider.owner_user_id)
          ownerEmail = ownerUser.user?.email || null
        }

        // Format booking time
        const bookingDateTime = new Date(booking.booking_date)
        const bookingTime = booking.booking_time 
          ? new Date(`2000-01-01T${booking.booking_time}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : bookingDateTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })

        // Send reminder to customer
        if (booking.customer_email) {
          try {
            console.log(`[SendBookingReminders] 📧 Sending reminder to customer: ${booking.customer_email}`)
            const customerEmailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'booking_reminder',
                to: booking.customer_email,
                data: {
                  businessName,
                  customerName: booking.customer_name || booking.customer_email || 'Customer',
                  customerEmail: booking.customer_email,
                  customerPhone: booking.customer_phone || undefined,
                  bookingDate: booking.booking_date,
                  bookingTime: bookingTime,
                  bookingDuration: booking.booking_duration_minutes || undefined,
                  recipientType: 'customer',
                },
              }),
            })

            if (!customerEmailResponse.ok) {
              const errorText = await customerEmailResponse.text()
              console.error(`[SendBookingReminders] ❌ Failed to send customer reminder:`, errorText)
              errorCount++
            } else {
              console.log(`[SendBookingReminders] ✅ Reminder sent to customer: ${booking.customer_email}`)
              successCount++
            }
          } catch (emailErr) {
            console.error(`[SendBookingReminders] ❌ Error sending customer reminder:`, emailErr)
            errorCount++
          }
        }

        // Send reminder to business owner
        if (ownerEmail) {
          try {
            console.log(`[SendBookingReminders] 📧 Sending reminder to business owner: ${ownerEmail}`)
            const ownerEmailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'booking_reminder',
                to: ownerEmail,
                data: {
                  businessName,
                  customerName: booking.customer_name || booking.customer_email || 'Customer',
                  customerEmail: booking.customer_email,
                  customerPhone: booking.customer_phone || undefined,
                  bookingDate: booking.booking_date,
                  bookingTime: bookingTime,
                  bookingDuration: booking.booking_duration_minutes || undefined,
                  recipientType: 'business',
                },
              }),
            })

            if (!ownerEmailResponse.ok) {
              const errorText = await ownerEmailResponse.text()
              console.error(`[SendBookingReminders] ❌ Failed to send owner reminder:`, errorText)
              errorCount++
            } else {
              console.log(`[SendBookingReminders] ✅ Reminder sent to business owner: ${ownerEmail}`)
              successCount++
            }
          } catch (emailErr) {
            console.error(`[SendBookingReminders] ❌ Error sending owner reminder:`, emailErr)
            errorCount++
          }
        }

      } catch (bookingErr: any) {
        console.error(`[SendBookingReminders] ❌ Error processing booking ${booking.id}:`, bookingErr)
        errorCount++
      }
    }

    console.log(`[SendBookingReminders] ✨ Complete! Sent ${successCount} reminder(s), ${errorCount} error(s)`)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Processed ${upcomingBookings.length} booking(s)`,
        sent: successCount,
        errors: errorCount
      })
    }

  } catch (error: any) {
    console.error('[SendBookingReminders] ❌ Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    }
  }
}

