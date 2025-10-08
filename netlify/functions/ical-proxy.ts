import { Handler } from '@netlify/functions'

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // Get the URL from query parameters
    const url = event.queryStringParameters?.url

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL parameter is required' }),
      }
    }

    // Validate URL to prevent SSRF attacks
    const parsedUrl = new URL(url)
    const allowedHosts = [
      'www.sdmart.org',
      'thinkplaycreate.org',
      // Old/disabled feeds (404 errors)
      // 'www.sandiego.gov',
      // 'www.sandiegolibrary.org',
      // 'calendar.ucsd.edu',
      // 'www.sandiegozoo.org',
      // 'www.balboapark.org',
      'www.chulavista.gov',
      'www.bonita.gov'
    ]

    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Host not allowed' }),
      }
    }

    // Fetch the iCalendar content
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/calendar, application/calendar, text/plain',
        'User-Agent': 'Bonita Forward Calendar/1.0',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 seconds
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Failed to fetch calendar: ${response.status} ${response.statusText}` 
        }),
      }
    }

    const content = await response.text()

    if (!content || content.length < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or empty calendar content' }),
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: content,
    }

  } catch (error) {
    console.error('Error in ical-proxy:', error)
    
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

