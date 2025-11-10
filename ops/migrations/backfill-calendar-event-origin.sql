-- Backfill provenance metadata for calendar events
-- Run AFTER add-origin-metadata-to-calendar-events.sql

-- Step 1: Legacy local events with creator info
UPDATE calendar_events
SET origin_type = 'local',
    origin_identifier = COALESCE(origin_identifier, 'calendar_form')
WHERE source = 'Local'
  AND created_by_user_id IS NOT NULL
  AND (origin_type IS NULL OR origin_type = '');

-- Step 2: Auto-imported events (no creator, non-local source)
UPDATE calendar_events
SET origin_type = COALESCE(origin_type, 'auto_netlify'),
    origin_identifier = COALESCE(origin_identifier, source)
WHERE source IS NOT NULL
  AND source <> 'Local'
  AND created_by_user_id IS NULL
  AND (origin_type IS NULL OR origin_type = '');

-- Step 3: Remaining rows stay as 'unknown' for manual review
UPDATE calendar_events
SET origin_type = 'unknown'
WHERE (origin_type IS NULL OR origin_type = '');

-- Summary
SELECT
  COUNT(*) FILTER (WHERE origin_type = 'local') AS local_events,
  COUNT(*) FILTER (WHERE origin_type LIKE 'auto%') AS auto_events,
  COUNT(*) FILTER (WHERE origin_type = 'unknown') AS unknown_events
FROM calendar_events;

