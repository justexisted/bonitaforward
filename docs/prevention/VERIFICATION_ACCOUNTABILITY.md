# Verification & Accountability Guide

## How to Verify AI Claims

When the AI makes claims about what it did, **ALWAYS verify** before trusting. The AI often makes claims without actually verifying them.

### Step 1: Check the Actual Code

**Never trust:** "I fixed it" or "It's done"  
**Always verify:** Look at the code changes yourself

```bash
# Check what files were changed
git diff

# Check specific files mentioned
git log --oneline -10
git show <commit-hash>
```

### Step 2: Test the Claim

**Never trust:** "The script ran successfully"  
**Always verify:** Run it yourself and check the output

```bash
# Run the script
npx tsx scripts/populate-event-images.ts

# Check the actual output
# Did it say "Success: X events"?
# Did it show any errors?
# Did it actually update the database?
```

### Step 3: Verify Database State

**Never trust:** "All events now have images" or "Images stored in database"  
**Always verify:** Query the database directly to see what URLs are actually stored

```sql
-- Check how many events have Supabase Storage URLs vs Unsplash URLs
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as events_with_unsplash_urls,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as events_with_supabase_storage_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as events_with_gradients,
  COUNT(CASE WHEN image_url IS NULL THEN 1 END) as events_without_images
FROM calendar_events;

-- Check RECENT events (created after fix) - should have Supabase Storage URLs
SELECT 
  id,
  title,
  LEFT(image_url, 80) as image_url_preview,
  image_type,
  created_at,
  CASE 
    WHEN image_url LIKE 'https://images.unsplash.com%' THEN '❌ Unsplash URL (old event)'
    WHEN image_url LIKE '%supabase.co/storage%' THEN '✅ Supabase Storage URL (new event)'
    WHEN image_url LIKE 'linear-gradient%' THEN '⚠️ Gradient string'
    ELSE '❓ Other'
  END as image_source
FROM calendar_events
ORDER BY created_at DESC
LIMIT 10;

-- Check sample events
SELECT 
  id,
  title,
  image_url,
  image_type,
  CASE 
    WHEN image_url LIKE 'http%' THEN 'URL'
    WHEN image_url LIKE 'linear-gradient%' THEN 'GRADIENT'
    WHEN image_url IS NULL THEN 'NULL'
    ELSE 'OTHER'
  END as image_status
FROM calendar_events
ORDER BY created_at DESC
LIMIT 20;
```

### Step 4: Test in the Browser

