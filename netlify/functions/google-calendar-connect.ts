/**
 * Google Calendar OAuth Connection Initiation
 * 
 * This function initiates the Google OAuth flow for connecting a business's Google Calendar.
 * It generates the OAuth URL and redirects the user to Google's consent screen.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
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

    // Get Google OAuth credentials from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI
    
    if (!clientId || !redirectUri) {
      console.error('Missing Google OAuth configuration')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Google Calendar integration not configured' })
      }
    }

    // Define the OAuth scopes we need
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events', // Create/update/delete events
      'https://www.googleapis.com/auth/calendar.readonly' // Read calendar info
    ]

    // Build the OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent screen to ensure we get refresh token
      state: provider_id // Pass provider_id as state to retrieve after OAuth
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        auth_url: authUrl 
      })
    }
  } catch (error: any) {
    console.error('Error initiating Google Calendar connection:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to initiate Google Calendar connection',
        details: error.message 
      })
    }
  }
}


