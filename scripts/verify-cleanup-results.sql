-- Verify Cleanup Results
-- Run this after running cleanup-expired-event-images.ts to verify it worked

-- Check if expired events still have images (they shouldn't)
SELECT 
  COUNT(*) as expired_events_with_images,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as expired_events_with_storage_images
FROM calendar_events
WHERE date < NOW() - INTERVAL '10 days'
  AND image_type = 'image'
  AND image_url IS NOT NULL;

-- Expected: Should return 0 rows (images deleted)

-- Show expired events that should have been cleaned up
SELECT 
  id,
  title,
  date,
  image_url,
  image_type,
  CASE 
    WHEN date < NOW() - INTERVAL '10 days' THEN '✅ Should be cleaned up'
    ELSE '⚠️ Still within 10 days'
  END as status
FROM calendar_events
WHERE date < NOW() - INTERVAL '10 days'
  AND image_url IS NOT NULL
ORDER BY date ASC
LIMIT 20;

-- Expected: image_url should be NULL for events expired >10 days

-- Check storage bucket (manually verify in Supabase Dashboard)
-- Go to Storage → event-images bucket
-- Expired event images should be deleted (files with pattern event-{id}-{timestamp}.{ext})

