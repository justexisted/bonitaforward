-- Check the actual state of event images in the database
-- This will show you exactly what those 33 events have

-- Overall statistics
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN image_url IS NULL THEN 1 END) as events_with_null_image_url,
  COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as events_with_image_url,
  COUNT(CASE WHEN image_type IS NULL THEN 1 END) as events_with_null_image_type,
  COUNT(CASE WHEN image_type = 'image' THEN 1 END) as events_with_image_type,
  COUNT(CASE WHEN image_type = 'gradient' THEN 1 END) as events_with_gradient_type,
  COUNT(CASE WHEN image_url LIKE 'https://images.unsplash.com%' THEN 1 END) as events_with_unsplash_urls,
  COUNT(CASE WHEN image_url LIKE '%supabase.co/storage%' THEN 1 END) as events_with_supabase_storage_urls,
  COUNT(CASE WHEN image_url LIKE 'linear-gradient%' THEN 1 END) as events_with_gradient_strings
FROM calendar_events;

-- Show the 33 events that don't have images (based on the error message)
-- These are events that will use gradient fallbacks
SELECT 
  id,
  title,
  category,
  image_url,
  image_type,
  created_at,
  updated_at,
  CASE 
    WHEN image_url IS NULL THEN '❌ NULL image_url'
    WHEN image_type IS NULL THEN '⚠️ NULL image_type'
    WHEN image_url LIKE 'linear-gradient%' THEN '⚠️ Gradient string (not URL)'
    WHEN image_url LIKE 'https://images.unsplash.com%' THEN '⚠️ Unsplash URL (not stored in Supabase)'
    ELSE '❓ Other'
  END as issue
FROM calendar_events
WHERE 
  image_url IS NULL 
  OR image_type IS NULL
  OR image_url LIKE 'linear-gradient%'
ORDER BY created_at DESC;

-- Check if these events need to be populated
SELECT 
  COUNT(*) as events_needing_population
FROM calendar_events
WHERE 
  image_url IS NULL 
  OR image_type IS NULL
  OR image_url LIKE 'linear-gradient%'
  OR image_type = 'gradient';

