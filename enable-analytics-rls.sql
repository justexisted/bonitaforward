-- ============================================
-- Enable RLS and Add Policies for Analytics Tables
-- Created: 2025-10-30
-- Purpose: Secure existing analytics tables with Row Level Security
-- ============================================

BEGIN;

-- ============================================
-- TABLE: listing_analytics
-- Purpose: Track listing views, clicks, saves
-- ============================================

-- Enable RLS
ALTER TABLE listing_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (tracking must work for anonymous users)
CREATE POLICY "listing_analytics_insert_public"
  ON listing_analytics
  FOR INSERT
  WITH CHECK (true);

-- Policy: Providers can SELECT their own analytics
CREATE POLICY "listing_analytics_select_owner"
  ON listing_analytics
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
    OR
    is_admin_user(auth.uid())
  );

-- Policy: Admin can DELETE (for cleanup)
CREATE POLICY "listing_analytics_delete_admin"
  ON listing_analytics
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_analytics_provider 
  ON listing_analytics(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_session 
  ON listing_analytics(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_analytics_event 
  ON listing_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_user
  ON listing_analytics(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- TABLE: funnel_attribution
-- Purpose: Link funnel responses to providers
-- ============================================

-- Enable RLS
ALTER TABLE funnel_attribution ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (tracking must work for anonymous users)
CREATE POLICY "funnel_attribution_insert_public"
  ON funnel_attribution
  FOR INSERT
  WITH CHECK (true);

-- Policy: Providers can SELECT their own attribution
CREATE POLICY "funnel_attribution_select_owner"
  ON funnel_attribution
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
    OR
    is_admin_user(auth.uid())
  );

-- Policy: Admin can DELETE (for cleanup)
CREATE POLICY "funnel_attribution_delete_admin"
  ON funnel_attribution
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_funnel_attribution_provider 
  ON funnel_attribution(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_attribution_funnel 
  ON funnel_attribution(funnel_response_id);

-- ============================================
-- TABLE: booking_attribution
-- Purpose: Link bookings to providers and sources
-- ============================================

-- Enable RLS
ALTER TABLE booking_attribution ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (tracking must work for anonymous users)
CREATE POLICY "booking_attribution_insert_public"
  ON booking_attribution
  FOR INSERT
  WITH CHECK (true);

-- Policy: Providers can SELECT their own attribution
CREATE POLICY "booking_attribution_select_owner"
  ON booking_attribution
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
    OR
    is_admin_user(auth.uid())
  );

-- Policy: Admin can DELETE (for cleanup)
CREATE POLICY "booking_attribution_delete_admin"
  ON booking_attribution
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_attribution_provider 
  ON booking_attribution(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_attribution_booking 
  ON booking_attribution(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_attribution_source
  ON booking_attribution(source);

COMMIT;

-- ============================================
-- Verification Queries (Run After Commit)
-- ============================================

-- Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('listing_analytics', 'funnel_attribution', 'booking_attribution');

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('listing_analytics', 'funnel_attribution', 'booking_attribution')
ORDER BY tablename, policyname;

-- Expected output:
-- All 3 tables should have rowsecurity = true
-- Each table should have 3 policies (insert_public, select_owner, delete_admin)

