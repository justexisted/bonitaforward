-- Cleanup Script: Remove gradient strings from image_url column
-- CRITICAL: Gradient strings should NEVER be stored in image_url
-- The frontend computes gradients dynamically when image_url is null
-- Run this in Supabase SQL Editor to fix existing events

-- First, check how many events have gradient strings
SELECT 
  COUNT(*) as events_with_gradient_strings,
  COUNT(DISTINCT image_url) as unique_gradient_strings
FROM calendar_events
WHERE image_url LIKE 'linear-gradient%';

-- Show sample events that will be cleaned up
SELECT 
  id,
  title,
  image_url,
  image_type,
  created_at
FROM calendar_events
WHERE image_url LIKE 'linear-gradient%'
ORDER BY created_at DESC
LIMIT 10;

-- Clean up: Set image_url to NULL for events with gradient strings
-- The frontend will compute gradients dynamically when image_url is null
UPDATE calendar_events
SET 
  image_url = NULL,
  image_type = NULL
WHERE image_url LIKE 'linear-gradient%';

-- Verify cleanup was successful
SELECT 
  COUNT(*) as remaining_gradient_strings
FROM calendar_events
WHERE image_url LIKE 'linear-gradient%';
-- Should return 0

-- Show events that now have NULL image_url (will use frontend gradients)
SELECT 
  COUNT(*) as events_with_null_image_url
FROM calendar_events
WHERE image_url IS NULL;

