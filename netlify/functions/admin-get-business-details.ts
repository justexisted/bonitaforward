import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('Missing required environment variables')
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse the request body
    const { userId, userEmail, userName } = JSON.parse(event.body || '{}')

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required fields',
          details: 'userId is required'
        })
      }
    }

    console.log('[Admin Business Details] Fetching business details for:', { userId, userEmail, userName })

    // Fetch providers by owner_user_id (primary method)
    const { data: businessDataByOwner, error: ownerError } = await supabase
      .from('providers')
      .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })

    console.log('[Admin Business Details] Business data by owner_user_id:', businessDataByOwner?.length || 0, 'records')

    // Fetch providers by email (fallback method)
    let businessDataByEmail: any[] = []
    if (userEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from('providers')
        .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at, owner_user_id')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })
      
      if (emailError) {
        console.warn('[Admin Business Details] Error fetching by email:', emailError)
      } else {
        businessDataByEmail = emailData || []
        console.log('[Admin Business Details] Business data by email:', businessDataByEmail.length, 'records')
      }
    }

    // Fetch providers by name search (additional fallback)
    let businessDataByName: any[] = []
    if (userName) {
      const { data: nameData, error: nameError } = await supabase
        .from('providers')
        .select('id, name, phone, email, website, address, category, tags, is_member, published, created_at, owner_user_id')
        .ilike('name', `%${userName}%`)
        .order('created_at', { ascending: false })
      
      if (nameError) {
        console.warn('[Admin Business Details] Error fetching by name:', nameError)
      } else {
        businessDataByName = nameData || []
        console.log('[Admin Business Details] Business data by name search:', businessDataByName.length, 'records')
      }
    }

    // Combine all results and remove duplicates
    const allBusinessData = [
      ...(businessDataByOwner || []), 
      ...businessDataByEmail, 
      ...businessDataByName
    ]
    
    const uniqueBusinessData = allBusinessData.filter((business, index, self) => 
      index === self.findIndex(b => b.id === business.id)
    )

    console.log('[Admin Business Details] Combined unique business data:', uniqueBusinessData.length, 'records')

    // Check for errors in the primary query
    if (ownerError) {
      console.error('[Admin Business Details] Error in primary query:', ownerError)
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to fetch business details',
          details: ownerError.message,
          code: ownerError.code,
          hint: ownerError.hint
        })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        businessData: uniqueBusinessData,
        counts: {
          byOwner: businessDataByOwner?.length || 0,
          byEmail: businessDataByEmail.length,
          byName: businessDataByName.length,
          total: uniqueBusinessData.length
        }
      })
    }

  } catch (error: any) {
    console.error('[Admin Business Details] Unexpected error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    }
  }
}
