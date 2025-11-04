# Event Images Breakage Analysis - November 3, 2025

## Problem Summary

**Status**: Events with database images are showing gradient fallbacks instead of their stored images.

**Symptoms**:
- Console shows: "41 have database images" but they're displaying as gradients
- 33 events correctly using gradients (they don't have database images)
- Images were working before, now broken

## Root Cause Analysis

### What Was Working Before

**Original System (October 22, 2025)**:
1. Images fetched from Unsplash API on page load
2. Cached in localStorage for 7 days
3. Gradient fallbacks for errors/offline
4. **All events got images** (either Unsplash or gradient)

### Migration to Database Storage

**Changes Made**:
1. Added `image_url` and `image_type` columns to `calendar_events` table
2. Created population script (`populate-event-images.ts`) to save images to database
3. Modified frontend to check `event.image_url` from database first
4. Removed Unsplash API calls from frontend (moved to scheduled function)

**The Break**:
- Frontend now checks `event.image_url` directly from database
- If `image_url` exists, it should use it
- If `image_url` doesn't exist, it uses gradient
- **BUT**: Events with database images are still showing gradients

## Why It Broke

### Hypothesis 1: RLS Policy Blocking `image_url` Field

**Check**: RLS policies for `calendar_events` table
- SELECT policy: `USING (true)` - Should allow reading all fields
- **BUT**: If RLS was changed or a new policy was added, it might block `image_url`

**Evidence Needed**:
- Check if `image_url` is being returned in query results
- Check RLS policies in Supabase dashboard
- Verify if any policies were modified recently

### Hypothesis 2: Query Not Selecting `image_url`

**Check**: `fetchCalendarEvents()` uses `.select('*')`
- Should include all columns including `image_url` and `image_type`
- **BUT**: If RLS is filtering columns, `*` might not include `image_url`

**Evidence Needed**:
- Log actual event objects to see if `image_url` is present
- Check if `image_url` is null/undefined in returned events
- Verify query is selecting all columns

### Hypothesis 3: External Events Overriding Database Events

**Check**: `fetchCalendarEvents()` combines:
1. Database events (should have `image_url`)
2. RSS events (won't have `image_url`)
3. iCalendar events (won't have `image_url`)

**Potential Issue**:
- If external events have same IDs as database events, they might override
- External events don't have `image_url`, so they get gradients
- Database events with images get lost in the merge

**Evidence Needed**:
- Check if event IDs are unique
- Check if external events are overriding database events
- Verify deduplication logic

### Hypothesis 4: Event Card Logic Not Checking Database Images

**Check**: `EventCard.tsx` checks `event.image_url && event.image_type`
- Should use database image if both exist
- **BUT**: If `image_url` is null/undefined, it uses gradient

**Evidence Needed**:
- Check if `event.image_url` is actually present in EventCard
- Check if `image_type` is being checked correctly
- Verify the condition logic

## Previous Fix (What We Need to Avoid Breaking)

### The Original Fix (October 22)

**What It Did**:
1. Added `getEventHeaderImage()` function that:
   - Checks database first (`event.image_url`)
   - Falls back to Unsplash API
   - Falls back to gradient
2. Used `preloadEventImages()` to batch load images
3. Images stored in component state (`eventImages` Map)

**Key Principle**:
- **Priority 1**: Database image (`event.image_url`)
- **Priority 2**: Unsplash API (with caching)
- **Priority 3**: Gradient fallback

### The Migration (Recent Changes)

**What Changed**:
1. Removed Unsplash API calls from frontend
2. Moved image population to scheduled Netlify function
3. Frontend now only checks database, then gradient

**What Should Still Work**:
- Database images should be checked first
- If `image_url` exists, use it
- If `image_url` doesn't exist, use gradient

**What Broke**:
- Events with database images are showing gradients instead

## How to Fix (Diagnostic Steps)

### Step 1: Verify Database Images Exist

```sql
-- Check if events have image_url in database
SELECT 
    id, 
    title, 
    image_url, 
    image_type,
    CASE 
        WHEN image_url IS NOT NULL THEN 'HAS IMAGE'
        ELSE 'NO IMAGE'
    END as status
FROM calendar_events
ORDER BY created_at DESC
LIMIT 50;
```

**Expected**: Should see 41 events with `image_url` populated

### Step 2: Check RLS Policies

```sql
-- Check RLS policies for calendar_events
SELECT 
    polname, 
    permissive, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE tablename = 'calendar_events';
```

**Expected**: SELECT policy should allow reading all fields (`USING (true)`)

### Step 3: Verify Query Results

Add logging to `fetchCalendarEvents()`:

```typescript
const { data: dbEvents, error: dbError } = await supabase
  .from('calendar_events')
  .select('*')
  .order('date', { ascending: true })

// LOG: Check if image_url is present
console.log('[DEBUG] Database events sample:', dbEvents?.slice(0, 5).map(e => ({
  id: e.id,
  title: e.title,
  hasImageUrl: !!e.image_url,
  imageUrl: e.image_url,
  imageType: e.image_type
})))
```

**Expected**: Should see `image_url` populated for events that have images

### Step 4: Check Event Card Logic

Verify `EventCard.tsx` is receiving `image_url`:

```typescript
// In EventCard component
console.log('[DEBUG] Event data:', {
  id: event.id,
  title: event.title,
  hasImageUrl: !!event.image_url,
  imageUrl: event.image_url,
  imageType: event.image_type
})
```

**Expected**: Events with database images should have `image_url` populated

## Prevention Checklist

### Before Making Changes

- [ ] **Check RLS policies** - Ensure SELECT policy allows reading `image_url`
- [ ] **Verify query selects all columns** - Use `.select('*')` or explicitly include `image_url`
- [ ] **Test with actual data** - Don't assume database images exist, verify
- [ ] **Check event merging logic** - Ensure database events aren't overridden
- [ ] **Verify event card priority** - Database images must be checked first

### After Making Changes

- [ ] **Test with events that have database images** - Verify they show images
- [ ] **Test with events without database images** - Verify they show gradients
- [ ] **Check console logs** - Verify image counts match expectations
- [ ] **Test in production** - Database images should work in production too

### Documentation Requirements

- [ ] **Document RLS policies** - Note which policies affect `image_url`
- [ ] **Document query requirements** - Must select `image_url` and `image_type`
- [ ] **Document event merging** - How external events are combined with database events
- [ ] **Document priority order** - Database → Gradient (Unsplash removed)

## Files to Watch

### Critical Files (Don't Break These)

1. **`src/pages/Calendar.tsx`** - `fetchCalendarEvents()` must select `image_url`
2. **`src/components/EventCard.tsx`** - Must check `event.image_url` first
3. **`src/components/CalendarSection.tsx`** - Must check `event.image_url` first
4. **`ops/migrations/add-image-url-to-calendar-events.sql`** - Columns must exist

### RLS Policies (Must Allow Reading)

- `calendar_events` SELECT policy: `USING (true)` - Allows reading all fields
- No policy should filter out `image_url` or `image_type`

### Query Logic (Must Include Image Fields)

- `.select('*')` should include `image_url` and `image_type`
- If using explicit select, must include both fields
- Event merging must preserve `image_url` from database events

## Summary

**The Problem**: Events with database images are showing gradients instead of images.

**Most Likely Causes**:
1. RLS policy blocking `image_url` field
2. Query not selecting `image_url` (though `.select('*')` should work)
3. External events overriding database events in merge
4. Event card not receiving `image_url` in props

**The Fix**: 
1. Verify database images exist (SQL query)
2. Check RLS policies allow reading `image_url`
3. Add logging to verify `image_url` is in query results
4. Check event card receives `image_url` in props
5. Fix the root cause (likely RLS or query)

**Prevention**: Always verify database images exist before assuming they're missing, and check RLS policies don't block `image_url` field.


