-- Add unique constraint to prevent duplicate 'view' events
-- This ensures that a user/session combination can only log one 'view' event
-- for a specific provider within a reasonable timeframe (implicitly handled by session_id).

-- Note: This constraint will PREVENT future duplicates at the database level
-- The useRef in the code is the first line of defense, this is backup protection

BEGIN;

-- Add unique constraint (will fail if duplicates exist - run cleanup-duplicate-analytics.sql first)
ALTER TABLE listing_analytics
ADD CONSTRAINT unique_listing_view_per_session_user 
UNIQUE (provider_id, session_id, user_id, event_type);

-- Verify the constraint was created
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'listing_analytics'::regclass
  AND conname = 'unique_listing_view_per_session_user';

COMMIT;

-- Test: Try to insert a duplicate (should fail)
-- Uncomment to test:
/*
INSERT INTO listing_analytics (provider_id, session_id, user_id, event_type)
VALUES (
  'test-provider-id',
  'test-session-id', 
  'test-user-id',
  'view'
);

-- This second insert should fail with unique constraint violation:
INSERT INTO listing_analytics (provider_id, session_id, user_id, event_type)
VALUES (
  'test-provider-id',
  'test-session-id', 
  'test-user-id',
  'view'
);
*/
