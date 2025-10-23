# Calendar Page URL & UX Improvements - October 22, 2025

## Overview
Enhanced the `/calendar` page to hide raw URLs, improve card interactions, and provide a more professional, user-friendly experience with dedicated action buttons and cleaner voting UI.

## Problem
- Raw URLs were showing in event descriptions, looking unprofessional
- No clear call-to-action for users to learn more or register for events
- Poor user experience with unformatted links

## Solution Implemented

### 1. **Added URL Field to CalendarEvent Type** (`src/types/index.ts`)
   - Added optional `url` field to the `CalendarEvent` type
   - Allows events to have explicit registration/information URLs

### 2. **Enhanced iCal Parser** (`src/lib/icalParser.ts`)
   - Updated parser to extract URL property from iCalendar events
   - Properly passes URL through to `CalendarEvent` objects
   - Falls back gracefully when URL is not available

### 3. **Created URL Utility Functions** (`src/utils/eventUrlUtils.ts`)
   - **`extractEventUrl()`**: Intelligently extracts URLs from either:
     - Explicit `url` field (preferred)
     - Embedded URLs in description text (fallback)
   - **`cleanDescriptionFromUrls()`**: Removes raw URLs from descriptions for cleaner presentation
   - **`getButtonTextForUrl()`**: Returns contextual button text based on URL domain:
     - "Register" for registration/signup sites
     - "Get Tickets" for ticketing platforms
     - "RSVP" for RSVP sites
     - "View on Facebook" for Facebook events
     - "View on Meetup" for Meetup events
     - "Learn More" as default

### 4. **Updated Calendar Page** (`src/pages/Calendar.tsx`)
   - **Event Cards (Regular & Recurring)**:
     - Clean descriptions without raw URLs
     - Professional "Learn More" button with external link icon
     - Button only appears when URL is available
     - Contextual button text based on URL type
     - Added "Details" button to view full event modal
     - Improved card layout with `flex-col` for better spacing
   
   - **Event Detail Modal**:
     - Prominent "Learn More" button at top of modal
     - Clean description without raw URLs
     - Full-width, eye-catching button design
     - Consistent styling with event cards

## Key Features

### Intelligent URL Extraction
- Prioritizes explicit URL fields
- Falls back to extracting from description text
- Uses regex pattern to match common URL formats

### Contextual Button Text
The system automatically determines appropriate button text:
```typescript
// Examples:
eventbrite.com → "Register"
ticketmaster.com → "Get Tickets"
facebook.com → "View on Facebook"
meetup.com → "View on Meetup"
// Default → "Learn More"
```

### Clean Descriptions
Raw URLs are automatically stripped from descriptions:
```typescript
// Before: "Join us for ceramics! https://example.com/register"
// After: "Join us for ceramics!"
```

### Professional Design
- Blue buttons matching site theme
- External link icon for clarity
- Hover effects and transitions
- Responsive design for mobile and desktop
- Proper spacing and alignment

## User Experience Improvements

### Before
- ❌ Raw URLs cluttering descriptions
- ❌ No clear call-to-action
- ❌ Users had to copy/paste URLs manually
- ❌ Unprofessional appearance

### After
- ✅ Clean, readable descriptions
- ✅ Clear "Register" / "Learn More" buttons
- ✅ One-click access to event pages
- ✅ Professional, modern appearance
- ✅ Contextual button text
- ✅ Proper external link indicators

## Files Modified
1. `src/types/index.ts` - Added `url` field to CalendarEvent type
2. `src/lib/icalParser.ts` - Enhanced to extract and pass through URLs
3. `src/utils/eventUrlUtils.ts` - **NEW** - URL extraction and cleaning utilities
4. `src/pages/Calendar.tsx` - Updated UI for all event cards and modal, added bookmark functionality

## Technical Details

### URL Regex Pattern
```typescript
/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
```
- Matches both HTTP and HTTPS URLs
- Excludes common URL-breaking characters
- Global and case-insensitive matching

### Button Styling
```css
/* Learn More Button */
px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg

/* Save Button (unsaved) */
px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg

/* Save Button (saved) */
px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg

/* Modal Button (larger) */
px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg
```

### Bookmark/Save Implementation
```typescript
// localStorage key format
const storageKey = `bf-saved-events-${userId}`

// Data structure
type SavedEvents = Set<string> // Set of event IDs

// Persistence
localStorage.setItem(storageKey, JSON.stringify(Array.from(savedEventIds)))

// Loading
const saved = localStorage.getItem(storageKey)
setSavedEventIds(new Set(JSON.parse(saved)))
```

