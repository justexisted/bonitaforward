import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * API endpoint to serve aggregated calendar events
 * GET /api/events
 */
export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    console.log('Fetching calendar events from database...')

    // Fetch all events from database
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error',
          message: error.message 
        }),
      }
    }

    // Filter out past events (older than 1 day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const futureEvents = events?.filter(event => 
      new Date(event.date) >= oneDayAgo
    ) || []

    console.log(`Returning ${futureEvents.length} events`)

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      body: JSON.stringify({
        success: true,
        count: futureEvents.length,
        events: futureEvents,
        lastUpdated: new Date().toISOString()
      }),
    }

  } catch (error) {
    console.error('Error in api-events:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    }
  }
}
