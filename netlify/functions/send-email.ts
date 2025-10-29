/**
 * SEND EMAIL NETLIFY FUNCTION
 * 
 * This serverless function handles all email sending for Bonita Forward.
 * It uses Resend to send transactional emails with React Email templates.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - RESEND_API_KEY: Your Resend API key
 */

import React from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { 
  ChangeRequestApproved,
  ChangeRequestRejected,
  BookingConfirmation,
  ApplicationApproved,
} from '../../src/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Email sender (must be verified in Resend)
const FROM_EMAIL = 'Bonita Forward <notifications@bonitaforward.com>'
// Fallback to Gmail while setting up custom domain
const FROM_EMAIL_FALLBACK = 'Bonita Forward <bonitaforward@gmail.com>'

interface SendEmailRequest {
  type: 'change_request_approved' | 'change_request_rejected' | 'booking_confirmation' | 'application_approved'
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

    switch (type) {
      case 'change_request_approved':
        html = render(ChangeRequestApproved({
          businessName: data.businessName,
          requestType: data.requestType,
          changedFields: data.changedFields,
        }))
        subject = data.requestType === 'feature_request'
          ? '🎉 Your Featured Upgrade Request Was Approved!'
          : `✅ Your ${data.businessName} Update Was Approved!`
        break

      case 'change_request_rejected':
        html = render(ChangeRequestRejected({
          businessName: data.businessName,
          requestType: data.requestType,
          reason: data.reason,
        }))
        subject = `Update on Your ${data.businessName} Request`
        break

      case 'booking_confirmation':
        html = render(BookingConfirmation({
          businessName: data.businessName,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          serviceRequested: data.serviceRequested,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          message: data.message,
        }))
        subject = `📅 New Booking Request for ${data.businessName}!`
        break

      case 'application_approved':
        html = render(ApplicationApproved({
          businessName: data.businessName,
          category: data.category,
          tier: data.tier,
        }))
        subject = `🎉 ${data.businessName} is Now Live on Bonita Forward!`
        break

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown email type: ${type}` })
        }
    }

    // Send email via Resend
    console.log('[SendEmail] Sending email via Resend...')
    
    // Try custom domain first, fall back to Gmail if not verified yet
    let fromEmail = FROM_EMAIL
    try {
      const { data: emailData, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
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

