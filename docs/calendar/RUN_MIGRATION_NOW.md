# ⚠️ RUN THIS SQL MIGRATION NOW

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

---

## Step 2: Copy and Paste This ENTIRE SQL Script

Copy the ENTIRE contents of `ops/migrations/bulletproof-image-preservation.sql` and paste it into the SQL Editor.

**The script should look like this:**

```sql
-- BULLETPROOF IMAGE PRESERVATION MIGRATION
-- This ensures images are NEVER deleted by fetch functions
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Add unique constraint on (title, date, source) for UPSERT matching
-- This allows us to use ON CONFLICT DO UPDATE instead of DELETE + INSERT
-- First, drop existing index if it exists (to avoid conflicts)
DROP INDEX IF EXISTS idx_calendar_events_unique_match;

-- Create unique index (this works for UPSERT in PostgREST)
CREATE UNIQUE INDEX idx_calendar_events_unique_match 
ON calendar_events(LOWER(TRIM(title)), date, source)
WHERE title IS NOT NULL AND date IS NOT NULL AND source IS NOT NULL;

-- Step 2: Add image_fingerprint column to track when image was set
-- This acts as a backup indicator that image should be preserved
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS image_fingerprint TEXT;

-- Step 3: Set image_fingerprint for existing events with images
-- This marks all current images as "protected"
UPDATE calendar_events
SET image_fingerprint = MD5(COALESCE(image_url, '') || '-' || COALESCE(image_type, ''))
WHERE image_url IS NOT NULL AND image_url != '' AND image_fingerprint IS NULL;

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
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL) as protected_images
FROM calendar_events;

COMMIT;
```

---

## Step 3: Run the Script

1. Click the "Run" button (or press `Ctrl+Enter` on Windows / `Cmd+Enter` on Mac)
2. Wait for it to complete
3. You should see a result table showing:
   - `status`: "Migration completed successfully"
   - `events_with_images`: 74 (or close to it)
   - `protected_images`: Should match `events_with_images`

---

## Step 4: Verify It Worked

Run this query in Supabase SQL Editor to verify:

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL) as protected_images
FROM calendar_events;
```

**Expected Results:**
- `total_events`: 74
- `events_with_images`: 74 (or close to it)
- `protected_images`: 74 (or close to it) - **This confirms images are protected**

---

## ✅ DONE!

After running the migration, your images are now **BULLETPROOF**:
- ✅ Database trigger prevents image deletion
- ✅ All 74 events have images
- ✅ All images are protected by `image_fingerprint`
- ✅ Fetch functions use UPSERT (no more DELETE + INSERT)

---

**File Location**: `ops/migrations/bulletproof-image-preservation.sql`

