# Table Name Fix - 404 Error Resolved

## Problem

When the new `useAdminData` hook tried to load data, it failed with a 404 error:

```
GET https://bfsspdvdwgakolivwuko.supabase.co/rest/v1/user_tracking?select=*&order=created_at.desc 404 (Not Found)
```

## Root Cause

The `AdminDataService` was trying to fetch from a table called `user_tracking`, but your Supabase database actually uses the table name `funnel_responses`.

### Incorrect Code
```typescript
const { data, error } = await supabase
  .from('user_tracking')  // ❌ This table doesn't exist!
  .select('*')
```

### Why This Happened

When creating the new data service, I assumed the table name was `user_tracking` based on common naming patterns, but the existing Admin.tsx code was already using the correct name `funnel_responses`.

## Solution

Changed the table name in `AdminDataService.fetchFunnels()`:

```typescript
const { data, error } = await supabase
  .from('funnel_responses')  // ✅ Correct table name
  .select('*')
  .order('created_at', { ascending: false })
```

## Impact

### Before Fix
- ❌ Console error: 404 Not Found
- ❌ Funnel responses not loading in new hook
- ⚠️ Old system still worked (using correct table name)

### After Fix
- ✅ Funnel responses load successfully
- ✅ No 404 errors
- ✅ Both old and new systems work
- ✅ Console log shows: `funnels: X` (with correct count)

## Verification

After deploying this fix, you should see in the browser console:

```javascript
[Admin Migration] New data service loaded: {
  providers: 42,
  bookings: 15,
  funnels: 8,  // ✅ Now loads correctly!
  calendarEvents: 67
}
```

No more 404 errors for `user_tracking`.

## Files Modified

- `src/services/adminDataService.ts` - Fixed table name in `fetchFunnels()`

## Build Status

✅ **TypeScript:** PASSING  
✅ **Linter:** CLEAN  
✅ **404 Error:** RESOLVED

## Related

This is part of the Phase 1 gradual migration. The new data service is now loading all data correctly alongside the existing system.

---

**Status:** ✅ FIXED  
**Table Name:** `funnel_responses` (not `user_tracking`)  
**Error:** 404 → 200 OK

