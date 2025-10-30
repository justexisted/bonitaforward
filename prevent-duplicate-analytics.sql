-- ============================================
-- Prevent Duplicate Analytics Events
-- Created: 2025-10-30
-- Purpose: Add unique constraints to prevent duplicate tracking
-- ============================================

-- This prevents the same session from tracking the same event
-- on the same provider multiple times

BEGIN;

-- Add unique constraint to listing_analytics
-- This will prevent: same session + same provider + same event type
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_analytics_unique_session
  ON listing_analytics(session_id, provider_id, event_type)
  WHERE session_id IS NOT NULL;

-- Note: We use a partial index (WHERE session_id IS NOT NULL)
-- because we still want to allow multiple NULL session_ids
-- (different anonymous users with no session tracking)

COMMIT;

-- ============================================
-- Verification
-- ============================================

-- Check the constraint exists
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_listing_analytics_unique_session';

-- Test it works (should succeed first time, fail second time)
-- INSERT INTO listing_analytics (provider_id, event_type, session_id)
-- VALUES ('531922d2-a8b2-45a3-ae7f-5afa6823d637', 'view', 'test_session_123');

-- Try to insert duplicate (should fail with unique constraint violation)
-- INSERT INTO listing_analytics (provider_id, event_type, session_id)
-- VALUES ('531922d2-a8b2-45a3-ae7f-5afa6823d637', 'view', 'test_session_123');

-- Expected error: duplicate key value violates unique constraint

-- Cleanup test
-- DELETE FROM listing_analytics WHERE session_id = 'test_session_123';