## Testing Checklist

### URL Functionality
- [ ] Test events with explicit URL field
- [ ] Test events with URLs in description
- [ ] Test events without any URLs
- [ ] Verify button text changes based on URL domain
- [ ] Verify external links open in new tabs
- [ ] Verify clean descriptions (no raw URLs showing)

### Card Interaction
- [ ] Verify entire card is clickable
- [ ] Test clicking card opens detail modal
- [ ] Verify "Learn More" button still works (doesn't close modal)
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Verify hover states work correctly

### Bookmark/Save Functionality
- [ ] Verify "Save Event" button appears ONLY on events without URLs
- [ ] Verify "Learn More" button appears on events WITH URLs
- [ ] Test clicking save button (should require sign-in)
- [ ] Verify button changes to green "Saved" state
- [ ] Test unsaving an event (click saved button)
- [ ] Verify saved events persist after page refresh
- [ ] Test with different user accounts (separate saved lists)
- [ ] Verify localStorage keys are user-specific

### Voting Functionality
- [ ] Confirm voting buttons NOT visible on cards
- [ ] Confirm voting buttons ARE visible in detail modal
- [ ] Test upvote functionality in modal
- [ ] Test downvote functionality in modal
- [ ] Verify vote counts update correctly

### Responsive Design
- [ ] Check mobile responsiveness
- [ ] Test both regular and recurring event sections
- [ ] Check event detail modal presentation on mobile
- [ ] Verify "Click for details" text is visible
- [ ] Test card layout on different screen sizes

## Future Enhancements

### Event Management
- Add support for multiple event links (e.g., both registration and info links)
- Add deep link detection for specific event platforms
- Track click-through rates on event buttons
- Add analytics for most popular event sources

### Bookmark Feature
- Add "My Saved Events" page to view all bookmarked events
- Add ability to add notes to saved events
- Add calendar export for saved events (iCal format)
- Add reminder notifications for saved events
- Sync saved events to database (instead of localStorage only)
- Add sharing capabilities for saved event lists
- Add categories/tags for organizing saved events

## Additional UX Improvements (Part 2 & 3)

### Save/Bookmark Button for Events Without URLs
- **New Feature**: Events without registration/ticket URLs now show a "Save Event" button
- **Smart Toggle**: Button changes to green "Saved" state when bookmarked
- **LocalStorage Persistence**: Saved events persist across sessions per user
- **Sign-in Required**: Users must be signed in to save events
- **Icons**: Uses `Bookmark` (empty) and `BookmarkCheck` (filled) icons for clear visual feedback
- **Replaces URL Button**: Only shows when event has no external URL (otherwise shows "Learn More" button)

### Voting Moved to Detail Modal Only
- **Removed** voting buttons from event cards
- **Voting only appears** when user clicks on an event to view full details
- Cleaner, less cluttered card interface
- Reduces decision fatigue on the main page

### Fully Clickable Event Cards
- **Entire card is now clickable** to view event details
- Removed separate "Details" button
- Added subtle "Click for details" hint at bottom of cards
- Improved accessibility with `role="button"` and keyboard support (`Enter` and `Space` keys)
- Better hover states with cursor pointer and color transitions

### Card Layout Improvements
- Event source badge remains visible on cards
- "Click for details" text provides clear affordance
- Cleaner, more spacious layout
- Focus on essential information (title, date, time, location)
- "Learn More" button still accessible for direct event registration

## User Flow

### Before
1. User sees event card with voting buttons
2. Must decide to vote or view details
3. Click "Details" button to see more
4. See full description and vote if desired

### After
1. User sees clean event card focused on content
2. Click anywhere on card to view full details
3. See full description, URL, and voting options together
4. Make informed voting decision after reading full details

## Benefits

### For Users
- ✅ Cleaner, less overwhelming interface
- ✅ More intuitive interaction (whole card clickable)
- ✅ Vote with more context (after reading full details)
- ✅ Faster browsing experience
- ✅ Clear visual hierarchy

### For Engagement
- ✅ Encourages users to read full event details before voting
- ✅ More informed voting decisions
- ✅ Better voting accuracy reflecting genuine interest
- ✅ Reduced accidental clicks on voting buttons

## Notes
- All changes are backward compatible
- Events without URLs will simply not show a button
- Existing events will continue to work without changes
- The system gracefully handles all edge cases
- Voting functionality fully preserved in detail modal
- Keyboard navigation fully supported

