-- FIX RLS: coupon_redemptions (Idempotent)
-- Date: 2025-10-30

BEGIN;

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
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
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
