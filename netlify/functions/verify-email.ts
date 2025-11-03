/**
 * VERIFY EMAIL NETLIFY FUNCTION
 * 
 * Verifies an email address using a token from the verification email.
 * Updates the user's profile with email_confirmed_at timestamp.
 */

import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    }
  }

  // Allow both GET (from URL) and POST
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  try {
    // Get token from query params (GET) or body (POST)
    let token: string | null = null
    
    if (event.httpMethod === 'GET') {
      const params = new URLSearchParams(event.queryStringParameters || {})
      token = params.get('token')
    } else {
      const body = JSON.parse(event.body || '{}')
      token = body.token
    }

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing verification token' }),
      }
    }

    // Find token in database
    // Note: This table must be created by running ops/sql/create-email-verification-tokens.sql
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError) {
      // Check if error is because table doesn't exist
      if (tokenError.message?.includes('does not exist') || tokenError.code === '42P01') {
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            success: false,
            error: 'Email verification table not found. Please run SQL migration: ops/sql/create-email-verification-tokens.sql',
            details: tokenError.message
          }),
        }
      }
      
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid or expired verification token',
          details: tokenError.message
        }),
      }
    }
    
    if (!tokenData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid or expired verification token' 
        }),
      }
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at)
    if (expiresAt < new Date()) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Verification token has expired',
        }),
      }
    }

    // Check if token was already used
    if (tokenData.used_at) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'This verification link has already been used',
        }),
      }
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      console.error('[VerifyEmail] Error updating token:', updateError)
      // Continue anyway - we'll still verify the email
    }

    // Update profile with email_confirmed_at
    // Note: This column must be added by running ops/sql/add-email-confirmed-at-to-profiles.sql
    const confirmedAt = new Date().toISOString()
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email_confirmed_at: confirmedAt })
      .eq('id', tokenData.user_id)

    if (profileError) {
      // Check if error is because column doesn't exist
      if (profileError.message?.includes('email_confirmed_at') || profileError.code === '42703') {
        console.error('[VerifyEmail] Error: email_confirmed_at column does not exist. Please run SQL migration: ops/sql/add-email-confirmed-at-to-profiles.sql')
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Email verification column not found. Please run SQL migration: ops/sql/add-email-confirmed-at-to-profiles.sql',
            details: profileError.message
          }),
        }
      }
      
      console.error('[VerifyEmail] Error updating profile:', profileError)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to verify email address',
          details: profileError.message
        }),
      }
    }

    // Also update auth.users.email_confirmed_at (for consistency)
    try {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { email_confirm: true }
      )
      if (authError) {
        console.warn('[VerifyEmail] Could not update auth.users (may not have permission):', authError)
        // Not critical - profile update is what matters
      }
    } catch (err) {
      console.warn('[VerifyEmail] Error updating auth.users:', err)
      // Not critical - continue
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Email verified successfully',
        userId: tokenData.user_id,
      }),
    }
  } catch (error: any) {
    console.error('[VerifyEmail] Function error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
      }),
    }
  }
}

