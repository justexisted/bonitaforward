/**
 * SEND VERIFICATION EMAIL NETLIFY FUNCTION
 * 
 * Sends a custom email verification email using Resend.
 * Creates a verification token and stores it in the database.
 * 
 * This replaces Supabase's built-in email confirmation system.
 */

import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role for database access
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler: Handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  try {
    const { userId, email, name } = JSON.parse(event.body || '{}')

    if (!userId || !email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing userId or email' }),
      }
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Store token in database
    // Note: This table must be created by running ops/sql/create-email-verification-tokens.sql
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      console.error('[SendVerificationEmail] Error storing token:', tokenError)
      
      // Check if error is because table doesn't exist
      if (tokenError.message?.includes('does not exist') || tokenError.code === '42P01') {
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            error: 'Email verification table not found. Please run SQL migration: ops/sql/create-email-verification-tokens.sql',
            details: tokenError.message
          }),
        }
      }
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Failed to create verification token',
          details: tokenError.message 
        }),
      }
    }

    // Build verification URL
    // Use SITE_URL from environment if available, otherwise fall back to production URL
    // For local development, Netlify CLI provides event.headers.host
    const baseUrl = process.env.SITE_URL || process.env.URL || 
      (event.headers.host ? `http://${event.headers.host}` : 'https://www.bonitaforward.com')
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    // Send verification email via send-email function
    // Use the same base URL logic for consistency
    const sendEmailUrl = process.env.SITE_URL || process.env.URL || 
      (event.headers.host ? `http://${event.headers.host}` : 'https://www.bonitaforward.com')
    
    const emailResponse = await fetch(`${sendEmailUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email_verification',
        to: email,
        data: {
          name,
          verificationUrl,
        },
      }),
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error('[SendVerificationEmail] Error sending email:', emailError)
      
      // Try to delete the token if email failed
      await supabase
        .from('email_verification_tokens')
        .delete()
        .eq('token', token)
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to send verification email' }),
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Verification email sent',
      }),
    }
  } catch (error: any) {
    console.error('[SendVerificationEmail] Function error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
    }
  }
}

