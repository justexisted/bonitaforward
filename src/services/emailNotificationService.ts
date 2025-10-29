/**
 * EMAIL NOTIFICATION SERVICE
 * 
 * This service provides easy-to-use functions for sending email notifications.
 * All emails are sent via the Netlify function that uses Resend.
 * 
 * Usage:
 * import { notifyChangeRequestApproved } from '@/services/emailNotificationService'
 * await notifyChangeRequestApproved(userEmail, businessName, 'update', ['name', 'phone'])
 */

const SEND_EMAIL_ENDPOINT = '/.netlify/functions/send-email'

/**
 * Base function to send emails via Netlify function
 */
async function sendEmail(type: string, to: string, data: any): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log(`[EmailService] Sending ${type} email to:`, to)
    
    const response = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        to,
        data,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[EmailService] Failed to send email:', result)
      return {
        success: false,
        error: result.error || 'Failed to send email',
      }
    }

    console.log('[EmailService] Email sent successfully:', result.id)
    return {
      success: true,
      id: result.id,
    }
  } catch (error: any) {
    console.error('[EmailService] Error sending email:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email',
    }
  }
}

/**
 * CHANGE REQUEST NOTIFICATIONS
 */

export async function notifyChangeRequestApproved(
  to: string,
  businessName: string,
  requestType: 'update' | 'delete' | 'feature_request' | 'claim',
  changedFields?: string[]
) {
  return sendEmail('change_request_approved', to, {
    businessName,
    requestType,
    changedFields,
  })
}

export async function notifyChangeRequestRejected(
  to: string,
  businessName: string,
  requestType: 'update' | 'delete' | 'feature_request' | 'claim',
  reason?: string
) {
  return sendEmail('change_request_rejected', to, {
    businessName,
    requestType,
    reason,
  })
}

/**
 * BOOKING NOTIFICATIONS
 */

export async function notifyBookingReceived(
  to: string,
  booking: {
    businessName: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    serviceRequested?: string
    bookingDate: string
    bookingTime?: string
    message?: string
  }
) {
  return sendEmail('booking_confirmation', to, booking)
}

/**
 * APPLICATION NOTIFICATIONS
 */

export async function notifyApplicationApproved(
  to: string,
  businessName: string,
  category: string,
  tier: 'free' | 'featured'
) {
  return sendEmail('application_approved', to, {
    businessName,
    category,
    tier,
  })
}

/**
 * Batch notification helper (for admin use)
 * Sends the same notification to multiple recipients
 */
export async function sendBatchNotifications(
  type: string,
  recipients: string[],
  data: any
): Promise<{ total: number; successful: number; failed: number; results: any[] }> {
  console.log(`[EmailService] Sending batch ${type} emails to ${recipients.length} recipients`)
  
  const results = await Promise.allSettled(
    recipients.map(to => sendEmail(type, to, data))
  )

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - successful

  console.log(`[EmailService] Batch complete: ${successful} successful, ${failed} failed`)

  return {
    total: results.length,
    successful,
    failed,
    results: results.map((r, i) => ({
      email: recipients[i],
      success: r.status === 'fulfilled' && r.value.success,
      error: r.status === 'rejected' ? r.reason : (r.status === 'fulfilled' && !r.value.success ? r.value.error : undefined),
    })),
  }
}

/**
 * Test function to verify email service is working
 */
export async function testEmailService(testEmail: string) {
  console.log('[EmailService] Running test email to:', testEmail)
  
  return notifyApplicationApproved(
    testEmail,
    'Test Business',
    'Professional Services',
    'free'
  )
}

