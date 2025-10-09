/**
 * Zip Code Filter Utility
 * Filters calendar events to only include those within ~20 minutes of Chula Vista
 */

// Allowed zip codes within ~20 min of Chula Vista
export const ALLOWED_ZIP_CODES = new Set([
  '91909', '91910', '91911', '91912', '91913', '91914', '91915', '91921',
  '91902', '91950', '91951', '91932', '91933', '92173', '92154', '92139',
  '92113', '92102', '92101', '91945', '91977', '91978', '91941', '91942',
  '92118'
])

/**
 * Extract zip code from address or location string
 * Handles various formats:
 * - "123 Main St, San Diego, CA 92101"
 * - "San Diego CA 92101"
 * - "Location Name, 92101"
 * - "92101-1234" (Zip+4 format)
 */
export function extractZipCode(locationString: string | null | undefined): string | null {
  if (!locationString) return null
  
  // Match 5-digit zip codes (optionally followed by -4 digits)
  const zipMatch = locationString.match(/\b(\d{5})(?:-\d{4})?\b/)
  return zipMatch ? zipMatch[1] : null
}

/**
 * Check if an event is within allowed geographic area
 * Returns true if event should be included
 */
export function isEventInAllowedArea(
  location: string | null | undefined,
  address: string | null | undefined,
  eventTitle?: string
): boolean {
  // Try to extract zip from both location and address
  const locationZip = extractZipCode(location)
  const addressZip = extractZipCode(address)
  
  const zip = locationZip || addressZip
  
  if (!zip) {
    console.log(`[Zip Filter] No zip code found for "${eventTitle || 'Unknown Event'}" (location: "${location || 'N/A'}", address: "${address || 'N/A'}") - REJECTING`)
    return false
  }
  
  const isAllowed = ALLOWED_ZIP_CODES.has(zip)
  console.log(`[Zip Filter] "${eventTitle || 'Unknown Event'}" zip ${zip}: ${isAllowed ? '✓ ALLOWED' : '✗ REJECTED'}`)
  
  return isAllowed
}

/**
 * Filter an array of events by allowed zip codes
 * Logs statistics about filtering
 */
export function filterEventsByZipCode<T extends { title: string, location?: string | null, address?: string | null }>(
  events: T[],
  sourceName: string
): T[] {
  console.log(`[Zip Filter] ${sourceName}: Filtering ${events.length} events...`)
  
  const filteredEvents = events.filter(event => {
    const isAllowed = isEventInAllowedArea(event.location, event.address, event.title)
    if (!isAllowed) {
      console.log(`[${sourceName}] Filtered out: "${event.title}" (location: ${event.location || 'N/A'})`)
    }
    return isAllowed
  })
  
  const rejectedCount = events.length - filteredEvents.length
  console.log(`[Zip Filter] ${sourceName}: Kept ${filteredEvents.length} events, rejected ${rejectedCount} events`)
  
  return filteredEvents
}

