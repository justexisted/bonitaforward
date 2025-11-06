-- FIX MISSING FINGERPRINTS
-- Run this AFTER the bulletproof-image-preservation.sql migration
-- This ensures ALL events with images get image_fingerprint set

BEGIN;

-- CRITICAL: Update ALL events with valid image URLs
-- Force fingerprint generation for ALL valid images, regardless of current fingerprint state
-- This ensures every image gets a fingerprint, even if previous update missed some
UPDATE calendar_events
SET image_fingerprint = MD5(COALESCE(image_url, '') || '-' || COALESCE(image_type, 'image'))
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%';

-- Verify all images are now protected
SELECT 
  'Fingerprint update completed' as status,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%' AND image_url LIKE 'http%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL AND image_fingerprint != '') as protected_images,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%' AND image_url LIKE 'http%' AND (image_fingerprint IS NULL OR image_fingerprint = '')) as still_missing_fingerprints
FROM calendar_events;

COMMIT;

