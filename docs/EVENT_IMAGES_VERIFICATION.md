# Event Images Verification Guide

## How to Verify Images Are Actually Stored in Your Database

This guide shows you how to verify that event images are stored as actual files in Supabase Storage, not as Unsplash URLs.

## Step 1: Check Database State

Run this SQL query in Supabase SQL Editor:

```sql
-- Check image source distribution
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as events_with_supabase_storage,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as events_with_unsplash_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as events_with_gradients,
  COUNT(CASE WHEN image_url IS NULL THEN 1 END) as events_without_images
FROM calendar_events;
```

**Expected Results:**
- ✅ `events_with_supabase_storage` should be > 0 (actual images in YOUR storage)
- ✅ `events_with_unsplash_urls` should be 0 (no Unsplash URLs)
- ✅ `events_with_gradients` should be 0 (no gradient strings)

## Step 2: Verify Storage Bucket Has Files

1. Go to Supabase Dashboard → Storage
2. Click on `event-images` bucket
3. You should see files with pattern: `event-{eventId}-{timestamp}.{ext}`
4. Count should match `events_with_supabase_storage` from Step 1

**If bucket doesn't exist:**
- Create it: Storage → Create bucket → Name: `event-images` → Public: Yes

## Step 3: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Reload calendar page
4. Check for Unsplash API calls

**Expected:**
- ✅ NO calls to `api.unsplash.com`
- ✅ Images load from `*.supabase.co/storage/v1/object/public/event-images/...`

## Step 4: Verify Images Are Actually Files

Run this SQL to see actual URLs:

```sql
SELECT 
  id,
  title,
  date,
  LEFT(image_url, 100) as image_url_preview,
  CASE 
    WHEN image_url LIKE '%supabase.co/storage%' THEN '✅ Supabase Storage (ACTUAL FILE)'
    WHEN image_url LIKE 'https://images.unsplash.com%' THEN '❌ Unsplash URL (NOT STORED)'
    WHEN image_url LIKE 'linear-gradient%' THEN '⚠️ Gradient String'
    WHEN image_url IS NULL THEN '❌ No Image'
    ELSE '❓ Other'
  END as image_source
FROM calendar_events
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:**
- All `image_source` should be "✅ Supabase Storage (ACTUAL FILE)"

## Step 5: Test Image Deletion

1. Find an event that expired more than 10 days ago
2. Note its `image_url`
3. Run cleanup script: `npx tsx scripts/cleanup-expired-event-images.ts`
4. Check if file was deleted from Storage bucket
5. Check if database record has `image_url = null`

## Step 6: Verify Populate Script Actually Stores Images

After running `npx tsx scripts/populate-event-images.ts`:

1. Check console output - should see:
   ```
   ✅ Image stored in Supabase Storage: https://...supabase.co/...
   ```

2. NOT:
   ```
   ❌ Upload failed: Bucket not found
   ```

3. Run verification SQL (Step 1) - should see Supabase Storage URLs, not Unsplash URLs

## Common Issues

### Issue 1: "Bucket not found" error
**Solution:** Create `event-images` bucket in Supabase Dashboard → Storage → Create bucket (public)

### Issue 2: Still seeing Unsplash URLs
**Cause:** Populate script wasn't run, or it failed for some events
**Solution:** Run populate script again, check for errors

### Issue 3: Images not loading
**Cause:** Bucket is not public, or RLS policy blocking
**Solution:** Make bucket public, check RLS policies

### Issue 4: Cleanup not deleting files
**Cause:** Scheduled function not configured, or bucket doesn't exist
**Solution:** Check Netlify scheduled functions, verify bucket exists

## Verification Checklist

Before trusting that images are stored:

- [ ] SQL query shows Supabase Storage URLs (not Unsplash URLs)
- [ ] Storage bucket `event-images` exists and has files
- [ ] Browser Network tab shows NO Unsplash API calls
- [ ] Browser inspector shows Supabase Storage URLs in image src
- [ ] Populate script output shows "Image stored in Supabase Storage"
- [ ] No "Bucket not found" errors in console
- [ ] Cleanup script actually deletes files from Storage

## Red Flags (Stop Trusting If You See These)

1. ❌ SQL shows `events_with_unsplash_urls > 0` (images not stored)
2. ❌ Browser Network tab shows Unsplash API calls on page load
3. ❌ Storage bucket is empty or doesn't exist
4. ❌ Populate script shows "Bucket not found" errors
5. ❌ Browser inspector shows Unsplash URLs in image src

## How to Hold AI Accountable

1. **Always verify:** Run the SQL queries yourself
2. **Check storage:** Look at the bucket in Supabase Dashboard
3. **Test in browser:** Check Network tab and inspector
4. **Run scripts yourself:** Don't trust "it ran successfully"
5. **Check for errors:** Look for "Bucket not found" or upload failures

## Quick Verification Commands

```bash
# Run populate script
npx tsx scripts/populate-event-images.ts

# Run cleanup script
npx tsx scripts/cleanup-expired-event-images.ts

# Check verification SQL
# (Copy queries from scripts/verify-event-images-storage.sql and run in Supabase)
```

