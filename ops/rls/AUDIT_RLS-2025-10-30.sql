-- RLS AUDIT - 2025-10-30
-- Lists active RLS policies for critical tables

SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN (
  'listing_analytics',
  'funnel_attribution',
  'booking_attribution',
  'booking_events',
  'coupon_redemptions',
  'saved_providers'
)
ORDER BY tablename, policyname;







