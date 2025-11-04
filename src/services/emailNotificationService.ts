/**
 * EMAIL NOTIFICATION SERVICE
 * 
 * This service provides easy-to-use functions for sending email notifications.
 * All emails are sent via the Netlify function that uses Resend.
 * 
 * IMPORTANT: Respects user email preferences. Will not send to users who have
 * unsubscribed, except for critical security/legal emails.
 * 
 * Usage:
 * import { notifyChangeRequestApproved } from '@/services/emailNotificationService'
 * await notifyChangeRequestApproved(userEmail, businessName, 'update', ['name', 'phone'])
 */

import { supabase } from '../lib/supabase'

const SEND_EMAIL_ENDPOINT = '/.netlify/functions/send-email'

/**
 * Check if user has email notifications enabled
 * Returns true if user can receive emails, false if unsubscribed
 */
async function canSendEmail(email: string, isCritical: boolean = false): Promise<boolean> {
  try {
    // Critical emails (security, legal) always send
    if (isCritical) {
      console.log('[EmailService] Critical email - bypassing preference check')
      return true
    }

    // Check user's email preferences
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email_notifications_enabled')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !profile) {
      // If user not found, allow email (they might not have an account yet)
      console.log('[EmailService] User not found, allowing email')
      return true
    }

    if (!profile.email_notifications_enabled) {
      console.log('[EmailService] User has unsubscribed, blocking email')
      return false
    }

    return true
  } catch (error) {
    console.error('[EmailService] Error checking email preferences:', error)
    // On error, allow email to ensure important notifications get through
    return true
  }
}

/**
 * Base function to send emails via Netlify function
 * Checks user preferences before sending (unless email is critical)
 */
async function sendEmail(
  type: string, 
  to: string, 
  data: any, 
  isCritical: boolean = false
): Promise<{ success: boolean; id?: string; error?: string; blocked?: boolean }> {
  try {
    console.log(`[EmailService] Sending ${type} email to:`, to)
    
    // Check if user can receive emails
    const allowed = await canSendEmail(to, isCritical)
    if (!allowed) {
      console.log('[EmailService] Email blocked - user has unsubscribed')
      return {
        success: false,
        blocked: true,
        error: 'User has unsubscribed from emails',
      }
    }
    
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

export async function notifyBookingCancelled(
  to: string,
  booking: {
    businessName: string
    customerName: string
    customerEmail: string
    bookingDate: string
    bookingTime?: string
    cancelledBy: 'customer' | 'business'
    reason?: string
  }
) {
  return sendEmail('booking_cancelled', to, booking)
}

export async function notifyBookingUpdated(
  to: string,
  booking: {
    businessName: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    bookingDate: string
    bookingTime?: string
    bookingDuration?: number
    changes: string[] // e.g., ['date', 'time', 'notes']
    message?: string
  }
) {
  return sendEmail('booking_updated', to, booking)
}

export async function notifyBookingReminder(
  to: string,
  booking: {
    businessName: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    bookingDate: string
    bookingTime?: string
    bookingDuration?: number
    recipientType: 'customer' | 'business'
  }
) {
  return sendEmail('booking_reminder', to, booking)
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
 * FEATURED LISTING NOTIFICATIONS
 */

export async function notifyFeaturedExpiring(
  to: string,
  businessName: string,
  expirationDate: string,
  daysUntilExpiration: number,
  renewalPrice: string
) {
  return sendEmail('featured_expiration_reminder', to, {
    businessName,
    expirationDate,
    daysUntilExpiration,
    renewalPrice,
  })
}

/**
 * USER ONBOARDING NOTIFICATIONS
 */

export async function notifyWelcome(
  to: string,
  name: string,
  role: 'business' | 'community'
) {
  return sendEmail('welcome', to, {
    name,
    role,
  })
}

/**
 * ACCOUNT DELETION NOTIFICATIONS
 */

export async function notifyAccountDeletion(
  to: string,
  name: string,
  deletedBy: 'self' | 'admin',
  businessesDeleted?: number,
  businessesKept?: number
) {
  return sendEmail('account_deletion_confirmation', to, {
    name,
    deletedBy,
    businessesDeleted,
    businessesKept,
  }, true) // Critical email - send even if user unsubscribed
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

