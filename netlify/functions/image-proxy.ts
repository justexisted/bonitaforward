/**
 * Image Proxy Function
 * 
 * Proxies Google user content images to bypass CORS and hot-linking restrictions.
 * This allows external Google images to be displayed on the site.
 */

import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get the image URL from query parameters
  const imageUrl = event.queryStringParameters?.url

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing url parameter' })
    }
  }

  // Only allow Google user content URLs for security
  if (!imageUrl.startsWith('https://lh3.googleusercontent.com/')) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Only Google user content URLs are allowed' })
    }
  }

  try {
    // Fetch the image with appropriate headers
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Failed to fetch image: ${response.statusText}` })
      }
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Return the image with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true
    }
  } catch (error) {
    console.error('Error proxying image:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy image' })
    }
  }
}

