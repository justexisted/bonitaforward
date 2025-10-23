/**
 * Utility functions for handling URLs in calendar events
 */

/**
 * Extract URL from event description or explicit url field
 * Prioritizes explicit url field over URLs found in description
 */
export const extractEventUrl = (event: { url?: string | null; description?: string | null }): string | null => {
  // First check if there's an explicit URL field
  if (event.url && event.url.trim() !== '') {
    return event.url.trim()
  }
  
  // Try to extract URL from description
  if (event.description) {
    // Match common URL patterns
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
    const matches = event.description.match(urlRegex)
    
    if (matches && matches.length > 0) {
      // Return the first valid URL found
      return matches[0].trim()
    }
  }
  
  return null
}

/**
 * Remove URLs from description text to make it cleaner
 * This helps hide raw URLs that will be presented as buttons instead
 */
export const cleanDescriptionFromUrls = (description: string | null | undefined): string => {
  if (!description) return ''
  
  // Remove URLs but keep the rest of the text
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
  const cleaned = description.replace(urlRegex, '').trim()
  
  // Clean up extra whitespace
  return cleaned.replace(/\s+/g, ' ').trim()
}

/**
 * Get appropriate button text based on URL domain
 * Returns contextual button text like "Register", "Learn More", "Get Tickets", etc.
 */
export const getButtonTextForUrl = (url: string | null): string => {
  if (!url) return 'Learn More'
  
  const lowerUrl = url.toLowerCase()
  
  // Registration/signup sites
  if (lowerUrl.includes('register') || lowerUrl.includes('signup') || lowerUrl.includes('eventbrite')) {
    return 'Register'
  }
  
  // Ticket/payment sites
  if (lowerUrl.includes('ticket') || lowerUrl.includes('buy') || lowerUrl.includes('purchase')) {
    return 'Get Tickets'
  }
  
  // RSVP sites
  if (lowerUrl.includes('rsvp') || lowerUrl.includes('attend')) {
    return 'RSVP'
  }
  
  // Facebook events
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.me')) {
    return 'View on Facebook'
  }
  
  // Meetup events
  if (lowerUrl.includes('meetup.com')) {
    return 'View on Meetup'
  }
  
  // Default
  return 'Learn More'
}

