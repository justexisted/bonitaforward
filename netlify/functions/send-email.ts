/**
 * SEND EMAIL NETLIFY FUNCTION
 * 
 * This serverless function handles all email sending for Bonita Forward.
 * It uses Resend to send transactional emails with React Email templates.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - RESEND_API_KEY: Your Resend API key
 */

// React is required here for React.createElement() calls in serverless environment
import * as React from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { 
  ChangeRequestApproved,
  ChangeRequestRejected,
  BookingConfirmation,
  BookingCancelled,
  BookingUpdated,
  BookingReminder,
  ApplicationApproved,
  FeaturedExpirationReminder,
  Welcome,
  AccountDeletionConfirmation,
  EmailVerification,
} from '../../src/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Email sender (must be verified in Resend)
const FROM_EMAIL = 'Bonita Forward <notifications@bonitaforward.com>'
// Fallback to Resend's test domain (works immediately for testing)
const FROM_EMAIL_FALLBACK = 'Bonita Forward <onboarding@resend.dev>'

interface SendEmailRequest {
  type: 'change_request_approved' | 'change_request_rejected' | 'booking_confirmation' | 'booking_cancelled' | 'booking_updated' | 'booking_reminder' | 'application_approved' | 'featured_expiration_reminder' | 'welcome' | 'account_deletion_confirmation' | 'email_verification'
  to: string
  data: any
}

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const request: SendEmailRequest = JSON.parse(event.body)
    const { type, to, data } = request

    // Validate required fields
    if (!type || !to || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: type, to, data' })
      }
    }

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email address' })
      }
    }

    console.log('[SendEmail] Processing email request:', { type, to })

    // Generate email HTML based on type
    let html: string
    let subject: string

    try {
      switch (type) {
        case 'change_request_approved':
          const approvedElement = React.createElement(ChangeRequestApproved, {
            businessName: data.businessName,
            requestType: data.requestType,
            changedFields: data.changedFields,
          })
          const approvedHtml = await render(approvedElement, { pretty: false })
          html = String(approvedHtml)
          console.log('[SendEmail] Rendered HTML type:', typeof html, 'Length:', html?.length)
          subject = data.requestType === 'feature_request'
            ? 'Your Featured Upgrade Request Was Approved'
            : `Your ${data.businessName} Update Was Approved`
          break

        case 'change_request_rejected':
          const rejectedElement = React.createElement(ChangeRequestRejected, {
            businessName: data.businessName,
            requestType: data.requestType,
            reason: data.reason,
          })
          const rejectedHtml = await render(rejectedElement, { pretty: false })
          html = String(rejectedHtml)
          subject = `Update on Your ${data.businessName} Request`
          break

        case 'booking_confirmation':
          const bookingElement = React.createElement(BookingConfirmation, {
            businessName: data.businessName,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            serviceRequested: data.serviceRequested,
            bookingDate: data.bookingDate,
            bookingTime: data.bookingTime,
            message: data.message,
          })
          const bookingHtml = await render(bookingElement, { pretty: false })
          html = String(bookingHtml)
          subject = `New Booking Request for ${data.businessName}`
          break

        case 'booking_cancelled':
          const cancelledElement = React.createElement(BookingCancelled, {
            businessName: data.businessName,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            bookingDate: data.bookingDate,
            bookingTime: data.bookingTime,
            cancelledBy: data.cancelledBy,
            reason: data.reason,
          })
          const cancelledHtml = await render(cancelledElement, { pretty: false })
          html = String(cancelledHtml)
          subject = `Booking Cancelled at ${data.businessName}`
          break

        case 'booking_updated':
          const updatedElement = React.createElement(BookingUpdated, {
            businessName: data.businessName,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            bookingDate: data.bookingDate,
            bookingTime: data.bookingTime,
            bookingDuration: data.bookingDuration,
            changes: data.changes,
            message: data.message,
          })
          const updatedHtml = await render(updatedElement, { pretty: false })
          html = String(updatedHtml)
          subject = `Booking Updated at ${data.businessName}`
          break

        case 'booking_reminder':
          const reminderElement = React.createElement(BookingReminder, {
            businessName: data.businessName,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            bookingDate: data.bookingDate,
            bookingTime: data.bookingTime,
            bookingDuration: data.bookingDuration,
            recipientType: data.recipientType,
          })
          const reminderHtml = await render(reminderElement, { pretty: false })
          html = String(reminderHtml)
          subject = `Reminder: Your booking at ${data.businessName} is tomorrow`
          break

        case 'application_approved':
          const approvedAppElement = React.createElement(ApplicationApproved, {
            businessName: data.businessName,
            category: data.category,
            tier: data.tier,
          })
          const approvedAppHtml = await render(approvedAppElement, { pretty: false })
          html = String(approvedAppHtml)
          subject = `${data.businessName} is Now Live on Bonita Forward`
          break

        case 'featured_expiration_reminder':
          const expirationElement = React.createElement(FeaturedExpirationReminder, {
            businessName: data.businessName,
            expirationDate: data.expirationDate,
            daysUntilExpiration: data.daysUntilExpiration,
            renewalPrice: data.renewalPrice,
          })
          const expirationHtml = await render(expirationElement, { pretty: false })
          html = String(expirationHtml)
          subject = data.daysUntilExpiration === 1
            ? '⚠️ Your Featured Listing Expires Tomorrow!'
            : data.daysUntilExpiration <= 7
            ? `⏰ Your Featured Listing Expires in ${data.daysUntilExpiration} Days`
            : `📅 Featured Listing Expiration Reminder: ${data.businessName}`
          break

        case 'welcome':
          const welcomeElement = React.createElement(Welcome, {
            name: data.name,
            role: data.role,
          })
          const welcomeHtml = await render(welcomeElement, { pretty: false })
          html = String(welcomeHtml)
          subject = `Welcome to Bonita Forward, ${data.name}!`
          break

        case 'account_deletion_confirmation':
          const deletionElement = React.createElement(AccountDeletionConfirmation, {
            name: data.name,
            deletedBy: data.deletedBy,
            businessesDeleted: data.businessesDeleted,
            businessesKept: data.businessesKept,
          })
          const deletionHtml = await render(deletionElement, { pretty: false })
          html = String(deletionHtml)
          subject = 'Your Account Has Been Deleted'
          break

        case 'email_verification':
          const verificationElement = React.createElement(EmailVerification, {
            name: data.name,
            verificationUrl: data.verificationUrl,
          })
          const verificationHtml = await render(verificationElement, { pretty: false })
          html = String(verificationHtml)
          subject = 'Verify your email address - Bonita Forward'
          break

        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ error: `Unknown email type: ${type}` })
          }
      }
    } catch (renderError: any) {
      console.error('[SendEmail] Render error:', renderError)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to render email template',
          details: renderError.message 
        })
      }
    }

    // Ensure html is a string
    if (typeof html !== 'string' || !html || html.length < 10) {
      console.error('[SendEmail] Invalid HTML output:', typeof html, html?.substring(0, 100))
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to generate email HTML',
          details: `Render returned ${typeof html} with length ${html?.length || 0}`
        })
      }
    }

    // Send email via Resend
    console.log('[SendEmail] Sending email via Resend...')
    
    // Try custom domain first, fall back to test domain if not verified yet
    let fromEmail = FROM_EMAIL
    try {
      const { data: emailData, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
        reply_to: 'hello@bonitaforward.com',
        headers: {
          'X-Entity-Ref-ID': `bf-${Date.now()}`,
          'List-Unsubscribe': '<https://www.bonitaforward.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      if (error) {
        // If domain not verified, try fallback
        if (error.message?.includes('not verified') || error.message?.includes('domain')) {
          console.log('[SendEmail] Custom domain not verified, trying fallback...')
          fromEmail = FROM_EMAIL_FALLBACK
          
          const fallbackResult = await resend.emails.send({
            from: fromEmail,
            to: [to],
            subject: subject,
            html: html,
            reply_to: 'hello@bonitaforward.com',
            headers: {
              'X-Entity-Ref-ID': `bf-${Date.now()}`,
              'List-Unsubscribe': '<https://www.bonitaforward.com/unsubscribe>',
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          })
          
          if (fallbackResult.error) {
            throw fallbackResult.error
          }
          
          console.log('[SendEmail] Email sent successfully via fallback:', fallbackResult.data?.id)
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              success: true, 
              id: fallbackResult.data?.id,
              from: fromEmail
            })
          }
        }
        
        throw error
      }

      console.log('[SendEmail] Email sent successfully:', emailData?.id)
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          id: emailData?.id,
          from: fromEmail
        })
      }
    } catch (resendError: any) {
      console.error('[SendEmail] Resend error:', resendError)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to send email',
          details: resendError.message 
        })
      }
    }

  } catch (error: any) {
    console.error('[SendEmail] Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    }
  }
}

