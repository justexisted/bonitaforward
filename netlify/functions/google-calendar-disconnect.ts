/**
 * Disconnect Google Calendar
 * 
 * This function allows business owners to disconnect their Google Calendar integration.
 * It revokes the Google OAuth tokens and clears the stored credentials.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { provider_id } = JSON.parse(event.body || '{}')
    
    if (!provider_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'provider_id is required' })
      }
    }

    // Verify authentication
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid authentication token' })
      }
    }

    // Verify user owns this provider
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('owner_user_id, google_refresh_token')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Provider not found' })
      }
    }

    // Check ownership
    if (provider.owner_user_id !== user.id) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You do not own this business' })
      }
    }

    // Revoke the Google OAuth token
    if (provider.google_refresh_token) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: provider.google_refresh_token
          })
        })
      } catch (revokeError) {
        console.error('Failed to revoke Google token:', revokeError)
        // Continue anyway to clear local storage
      }
    }

    // Clear Google Calendar credentials from database
    const { error: updateError } = await supabase
      .from('providers')
      .update({
        google_calendar_connected: false,
        google_calendar_id: null,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        google_calendar_sync_enabled: false
      })
      .eq('id', provider_id)

    if (updateError) {
      console.error('Failed to disconnect calendar:', updateError)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to disconnect calendar',
          details: updateError.message 
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Google Calendar disconnected successfully'
      })
    }
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to disconnect Google Calendar',
        details: error.message 
      })
    }
  }
}
