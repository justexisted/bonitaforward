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
      // Netlify provides queryStringParameters as a plain object
      // Using URLSearchParams on an object may return null; read directly and fallback
      const qp = (event as any).queryStringParameters || {}
      token = (typeof qp.token === 'string' && qp.token) ? qp.token : null
      // Fallback: try parsing rawQuery if present
      if (!token && (event as any).rawQuery) {
        const usp = new URLSearchParams((event as any).rawQuery as string)
        token = usp.get('token')
      }
    } else {
      const body = JSON.parse(event.body || '{}')
      token = body.token
    }

    if (!token) {
      console.error('[VerifyEmail] Missing token in request')
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing verification token' }),
      }
    }

    console.log('[VerifyEmail] Looking up token:', token.substring(0, 8) + '...')

    // Find token in database
    // Note: This table must be created by running ops/sql/create-email-verification-tokens.sql
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError) {
      console.error('[VerifyEmail] Token lookup error:', {
        code: tokenError.code,
        message: tokenError.message,
        hint: tokenError.hint,
        tokenPreview: token.substring(0, 8) + '...'
      })

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
      
      // Check if error is because no rows found (token doesn't exist)
      if (tokenError.code === 'PGRST116' || tokenError.message?.includes('No rows') || tokenError.message?.includes('not found')) {
        console.warn('[VerifyEmail] Token not found in database. Checking if user email is already verified...')
        
        // Try to find if this token might be for a user whose email is already verified
        // We can't directly lookup by token, but we can check if there are any recent tokens
        // This is a fallback for legacy accounts that might not have tokens
        // For now, return a helpful error message
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            success: false,
            error: 'Verification token not found. This token may have expired or already been used. Please request a new verification email.',
            details: 'Token does not exist in database. This may happen if the token expired, was already used, or if the account was created before the verification system was implemented.'
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
      console.warn('[VerifyEmail] Token lookup returned no data (token not found)')
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Verification token not found. This token may have expired or already been used. Please request a new verification email.',
          details: 'Token does not exist in database'
        }),
      }
    }

    console.log('[VerifyEmail] Token found for user:', tokenData.user_id, 'email:', tokenData.email)

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

    // Check if profile exists before updating
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, email_confirmed_at')
      .eq('id', tokenData.user_id)
      .maybeSingle()

    if (profileCheckError) {
      console.error('[VerifyEmail] Error checking profile:', profileCheckError)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to verify email address',
          details: profileCheckError.message
        }),
      }
    }

    if (!existingProfile) {
      console.error('[VerifyEmail] Profile not found for user:', tokenData.user_id)
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'User profile not found. Please contact support.',
          details: `Profile does not exist for user ${tokenData.user_id}`
        }),
      }
    }

    // Check if email is already verified
    if (existingProfile.email_confirmed_at) {
      console.log('[VerifyEmail] Email already verified for user:', tokenData.user_id)
      // Still mark token as used (if not already)
      await supabase
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: 'Email is already verified',
          userId: tokenData.user_id,
          alreadyVerified: true
        }),
      }
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

    console.log('[VerifyEmail] Successfully verified email for user:', tokenData.user_id)

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

