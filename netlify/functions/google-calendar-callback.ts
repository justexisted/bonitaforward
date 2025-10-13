/**
 * Google Calendar OAuth Callback Handler
 * 
 * This function handles the OAuth callback from Google after the user grants permissions.
 * It exchanges the authorization code for access and refresh tokens, then stores them securely.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role (bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler: Handler = async (event: HandlerEvent) => {
  // This endpoint will be called by Google's OAuth redirect, so it's a GET request
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    }
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {})
    const code = params.get('code')
    const state = params.get('state') // This is the provider_id we passed
    const error = params.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return {
        statusCode: 302,
        headers: {
          Location: `/my-business?calendar_error=${encodeURIComponent(error)}`
        },
        body: ''
      }
    }

    if (!code || !state) {
      return {
        statusCode: 302,
        headers: {
          Location: '/my-business?calendar_error=missing_code_or_state'
        },
        body: ''
      }
    }

    const providerId = state

    // Exchange authorization code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Google OAuth configuration')
      return {
        statusCode: 302,
        headers: {
          Location: '/my-business?calendar_error=configuration_error'
        },
        body: ''
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return {
        statusCode: 302,
        headers: {
          Location: '/my-business?calendar_error=token_exchange_failed'
        },
        body: ''
      }
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response')
      return {
        statusCode: 302,
        headers: {
          Location: '/my-business?calendar_error=missing_tokens'
        },
        body: ''
      }
    }

    // Get the user's primary calendar ID
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    let calendarId = 'primary' // Default fallback
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json()
      calendarId = calendarData.id
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Store tokens in database
    // Note: In production, you should encrypt these tokens
    const { error: updateError } = await supabase
      .from('providers')
      .update({
        google_calendar_connected: true,
        google_calendar_id: calendarId,
        google_access_token: access_token,
        google_refresh_token: refresh_token,
        google_token_expires_at: expiresAt,
        google_calendar_sync_enabled: true
      })
      .eq('id', providerId)

    if (updateError) {
      console.error('Failed to store tokens:', updateError)
      return {
        statusCode: 302,
        headers: {
          Location: '/my-business?calendar_error=storage_failed'
        },
        body: ''
      }
    }

    // Success! Redirect back to My Business page
    return {
      statusCode: 302,
      headers: {
        Location: '/my-business?calendar_connected=true'
      },
      body: ''
    }
  } catch (error: any) {
    console.error('Error in OAuth callback:', error)
    return {
      statusCode: 302,
      headers: {
        Location: `/my-business?calendar_error=${encodeURIComponent(error.message)}`
      },
      body: ''
    }
  }
}


