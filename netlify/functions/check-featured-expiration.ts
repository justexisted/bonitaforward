/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - providers table: Must have is_featured, featured_since, owner_user_id columns
 *   → CRITICAL: Queries featured providers by featured_since date
 *   → CRITICAL: Gets business name and owner email for reminders
 * - auth.users table: Must have email for owner_user_id lookups
 *   → CRITICAL: Gets owner email to send expiration reminders
 * - send-email Netlify function: Must handle 'featured_expiration_reminder' type
 *   → CRITICAL: Sends reminder emails to business owners
 * - SITE_URL environment variable: For calling send-email function
 * 
 * WHAT DEPENDS ON THIS:
 * - Netlify Scheduled Functions: Runs daily at 07:00 UTC
 *   → CRITICAL: Must be configured in netlify.toml or Netlify dashboard
 * 
 * BREAKING CHANGES:
 * - If featured_since format changes → Query fails
 * - If send-email function changes → Email sending fails
 * - If provider or owner lookup fails → Missing emails
 * - If expiration calculation logic changes → Wrong reminders sent
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Test manually: Run with test dates first
 * 2. Verify query: Check that featured providers are found correctly
 * 3. Check date calculations: Verify 30/7/1 day calculations are correct
 * 4. Check emails: Verify emails are sent to correct recipients
 * 5. Monitor logs: Watch for errors in function execution
 * 
 * RELATED FILES:
 * - netlify/functions/send-email.ts: Handles email sending
 * - src/services/emailNotificationService.ts: Frontend email service
 * - src/emails/templates/FeaturedExpirationReminder.tsx: Email template
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs daily via Netlify Scheduled Functions to check for expiring featured listings
export const config = {
  schedule: '0 7 * * *', // 07:00 UTC daily (runs at midnight PST / 7am UTC)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

/**
 * Calculate expiration date from featured_since timestamp (1 year later)
 */
function calculateExpirationDate(featuredSince: string): Date {
  const startDate = new Date(featuredSince)
  const expirationDate = new Date(startDate)
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)
  return expirationDate
}

/**
 * Calculate days until expiration
 */
function daysUntilExpiration(expirationDate: Date): number {
  const now = new Date()
  const diffTime = expirationDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check for expiring featured listings and send reminders
 * Finds featured providers that expire in 30, 7, or 1 days
 */
export const handler: Handler = async (event) => {
  console.log('[CheckFeaturedExpiration] Starting expiration check...')

  try {
    // Get all featured providers
    const { data: featuredProviders, error: fetchError } = await supabase
      .from('providers')
      .select('id, name, featured_since, owner_user_id, is_featured')
      .eq('is_featured', true)
      .not('featured_since', 'is', null) // Must have featured_since date

    if (fetchError) {
      console.error('[CheckFeaturedExpiration] ❌ Failed to fetch featured providers:', fetchError)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to fetch providers',
          details: fetchError.message 
        })
      }
    }

    if (!featuredProviders || featuredProviders.length === 0) {
      console.log('[CheckFeaturedExpiration] ✓ No featured providers found')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'No featured providers to check',
          count: 0
        })
      }
    }

    console.log(`[CheckFeaturedExpiration] 📅 Found ${featuredProviders.length} featured provider(s)`)

    const baseUrl = process.env.SITE_URL || 'https://www.bonitaforward.com'
    let successCount = 0
    let errorCount = 0
    const reminderDays = [30, 7, 1] // Send reminders at these intervals

    // Process each featured provider
    for (const provider of featuredProviders) {
      try {
        if (!provider.featured_since) {
          console.warn(`[CheckFeaturedExpiration] ⚠️ Provider ${provider.id} has no featured_since date, skipping`)
          continue
        }

        // Calculate expiration date (1 year from featured_since)
        const expirationDate = calculateExpirationDate(provider.featured_since)
        const daysUntil = daysUntilExpiration(expirationDate)

        // Only send reminders if expiration is within the reminder window
        if (daysUntil < 0 || daysUntil > 30) {
          // Already expired or more than 30 days away
          continue
        }

        // Check if we should send a reminder today (exactly 30, 7, or 1 days before)
        if (!reminderDays.includes(daysUntil)) {
          continue
        }

        // Get business owner email
        let ownerEmail: string | null = null
        if (provider.owner_user_id) {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(provider.owner_user_id)
          ownerEmail = ownerUser.user?.email || null
        }

        if (!ownerEmail) {
          console.warn(`[CheckFeaturedExpiration] ⚠️ Provider ${provider.id} (${provider.name}) has no owner email, skipping`)
          continue
        }

        // Send reminder email
        try {
          console.log(`[CheckFeaturedExpiration] 📧 Sending ${daysUntil}-day reminder to: ${ownerEmail} for ${provider.name}`)
          const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'featured_expiration_reminder',
              to: ownerEmail,
              data: {
                businessName: provider.name || 'your business',
                expirationDate: expirationDate.toISOString(),
                daysUntilExpiration: daysUntil,
                renewalPrice: '$97/year',
              },
            }),
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error(`[CheckFeaturedExpiration] ❌ Failed to send reminder:`, errorText)
            errorCount++
          } else {
            console.log(`[CheckFeaturedExpiration] ✅ ${daysUntil}-day reminder sent to: ${ownerEmail}`)
            successCount++
          }
        } catch (emailErr) {
          console.error(`[CheckFeaturedExpiration] ❌ Error sending reminder:`, emailErr)
          errorCount++
        }

      } catch (providerErr: any) {
        console.error(`[CheckFeaturedExpiration] ❌ Error processing provider ${provider.id}:`, providerErr)
        errorCount++
      }
    }

    console.log(`[CheckFeaturedExpiration] ✨ Complete! Sent ${successCount} reminder(s), ${errorCount} error(s)`)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Processed ${featuredProviders.length} featured provider(s)`,
        sent: successCount,
        errors: errorCount
      })
    }

  } catch (error: any) {
    console.error('[CheckFeaturedExpiration] ❌ Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    }
  }
}

