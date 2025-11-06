# ⚠️ RUN THIS SQL TO FIX MISSING FINGERPRINTS

## Problem
The migration showed 74 events with images but only 41 protected images. This means 33 events don't have `image_fingerprint` set.

## Solution
Run this SQL script to set fingerprints for ALL events with images.

---

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

---

## Step 2: Copy and Paste This SQL Script

```sql
-- FIX MISSING FINGERPRINTS
-- Run this AFTER the bulletproof-image-preservation.sql migration
-- This ensures ALL events with images get image_fingerprint set

BEGIN;

-- Update all events with valid image URLs that don't have fingerprints yet
-- This catches events that were populated after the migration or missed by the initial UPDATE
UPDATE calendar_events
SET image_fingerprint = MD5(COALESCE(image_url, '') || '-' || COALESCE(image_type, ''))
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE 'linear-gradient%'
  AND image_url LIKE 'http%'
  AND (image_fingerprint IS NULL OR image_fingerprint = '');

-- Verify all images are now protected
SELECT 
  'Fingerprint update completed' as status,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%' AND image_url LIKE 'http%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL AND image_fingerprint != '') as protected_images
FROM calendar_events;

COMMIT;
```

---

## Step 3: Run the Script

1. Click "Run" (or press `Ctrl+Enter` on Windows / `Cmd+Enter` on Mac)
2. Wait for completion
3. You should see a result table showing:
   - `status`: "Fingerprint update completed"
   - `events_with_images`: 74
   - `protected_images`: 74 (should now match!)

---

## Step 4: Verify It Worked

Run this query to confirm:

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%' AND image_url LIKE 'http%') as events_with_images,
  COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL AND image_fingerprint != '') as protected_images
FROM calendar_events;
```

**Expected Results:**
- `total_events`: 74
- `events_with_images`: 74
- `protected_images`: 74 ✅ **This should now match!**

---

## ✅ DONE!

After running this fix, all 74 events with images will have `image_fingerprint` set and will be protected by the database trigger.

---

**File Location**: `ops/migrations/fix-missing-fingerprints.sql`

