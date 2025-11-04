-- STANDARD RLS POLICIES (Idempotent)
-- Date: 2025-10-30
-- Purpose: Apply consistent, minimal, and safe RLS policies across key tables.
-- Strategy:
-- - Owner SELECT via providers.owner_user_id = auth.uid()
-- - Admin full SELECT/DELETE via is_admin_user(auth.uid())
-- - Public INSERT where telemetry is intended (analytics)
-- - Authenticated INSERT with ownership checks for user-owned tables
-- - Service role INSERT where system writes are expected (server functions)

BEGIN;

-- ========================================
-- listing_analytics (telemetry)
-- ========================================
ALTER TABLE IF EXISTS public.listing_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_analytics_select_owner" ON public.listing_analytics;
DROP POLICY IF EXISTS "listing_analytics_select_admin" ON public.listing_analytics;
DROP POLICY IF EXISTS "listing_analytics_insert_public" ON public.listing_analytics;
DROP POLICY IF EXISTS "listing_analytics_delete_admin" ON public.listing_analytics;

CREATE POLICY "listing_analytics_select_owner"
  ON public.listing_analytics
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "listing_analytics_select_admin"
  ON public.listing_analytics
  FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "listing_analytics_insert_public"
  ON public.listing_analytics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "listing_analytics_delete_admin"
  ON public.listing_analytics
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- ========================================
-- funnel_attribution (telemetry)
-- ========================================
ALTER TABLE IF EXISTS public.funnel_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funnel_attribution_select_owner" ON public.funnel_attribution;
DROP POLICY IF EXISTS "funnel_attribution_select_admin" ON public.funnel_attribution;
DROP POLICY IF EXISTS "funnel_attribution_insert_public" ON public.funnel_attribution;
DROP POLICY IF EXISTS "funnel_attribution_delete_admin" ON public.funnel_attribution;

CREATE POLICY "funnel_attribution_select_owner"
  ON public.funnel_attribution
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "funnel_attribution_select_admin"
  ON public.funnel_attribution
  FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "funnel_attribution_insert_public"
  ON public.funnel_attribution
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "funnel_attribution_delete_admin"
  ON public.funnel_attribution
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- ========================================
-- booking_attribution (telemetry)
-- ========================================
ALTER TABLE IF EXISTS public.booking_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_attribution_select_owner" ON public.booking_attribution;
DROP POLICY IF EXISTS "booking_attribution_select_admin" ON public.booking_attribution;
DROP POLICY IF EXISTS "booking_attribution_insert_public" ON public.booking_attribution;
DROP POLICY IF EXISTS "booking_attribution_delete_admin" ON public.booking_attribution;

CREATE POLICY "booking_attribution_select_owner"
  ON public.booking_attribution
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "booking_attribution_select_admin"
  ON public.booking_attribution
  FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "booking_attribution_insert_public"
  ON public.booking_attribution
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "booking_attribution_delete_admin"
  ON public.booking_attribution
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- ========================================
-- booking_events (system writes via service role)
-- ========================================
ALTER TABLE IF EXISTS public.booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_events_select_owner" ON public.booking_events;
DROP POLICY IF EXISTS "booking_events_select_customer" ON public.booking_events;
DROP POLICY IF EXISTS "booking_events_update_owner" ON public.booking_events;
DROP POLICY IF EXISTS "booking_events_insert_service" ON public.booking_events;
DROP POLICY IF EXISTS "booking_events_update_service" ON public.booking_events;

-- Business owners can view bookings for their providers
CREATE POLICY "booking_events_select_owner"
  ON public.booking_events
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

-- Customers can view their own bookings by email in JWT
CREATE POLICY "booking_events_select_customer"
  ON public.booking_events
  FOR SELECT
  USING (customer_email = (auth.jwt() ->> 'email'));

-- Business owners can update bookings
CREATE POLICY "booking_events_update_owner"
  ON public.booking_events
  FOR UPDATE
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

-- Service role can insert
CREATE POLICY "booking_events_insert_service"
  ON public.booking_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can update
CREATE POLICY "booking_events_update_service"
  ON public.booking_events
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ========================================
-- coupon_redemptions (user-owned inserts + owner visibility)
-- ========================================
ALTER TABLE IF EXISTS public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_redemptions_insert_authed" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_redemptions_select_owner" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_redemptions_select_provider_owner" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_redemptions_select_admin" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_redemptions_delete_admin" ON public.coupon_redemptions;

CREATE POLICY "coupon_redemptions_insert_authed"
  ON public.coupon_redemptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coupon_redemptions_select_owner"
  ON public.coupon_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coupon_redemptions_select_provider_owner"
  ON public.coupon_redemptions
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "coupon_redemptions_select_admin"
  ON public.coupon_redemptions
  FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "coupon_redemptions_delete_admin"
  ON public.coupon_redemptions
  FOR DELETE
  USING (is_admin_user(auth.uid()));

COMMIT;

-- ========================================
-- saved_providers (user saved businesses)
-- ========================================
-- Note: Keeping this block after COMMIT so it can be run independently as well.
BEGIN;

ALTER TABLE IF EXISTS public.saved_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_providers_insert_authed" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_providers_select_owner" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_providers_delete_owner" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_providers_select_admin" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_providers_delete_admin" ON public.saved_providers;

-- Users can create their own saves
CREATE POLICY "saved_providers_insert_authed"
  ON public.saved_providers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own saves
CREATE POLICY "saved_providers_select_owner"
  ON public.saved_providers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can remove their own saves
CREATE POLICY "saved_providers_delete_owner"
  ON public.saved_providers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional admin visibility
CREATE POLICY "saved_providers_select_admin"
  ON public.saved_providers
  FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "saved_providers_delete_admin"
  ON public.saved_providers
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Prevent duplicates (safe to re-run)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_providers_unique
  ON public.saved_providers(user_id, provider_id);

COMMIT;