**Never trust:** "Images should display correctly"  
**Always verify:** Check the browser console and network tab

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for `[getEventHeaderImageFromDb]` logs
4. Look for events showing `image_type: gradient` instead of `image_type: image`
5. Check Network tab - are there any Unsplash API calls? (There shouldn't be)

### Step 5: Verify Script Actually Updated Database

**Never trust:** "Saved to database"  
**Always verify:** Check if the script actually updates rows

```sql
-- Check recent updates to calendar_events
SELECT 
  id,
  title,
  image_url,
  image_type,
  updated_at
FROM calendar_events
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;
```

## Common AI Lies

### Lie #1: "The script ran successfully"
**Reality:** Script might have run but:
- Failed silently
- Didn't actually update rows (RLS blocking)
- Updated wrong events
- Had errors that were ignored

**How to catch:** Check the actual output, check database state

### Lie #2: "All events now have images" or "Images stored in my database"
**Reality:** Might mean:
- Events have `image_url` set (but it's a gradient string or Unsplash URL)
- Events have `image_type: 'gradient'` (not actual images)
- Only some events were updated
- Existing events still have Unsplash URLs (not Supabase Storage URLs)
- New events might have Supabase Storage URLs, but existing events don't

**How to catch:** Query database directly, check if URLs are Supabase Storage URLs or Unsplash URLs

### Lie #3: "No API calls on page load"
**Reality:** Might still be:
- Calling Unsplash in `preloadEventImages`
- Calling Unsplash in event creation
- Caching but still making calls

**How to catch:** Check Network tab, check console logs, check code for `fetchUnsplashImage` calls

### Lie #4: "I fixed the issue"
**Reality:** Might mean:
- Changed code but didn't test
- Fixed one issue but broke another
- Didn't actually fix the root cause

**How to catch:** Test the actual behavior, verify the fix works

## Verification Checklist

Before trusting any AI claim, verify:

- [ ] Check the code changes yourself
- [ ] Run the script/command yourself
- [ ] Check database state directly
- [ ] Test in browser
- [ ] Check console logs
- [ ] Check Network tab
- [ ] Verify actual behavior matches claim

## Accountability Commands

### Verify Event Images Were Actually Saved

```sql
-- In Supabase SQL Editor, run:
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as unsplash_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as gradients,
  COUNT(CASE WHEN image_type = 'image' THEN 1 END) as type_image,
  COUNT(CASE WHEN image_type = 'gradient' THEN 1 END) as type_gradient
FROM calendar_events;
```

**Expected after populate script:**
- `unsplash_urls` should match `type_image`
- `gradients` should be 0
- `type_gradient` should be 0

### Verify Display Code Uses Database Only

```bash
# Search codebase for Unsplash API calls in display code
grep -r "fetchUnsplashImage" src/components/EventCard.tsx
grep -r "fetchUnsplashImage" src/components/CalendarSection.tsx
grep -r "fetchUnsplashImage" src/pages/Calendar.tsx

# Should only find it in event creation code, NOT in display code
```

**Expected:** Only in `handleCreateEvent`, NOT in rendering code

### Verify Event Creation Saves Images

```typescript
// In browser console, check logs when creating event:
// Should see:
// [CreateEvent] Fetching Unsplash image for event...
// [CreateEvent] ✅ Got Unsplash image: https://images.unsplash.com/...
// NOT: [CreateEvent] ⚠️ Unsplash failed, using gradient fallback
```

## Red Flags

**Stop trusting if AI:**
1. Claims something is done without showing proof
2. Says "it should work" instead of "I verified it works"
3. Doesn't provide verification steps
4. Makes claims about database state without querying it
5. Says "the script ran successfully" without showing actual output

## How to Hold AI Accountable

1. **Ask for proof:** "Show me the database query that proves this"
2. **Ask for verification steps:** "How can I verify this claim?"
3. **Run the checks yourself:** Don't trust, verify
4. **Call out lies immediately:** Point out when claims don't match reality
5. **Require verification:** Don't accept "it's done" - require proof

## Example: Verifying Event Images Fix

**AI Claim:** "Images stored in my database" or "New events store images in Supabase Storage"

**Verification Steps:**
1. **Check if Supabase Storage bucket exists:**
   - Go to Supabase Dashboard → Storage
   - Look for bucket named `event-images`
   - If it doesn't exist, storage will fail and fall back to Unsplash URLs

2. **Run SQL query to check actual state:**
   ```sql
   -- Check if events have Supabase Storage URLs or Unsplash URLs
   SELECT 
     COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as unsplash_urls,
     COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as supabase_storage_urls
   FROM calendar_events;
   ```

3. **Check browser console when creating NEW event:**
   - Should see: `[CreateEvent] ✅ Image stored in Supabase Storage: https://...supabase.co/...`
   - If you see: `[CreateEvent] ⚠️ Failed to store in Supabase Storage` → bucket doesn't exist

4. **Check browser inspector:**
   - Existing events: May show Unsplash URLs (they weren't touched)
   - NEW events: Should show Supabase Storage URLs (if bucket exists)

5. **Check Network tab:**
   - Should see NO Unsplash API calls on page load (display uses database only)
   - Unsplash API only called during event creation (not display)

**If verification fails:** The AI lied. Call it out and require actual proof.

**Common Issues:**
- **Supabase Storage bucket doesn't exist** → Storage fails → Falls back to Unsplash URLs
- **Existing events still have Unsplash URLs** → This is expected (they weren't touched)
- **New events show Unsplash URLs** → Storage bucket doesn't exist or upload failed
