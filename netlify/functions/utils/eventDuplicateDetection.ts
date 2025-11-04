/**
 * EVENT DUPLICATE DETECTION UTILITY
 * 
 * Provides shared logic for detecting and removing duplicate calendar events.
 * Used by all event fetching functions to ensure consistent duplicate detection.
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - Event objects must have: title (string), source (string), date (string - ISO format)
 * 
 * WHAT DEPENDS ON THIS:
 * - fetch-kpbs-events.ts: Uses removeDuplicateEvents to filter KPBS events
 * - scheduled-fetch-events.ts: Uses removeDuplicateEvents and isDuplicateEvent for iCalendar feeds
 * - manual-fetch-events.ts: Uses removeDuplicateEvents for manual event fetching
 * 
 * BREAKING CHANGES:
 * - If event structure changes (title/source/date fields) → duplicate detection fails
 * - If duplicate detection algorithm changes → all three functions affected
 * - If date format changes from ISO string → date comparison fails
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Ensure event objects have title, source, date properties
 * 2. Test with sample events from all three sources
 * 3. Verify logging output is consistent
 * 4. Check that duplicate removal works correctly
 * 
 * RELATED FILES:
 * - netlify/functions/fetch-kpbs-events.ts
 * - netlify/functions/scheduled-fetch-events.ts
 * - netlify/functions/manual-fetch-events.ts
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

/**
 * Event interface for duplicate detection
 * Events must have at least these properties
 */
export interface EventWithTitleSourceDate {
  title: string
  source: string
  date: string // ISO date string
}

/**
 * Options for duplicate detection
 */
export interface DuplicateOptions {
  /**
   * Whether to allow duplicates across different sources
   * If false, events with same title/date but different sources are considered duplicates
   * Default: false (must match source)
   */
  allowCrossSource?: boolean
  
  /**
   * Time window in milliseconds for date matching
   * Default: 1 hour (60 * 60 * 1000)
   */
  dateWindowMs?: number
}

/**
 * Normalize event title for comparison
 * Removes special characters, converts to lowercase, trims whitespace
 * 
 * @param title - Event title to normalize
 * @returns Normalized title string
 */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/[^\w\s]/g, '')
}

/**
 * Check if two events are duplicates
 * 
 * Uses two matching strategies:
 * 1. Exact match: title, source, and date all match exactly
 * 2. Fuzzy match: normalized titles match (contains/equals) AND dates within 1 hour
 * 
 * @param event1 - First event to compare
 * @param event2 - Second event to compare
 * @param options - Duplicate detection options
 * @returns true if events are duplicates, false otherwise
 */
export function isDuplicateEvent<T extends EventWithTitleSourceDate>(
  event1: T,
  event2: T,
  options: DuplicateOptions = {}
): boolean {
  const { allowCrossSource = false, dateWindowMs = 60 * 60 * 1000 } = options
  
  // Exact match: title, source, and date all match exactly
  if (
    event1.title === event2.title &&
    event1.source === event2.source &&
    event1.date === event2.date
  ) {
    return true
  }
  
  // For cross-source duplicates, skip source check
  if (allowCrossSource && event1.source !== event2.source) {
    // Only check title and date match for cross-source duplicates
    const e1Title = normalizeTitle(event1.title)
    const e2Title = normalizeTitle(event2.title)
    
    const titleMatch = e1Title === e2Title ||
      e1Title.includes(e2Title) ||
      e2Title.includes(e1Title)
    
    if (!titleMatch) {
      return false
    }
    
    // Check if dates are within time window
    const date1 = new Date(event1.date).getTime()
    const date2 = new Date(event2.date).getTime()
    const dateMatch = Math.abs(date1 - date2) < dateWindowMs
    
    return dateMatch
  }
  
  // Fuzzy match: similar title (case-insensitive, normalized) and date within time window
  const e1Title = normalizeTitle(event1.title)
  const e2Title = normalizeTitle(event2.title)
  
  // Check if titles are very similar (>80% match or one contains the other)
  const titleMatch = e1Title === e2Title ||
    e1Title.includes(e2Title) ||
    e2Title.includes(e1Title)
  
  if (!titleMatch) {
    return false
  }
  
  // Check if dates are within time window (default 1 hour)
  const date1 = new Date(event1.date).getTime()
  const date2 = new Date(event2.date).getTime()
  const dateMatch = Math.abs(date1 - date2) < dateWindowMs
  
  // Both title and date must match, and source must match (unless allowCrossSource)
  return titleMatch && dateMatch && (allowCrossSource || event1.source === event2.source)
}

/**
 * Remove duplicate events from an array
 * 
 * Keeps the first occurrence of each unique event based on duplicate detection logic.
 * Logs statistics about how many duplicates were removed.
 * 
 * @param events - Array of events to filter
 * @param sourceName - Name of the source (for logging purposes)
 * @param options - Duplicate detection options
 * @returns Array of unique events
 */
export function removeDuplicateEvents<T extends EventWithTitleSourceDate>(
  events: T[],
  sourceName: string,
  options: DuplicateOptions = {}
): T[] {
  const uniqueEvents = events.filter((event, index, self) => {
    return index === self.findIndex(e => isDuplicateEvent(e, event, options))
  })
  
  const duplicatesRemoved = events.length - uniqueEvents.length
  console.log(`Found ${events.length} total events, ${uniqueEvents.length} unique events (removed ${duplicatesRemoved} duplicates)`)
  
  return uniqueEvents
}

