-- VERIFICATION QUERIES: Prove images are stored in Supabase Storage, not as Unsplash URLs
-- Run these in Supabase SQL Editor to verify images are actually in your database

-- ============================================================================
-- QUERY 1: Check image source distribution
-- ============================================================================
-- This shows how many events have Supabase Storage URLs vs Unsplash URLs
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as events_with_supabase_storage,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as events_with_unsplash_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as events_with_gradients,
  COUNT(CASE WHEN image_url IS NULL THEN 1 END) as events_without_images
FROM calendar_events;

-- Expected after populate script:
-- events_with_supabase_storage should be > 0 (actual images in YOUR storage)
-- events_with_unsplash_urls should be 0 (no Unsplash URLs)
-- events_with_gradients should be 0 (no gradient strings)

-- ============================================================================
-- QUERY 2: Show sample events with their image sources
-- ============================================================================
SELECT 
  id,
  title,
  date,
  CASE 
    WHEN image_url LIKE '%supabase.co/storage%' THEN '✅ Supabase Storage (ACTUAL IMAGE)'
    WHEN image_url LIKE 'https://images.unsplash.com%' THEN '❌ Unsplash URL (NOT STORED)'
    WHEN image_url LIKE 'linear-gradient%' THEN '⚠️ Gradient String'
    WHEN image_url IS NULL THEN '❌ No Image'
    ELSE '❓ Other'
  END as image_source,
  LEFT(image_url, 80) as image_url_preview,
  image_type,
  created_at
FROM calendar_events
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- QUERY 3: Count events by image type
-- ============================================================================
SELECT 
  image_type,
  COUNT(*) as count,
  CASE 
    WHEN image_type = 'image' THEN 'Should have Supabase Storage URLs'
    WHEN image_type = 'gradient' THEN 'Should have gradient strings'
    WHEN image_type IS NULL THEN 'Should be populated'
  END as note
FROM calendar_events
GROUP BY image_type
ORDER BY count DESC;

-- ============================================================================
-- QUERY 4: Find events with Unsplash URLs (these should NOT exist)
-- ============================================================================
SELECT 
  id,
  title,
  date,
  image_url,
  image_type,
  created_at
FROM calendar_events
WHERE image_url LIKE 'https://images.unsplash.com%'
ORDER BY created_at DESC;

-- Expected: Should return 0 rows (all Unsplash URLs should be replaced with Supabase Storage URLs)

-- ============================================================================
-- QUERY 5: Verify images are actually in Supabase Storage bucket
-- ============================================================================
-- Note: This query cannot directly access Storage, but you can verify in Supabase Dashboard:
-- 1. Go to Storage → event-images bucket
-- 2. Check that files exist with pattern: event-{eventId}-{timestamp}.{ext}
-- 3. Count should match events_with_supabase_storage from Query 1

-- Alternative: Check if image_url points to existing files
-- (This requires a function to check Storage, which is complex)
-- For now, verify manually in Supabase Dashboard → Storage → event-images

-- ============================================================================
-- QUERY 6: Check for expired events (should be cleaned up after 10 days)
-- ============================================================================
SELECT 
  COUNT(*) as expired_events_with_images,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as expired_events_with_storage_images
FROM calendar_events
WHERE date < NOW() - INTERVAL '10 days'
  AND image_type = 'image'
  AND image_url IS NOT NULL;

-- After running cleanup script, this should return 0 rows (images deleted)

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================
-- After running populate-event-images.ts:
-- [ ] Query 1: events_with_supabase_storage > 0
-- [ ] Query 1: events_with_unsplash_urls = 0
-- [ ] Query 2: All recent events show "✅ Supabase Storage (ACTUAL IMAGE)"
-- [ ] Query 4: Returns 0 rows (no Unsplash URLs)
-- [ ] Manual check: Supabase Dashboard → Storage → event-images bucket has files
-- [ ] Browser Network tab: NO Unsplash API calls on page load
-- [ ] Browser Console: NO errors about missing images

