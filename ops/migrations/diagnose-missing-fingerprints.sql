-- DIAGNOSTIC: Find events with images but no fingerprints
-- Run this to see why some images aren't being protected

BEGIN;

-- Check 1: Events with image_url but no fingerprint
SELECT 
  'Events with images but NO fingerprints' as check_type,
  COUNT(*) as count
FROM calendar_events
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%'
  AND (image_fingerprint IS NULL OR image_fingerprint = '');

-- Check 2: Detailed breakdown of those 33 events
SELECT 
  id,
  title,
  image_url,
  image_type,
  image_fingerprint,
  CASE 
    WHEN image_url IS NULL THEN 'NULL image_url'
    WHEN image_url = '' THEN 'Empty image_url'
    WHEN image_url LIKE 'linear-gradient%' THEN 'Gradient string'
    WHEN image_url NOT LIKE 'http%' THEN 'Not HTTP URL'
    WHEN image_fingerprint IS NOT NULL AND image_fingerprint != '' THEN 'Has fingerprint'
    ELSE 'Should be updated'
  END as issue_reason
FROM calendar_events
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%'
  AND (image_fingerprint IS NULL OR image_fingerprint = '')
ORDER BY id
LIMIT 50;

-- Check 3: Try to manually set fingerprints for those events
-- This will show us if the UPDATE is actually working
UPDATE calendar_events
SET image_fingerprint = MD5(COALESCE(image_url, '') || '-' || COALESCE(image_type, ''))
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%'
  AND (image_fingerprint IS NULL OR image_fingerprint = '');

-- Check 4: Verify after manual update
SELECT 
  'After manual update' as status,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%' AND image_url LIKE 'http%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL AND image_fingerprint != '') as protected_images
FROM calendar_events;

COMMIT;

