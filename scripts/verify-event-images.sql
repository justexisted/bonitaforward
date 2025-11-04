-- Verification Query: Check actual state of event images in database
-- Run this in Supabase SQL Editor to verify AI claims

-- Check how many events have actual image URLs vs gradients
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as events_with_unsplash_urls,
  COUNT(CASE WHEN image_url LIKE 'http%' AND image_url NOT LIKE 'linear-gradient%' THEN 1 END) as events_with_any_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as events_with_gradient_strings,
  COUNT(CASE WHEN image_url IS NULL THEN 1 END) as events_without_images,
  COUNT(CASE WHEN image_type = 'image' THEN 1 END) as image_type_image,
  COUNT(CASE WHEN image_type = 'gradient' THEN 1 END) as image_type_gradient,
  COUNT(CASE WHEN image_type IS NULL THEN 1 END) as image_type_null
FROM calendar_events;

-- Show sample events with their image status
SELECT 
  id,
  title,
  LEFT(image_url, 80) as image_url_preview,
  image_type,
  CASE 
    WHEN image_url LIKE 'https://images.unsplash.com%' THEN '✅ Unsplash URL'
    WHEN image_url LIKE 'http%' AND image_url NOT LIKE 'linear-gradient%' THEN '✅ Other URL'
    WHEN image_url LIKE 'linear-gradient%' THEN '❌ Gradient String'
    WHEN image_url IS NULL THEN '❌ NULL'
    ELSE '❓ Other'
  END as image_status,
  CASE 
    WHEN image_type = 'image' AND image_url LIKE 'http%' AND image_url NOT LIKE 'linear-gradient%' THEN '✅ Correct'
    WHEN image_type = 'gradient' AND image_url LIKE 'linear-gradient%' THEN '⚠️ Has Gradient (should be updated)'
    WHEN image_type = 'gradient' AND image_url LIKE 'http%' THEN '❌ Wrong: image_type=gradient but URL exists'
    WHEN image_type = 'image' AND image_url LIKE 'linear-gradient%' THEN '❌ Wrong: image_type=image but gradient string'
    ELSE '❓ Check manually'
  END as validation_status,
  updated_at
FROM calendar_events
ORDER BY updated_at DESC
LIMIT 50;

-- Count events that need to be fixed (have gradients saved)
SELECT 
  COUNT(*) as events_needing_fix
FROM calendar_events
WHERE image_url LIKE 'linear-gradient%' 
   OR (image_type = 'gradient' AND image_url LIKE 'http%')
   OR (image_type = 'image' AND image_url LIKE 'linear-gradient%');

