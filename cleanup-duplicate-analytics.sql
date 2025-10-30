-- Clean up duplicate listing_analytics 'view' events
-- This script identifies and removes duplicate 'view' events
-- based on provider_id, session_id, and user_id within a short timeframe.

-- Shows duplicates before deletion (run this first to see what will be removed)
SELECT 
  provider_id,
  session_id,
  user_id,
  event_type,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_view,
  MAX(created_at) as last_view
FROM listing_analytics
WHERE event_type = 'view'
GROUP BY provider_id, session_id, user_id, event_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicates (keeps the most recent view)
DELETE FROM listing_analytics
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER(
                PARTITION BY provider_id, session_id, user_id, event_type 
                ORDER BY created_at DESC
            ) as rn
        FROM listing_analytics
        WHERE event_type = 'view'
    ) t
    WHERE t.rn > 1
);

-- Verify no duplicates remain
SELECT 
  provider_id,
  session_id,
  user_id,
  event_type,
  COUNT(*) as count
FROM listing_analytics
WHERE event_type = 'view'
GROUP BY provider_id, session_id, user_id, event_type
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful
