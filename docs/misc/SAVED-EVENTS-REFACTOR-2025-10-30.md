# Saved Events Refactor - 2025-10-30

## ✅ **Change Summary**

Refactored where saved/bookmarked events are displayed:
- **Before:** Saved events showed on the Calendar page
- **After:** Saved events show in the Account page under "My Saved Events" section
- **Calendar page:** Now has a toggle button to optionally show/hide saved events

---

## 🔄 **What Changed**

### 1. **Account Page (`/account`) - "My Saved Events" Section**

#### Before:
- "My Events" section showed events CREATED by the user
- Empty state: "No events created yet" + "Create Event" button

#### After:
- **Renamed to "My Saved Events"**
- Now shows events the user has BOOKMARKED/SAVED
- Empty state: "No saved events yet" + description + "Browse Calendar" button
- This is the PRIMARY place users go to see their saved events

### 2. **Calendar Page (`/calendar`) - Toggle Button**

#### Before:
- "Your Saved Events" section always visible (if user had saved events)
- Took up space at the top of the calendar

#### After:
- Saved events section HIDDEN by default
- New toggle button: "Show Saved Events (X)" with count badge
- Button style: Green background, bookmark icon
- Clicking toggles the saved events section visibility
- When visible, shows "Hide Saved Events (X)"

---

## 📁 **Files Changed**

### 1. `src/pages/account/dataLoader.ts`

**Added new function:**
```typescript
/**
 * Load events SAVED/BOOKMARKED by the user (from user_saved_events table)
 * This is what shows in "My Saved Events" section on account page
 */
export async function loadMyEvents(userId: string): Promise<CalendarEvent[]> {
  // Gets event IDs from user_saved_events table
  // Then fetches full event details from calendar_events table
  // Returns events ordered by date (upcoming first)
}
```

**Also added (for future use):**
```typescript
/**
 * Load events CREATED by the user (for potential future use)
 */
export async function loadMyCreatedEvents(userId: string): Promise<CalendarEvent[]> {
  // Original implementation preserved
}
```

### 2. `src/pages/Account.tsx`

**Changes:**
- ✅ Title changed: "My Events" → "My Saved Events"
- ✅ Empty state updated:
  - Message: "No saved events yet"
  - Description: "Browse the calendar and save events you're interested in attending"
  - Button: "Create Event" → "Browse Calendar"
- ✅ Changed for both desktop and mobile views

### 3. `src/pages/Calendar.tsx`

**Added state:**
```typescript
const [showSavedEvents, setShowSavedEvents] = useState(false) // Hidden by default
```

**Added toggle button:**
```typescript
<button
  onClick={() => setShowSavedEvents(!showSavedEvents)}
  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700..."
>
  <BookmarkCheck className="w-4 h-4" />
  <span>{showSavedEvents ? 'Hide' : 'Show'} Saved Events ({savedEvents.length})</span>
</button>
```

**Updated saved events section:**
```typescript
{/* Saved Events Section (Hidden by Default) */}
{auth.isAuthed && savedEvents.length > 0 && showSavedEvents && (
  // ... saved events grid ...
)}
```

---

## 🎯 **User Experience**

### **Scenario 1: User saves an event**
1. User is browsing calendar
2. Clicks save/bookmark icon on event card
3. Event is saved to database
4. **NEW:** User should go to `/account` → "My Saved Events" to see it
5. **OPTIONAL:** On calendar, click "Show Saved Events" button to see it there

### **Scenario 2: User wants to view saved events**
1. **Primary:** Go to `/account` page
2. Click "My Saved Events" tab
3. See all saved events with full details
4. **Alternative:** On calendar page, click "Show Saved Events" button

### **Scenario 3: User on calendar page**
1. Calendar page loads
2. Regular events are visible
3. Saved events are HIDDEN by default
4. If user has saved events, see toggle button: "Show Saved Events (5)"
5. Click button to expand saved events section
6. Click "Hide Saved Events (5)" to collapse

---

## 🎨 **UI Elements**

### Toggle Button (Calendar Page)
- **Background:** Green-50 (light green)
- **Hover:** Green-100
- **Text:** Green-700
- **Border:** Green-200
- **Icon:** BookmarkCheck (lucide-react)
- **Text:** "Show Saved Events (X)" or "Hide Saved Events (X)"
- **Position:** Above regular events grid

### My Saved Events Section (Account Page)
- **Title:** "My Saved Events"
- **Empty State Icon:** CalendarDays (neutral-300)
- **Button:** Blue-600 background, "Browse Calendar"
- **Description:** Helpful text explaining how to save events

---

## 📊 **Data Flow**

### Account Page:
```
User visits /account
  → loadMyEvents(userId) called
  → Queries user_saved_events table for event_id list
  → Fetches full event details from calendar_events
  → Displays in "My Saved Events" section
```

### Calendar Page:
```
User visits /calendar
  → savedEvents already loaded
  → showSavedEvents = false (hidden by default)
  → User clicks toggle button
  → showSavedEvents = true
  → Saved events section becomes visible
```

---

## ✅ **Benefits**

1. **Cleaner Calendar Page:** Events section isn't cluttered with saved events
2. **Better Organization:** Saved events have their own dedicated place
3. **User Choice:** Users can still see saved events on calendar if they want
4. **Clearer Purpose:** "My Saved Events" name is more descriptive
5. **Better Empty State:** Guides users to browse and save events

---

## 🧪 **Testing**

### Test 1: Account Page - No Saved Events
1. Sign in as a new user (no saved events)
2. Go to `/account`
3. Click "My Saved Events" tab
4. **Expected:** See empty state with "No saved events yet" message
5. Click "Browse Calendar" button
6. **Expected:** Navigates to `/calendar`

### Test 2: Account Page - With Saved Events
1. Sign in as user with saved events
2. Go to `/account`
3. Click "My Saved Events" tab
4. **Expected:** See list of saved events with date, time, location

### Test 3: Calendar Page - Hidden by Default
1. Sign in as user with saved events
2. Go to `/calendar`
3. **Expected:** Saved events section is NOT visible
4. **Expected:** See "Show Saved Events (X)" button with count

### Test 4: Calendar Page - Toggle Button
1. On `/calendar` with saved events
2. Click "Show Saved Events" button
3. **Expected:** Saved events section expands below button
4. **Expected:** Button text changes to "Hide Saved Events"
5. Click button again
6. **Expected:** Section collapses

### Test 5: Save Event Flow
1. Go to `/calendar`
2. Click save icon on any event
3. **Expected:** Event saves successfully
4. Go to `/account` → "My Saved Events"
5. **Expected:** See the saved event in the list

---

## 🔄 **Migration Notes**

### No Database Changes Required
- Uses existing `user_saved_events` table
- Uses existing `calendar_events` table
- No new columns or tables needed

### Backward Compatible
- Existing saved events data works immediately
- No data migration script needed
- `loadMyCreatedEvents` preserved for future use (if needed to show user-created events)

---

## 📝 **Future Enhancements**

Potential improvements:
1. Add a "Created Events" section (using `loadMyCreatedEvents`)
2. Add filters/sorting to "My Saved Events"
3. Add search to "My Saved Events"
4. Add calendar view for saved events
5. Remember toggle state (localStorage)
6. Add unsave button in Account page saved events list

---

**Status:** ✅ **READY TO DEPLOY**

**Related Files:**
- `src/pages/account/dataLoader.ts` (loadMyEvents refactored)
- `src/pages/Account.tsx` (section title and empty state updated)
- `src/pages/Calendar.tsx` (toggle button added, section hidden by default)

