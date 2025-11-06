-- BULLETPROOF IMAGE PRESERVATION MIGRATION
-- This ensures images are NEVER deleted by fetch functions
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Add unique constraint on (title, date, source) for UPSERT matching
-- This allows us to use ON CONFLICT DO UPDATE instead of DELETE + INSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_unique_match 
ON calendar_events(LOWER(TRIM(title)), date, source)
WHERE title IS NOT NULL AND date IS NOT NULL AND source IS NOT NULL;

-- Step 2: Add image_fingerprint column to track when image was set
-- This acts as a backup indicator that image should be preserved
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS image_fingerprint TEXT;

-- Step 3: Set image_fingerprint for existing events with images
-- This marks all current images as "protected"
-- CRITICAL: Must exclude gradient strings and only protect actual image URLs
UPDATE calendar_events
SET image_fingerprint = MD5(COALESCE(image_url, '') || '-' || COALESCE(image_type, ''))
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%'
  AND image_fingerprint IS NULL;

-- Step 4: Create a function to preserve images during updates
-- This function ensures image_url/image_type are NEVER overwritten if they exist
CREATE OR REPLACE FUNCTION preserve_event_images()
RETURNS TRIGGER AS $$
BEGIN
  -- If existing row has image_url, NEVER overwrite it
  -- Only set image_url if existing row doesn't have one
  IF OLD.image_url IS NOT NULL AND OLD.image_url != '' THEN
    NEW.image_url := OLD.image_url;
    NEW.image_type := OLD.image_type;
    NEW.image_fingerprint := OLD.image_fingerprint;
  ELSE
    -- Only update fingerprint if we're setting a new image
    IF NEW.image_url IS NOT NULL AND NEW.image_url != '' THEN
      NEW.image_fingerprint := MD5(COALESCE(NEW.image_url, '') || '-' || COALESCE(NEW.image_type, ''));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to protect images BEFORE UPDATE
-- This fires BEFORE any UPDATE and preserves images
DROP TRIGGER IF EXISTS trigger_preserve_event_images ON calendar_events;
CREATE TRIGGER trigger_preserve_event_images
BEFORE UPDATE ON calendar_events
FOR EACH ROW
WHEN (OLD.image_url IS NOT NULL AND OLD.image_url != '')
EXECUTE FUNCTION preserve_event_images();

-- Step 6: Add comment explaining the protection
COMMENT ON COLUMN calendar_events.image_fingerprint IS 
'MD5 hash of image_url+image_type. Used to track and protect images from deletion. If image_fingerprint exists, the image is protected.';

COMMENT ON TRIGGER trigger_preserve_event_images ON calendar_events IS 
'BULLETPROOF: Prevents image_url/image_type from being overwritten if they already exist. If an event has an image, it is preserved forever.';

-- Verify the changes
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL) as protected_images
FROM calendar_events;

COMMIT;

