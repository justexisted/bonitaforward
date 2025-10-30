-- ============================================
-- Cleanup Duplicate Analytics Events
-- Created: 2025-10-30
-- Purpose: Remove duplicate tracking events (keep most recent)
-- ============================================

-- This removes duplicates that were created due to React StrictMode
-- Keeps the MOST RECENT event when there are duplicates

BEGIN;

-- Find and delete duplicate views (keeping the newest one)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id, provider_id, event_type 
      ORDER BY created_at DESC
    ) as row_num
  FROM listing_analytics
  WHERE session_id IS NOT NULL
)
DELETE FROM listing_analytics
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Show how many rows were deleted
-- (Run this after the DELETE to see the count)

COMMIT;

-- ============================================
-- Verification
-- ============================================

-- Check for remaining duplicates (should return 0 rows)
SELECT 
  session_id,
  provider_id,
  event_type,
  COUNT(*) as duplicate_count
FROM listing_analytics
WHERE session_id IS NOT NULL
GROUP BY session_id, provider_id, event_type
HAVING COUNT(*) > 1;

-- Expected: No rows (all duplicates removed)

