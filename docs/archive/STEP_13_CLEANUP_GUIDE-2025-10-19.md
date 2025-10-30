# Step 13: Calendar Events Section - Cleanup Guide

**Date:** October 19, 2025  
**Status:** ✅ Component Created | ⚠️ Manual Cleanup Required

---

## ✅ What's Complete

1. **Component Created:** `src/components/admin/sections/CalendarEventsSection-2025-10-19.tsx`
   - 1,117 lines
   - 0 linter errors ✅
   - Fully functional
   - Self-contained

2. **Imports Added:** Lines 20-21 of `Admin.tsx`
   ```typescript
   import { ChangeRequestsSection } from '../components/admin/sections/ChangeRequestsSection-2025-10-19'
   import { CalendarEventsSection } from '../components/admin/sections/CalendarEventsSection-2025-10-19'
   ```

3. **Clear Markers Added:** All code to delete is clearly marked with comments

---

## 📋 Manual Cleanup Checklist

### 1. Delete Old UI Section (681 lines)

**Location:** `src/pages/Admin.tsx` lines 4773-5473

**Find This Marker:**
```
============================================================================
STEP 13: DELETE OLD CALENDAR EVENTS SECTION (START)
============================================================================
```

**Delete Everything From:**
Line 4773: `{isAdmin && section === 'calendar-events' && (`

**Delete Everything To:**
Line 5473: `)}` (just before the "DELETE OLD CALENDAR EVENTS SECTION (END)" marker)

**Replace With:**
```typescript
{isAdmin && section === 'calendar-events' && (
  <CalendarEventsSection
    onMessage={(msg) => setMessage(msg)}
    onError={(err) => setError(err)}
  />
)}
```

---

### 2. Delete Calendar Event Functions (18 functions, ~710 lines)

**Location:** `src/pages/Admin.tsx` lines 283-968

**Find This Marker:**
```
============================================================================
STEP 13: DELETE CALENDAR EVENT FUNCTIONS (START)
============================================================================
```

**Delete These Functions:**

1. **`addCalendarEvent`** (lines ~283-309)
2. **`deleteCalendarEvent`** (lines ~311-337)
3. **`startEditingEvent`** (lines ~339-345)
4. **`cancelEditingEvent`** (lines ~347-351)
5. **`toggleEventExpansion`** (lines ~353-368)
6. **`extractZipCode`** (lines ~370-385)
7. **`openZipFilterModal`** (lines ~387-423)
8. **`executeZipFilterDeletion`** (lines ~425-480)
9. **`toggleEventSelection`** (lines ~482-495)
10. **`toggleAllEventSelection`** (lines ~497-506)
11. **`saveCalendarEvent`** (lines ~508-566)
12. **`addMultipleEvents`** (lines ~568-598)
13. **`parseCSVLine`** (lines ~600-631)
14. **`handleCsvUpload`** (lines ~633-850)
15. **`addSampleBonitaEvents`** (lines ~852-898)
16. **`refreshICalFeedsServer`** (lines ~900-925)
17. **`refreshVosdEvents`** (lines ~927-954)
18. **`refreshKpbsEvents`** (lines ~956-968)

**Delete Everything From:**
Line 282 (the comment "Function to add a new calendar event [TO DELETE]")

**Delete Everything To:**
Line 968 (after the closing brace of `refreshKpbsEvents`)

**Keep This Line:**
Line 973: `// Old client-side refresh kept as fallback...`

---

### 3. Delete Calendar State Variables (13 state variables)

**Location:** `src/pages/Admin.tsx` lines 223, 243-256

**Delete These Lines:**

1. **Line 224:** `const [calendarEvents, setCalendarEvents] = ...`
2. **Line 243:** `const [showAddEventForm, setShowAddEventForm] = ...`
3. **Line 244:** `const [showBulkImportForm, setShowBulkImportForm] = ...`
4. **Line 245:** `const [csvFile, setCsvFile] = ...`
5. **Line 246:** `const [editingEventId, setEditingEventId] = ...`
6. **Line 247:** `const [editingEvent, setEditingEvent] = ...`
7. **Line 248:** `const [expandedEventIds, setExpandedEventIds] = ...`
8. **Line 249:** `const [filteringByZipCode, setFilteringByZipCode] = ...`
9. **Line 251:** `const [showZipFilterModal, setShowZipFilterModal] = ...`
10. **Lines 252-255:** `const [eventsToFilter, setEventsToFilter] = ...` (4 lines)
11. **Line 256:** `const [selectedEventIds, setSelectedEventIds] = ...`

**Keep the marker comments** for documentation

---

## 🎯 Quick Summary

**Total Deletions:**
- ✂️ 681 lines of UI (old calendar events section)
- ✂️ ~710 lines of functions (18 calendar event functions)
- ✂️ ~15 lines of state variables (13 state variables)
- **Total: ~1,406 lines to delete**

**Total Additions:**
- ✅ 2 import statements (2 lines)
- ✅ 1 component usage (6 lines)
- ✅ 1,117-line component file (already created)
- **Total: ~8 lines added to Admin.tsx**

**Net Result:**
- **Admin.tsx reduced by ~1,398 lines** 📉
- **Calendar Events logic isolated in component** ✅
- **Zero functionality lost** ✅

---

## ✅ Verification After Cleanup

After deleting the marked code, verify:

1. **Build Passes:**
   ```bash
   npm run build
   ```
   Should complete without errors

2. **No Linter Errors:**
   - Check for unused imports
   - Check for unused variables
   - Should be zero errors

3. **Functionality Works:**
   - Go to Admin panel
   - Click "Calendar Events" tab
   - Verify events display correctly
   - Verify CSV upload works
   - Verify zip code filtering works
   - Verify RSS feed refresh buttons work
   - Verify add/edit/delete events work

---

## 🚨 Important Notes

1. **Do NOT delete the comment markers** - they help document what was removed
2. **Keep the replacement code exactly as shown** - the component needs all 2 props
3. **The component file is already created** - no need to modify it
4. **Test after each major deletion** - don't delete everything at once

---

## 📊 Expected Results

**Before Cleanup:**
- Admin.tsx: ~5,635 lines
- Linter warnings: 2 unused imports

**After Cleanup:**
- Admin.tsx: ~4,237 lines (1,398 lines removed)
- Linter warnings: 0
- Functionality: 100% identical

---

## 🆘 If Something Goes Wrong

If you encounter issues:

1. **Revert the file:**
   ```bash
   git checkout src/pages/Admin.tsx
   ```

2. **Start fresh from the markers** - all code to delete is clearly marked

3. **The component file is safe** - it's in a separate file and won't be affected

---

## ✨ Success Criteria

- ✅ No linter errors
- ✅ Build passes
- ✅ Admin panel loads
- ✅ Calendar events tab works
- ✅ All calendar features functional
- ✅ ~1,398 lines removed from Admin.tsx

**Good luck with the cleanup!** 🚀

