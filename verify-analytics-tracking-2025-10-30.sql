-- ============================================================================
-- ANALYTICS TRACKING VERIFICATION
-- Generated: 2025-10-30
-- Purpose: Verify all analytics tracking is working correctly
-- ============================================================================

-- ============================================================================
-- 1. LISTING ANALYTICS SUMMARY
-- ============================================================================

SELECT 
  'LISTING ANALYTICS SUMMARY' as report_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT provider_id) as providers_tracked,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM listing_analytics;

-- Event type breakdown
SELECT 
  'EVENT TYPE BREAKDOWN' as report_name,
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT provider_id) as providers,
  COUNT(DISTINCT user_id) as users
FROM listing_analytics
GROUP BY event_type
ORDER BY count DESC;

-- Recent events (last 24 hours)
SELECT 
  'RECENT EVENTS (24H)' as report_name,
  event_type,
  COUNT(*) as count
FROM listing_analytics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- ============================================================================
-- 2. FUNNEL ATTRIBUTION SUMMARY
-- ============================================================================

SELECT 
  'FUNNEL ATTRIBUTION SUMMARY' as report_name,
  COUNT(*) as total_attributions,
  COUNT(DISTINCT funnel_response_id) as unique_responses,
  COUNT(DISTINCT provider_id) as providers_attributed,
  COUNT(*) FILTER (WHERE provider_id IS NOT NULL) as with_provider,
  COUNT(*) FILTER (WHERE provider_id IS NULL) as without_provider
FROM funnel_attribution;

-- Top providers driving funnels
SELECT 
  'TOP PROVIDERS (FUNNEL ATTRIBUTION)' as report_name,
  p.name as provider_name,
  COUNT(*) as funnel_count
FROM funnel_attribution fa
JOIN providers p ON p.id = fa.provider_id
WHERE fa.provider_id IS NOT NULL
GROUP BY p.id, p.name
ORDER BY funnel_count DESC
LIMIT 10;

-- ============================================================================
-- 3. BOOKING ATTRIBUTION SUMMARY
-- ============================================================================

SELECT 
  'BOOKING ATTRIBUTION SUMMARY' as report_name,
  COUNT(*) as total_attributions,
  COUNT(DISTINCT booking_id) as unique_bookings,
  COUNT(DISTINCT provider_id) as providers_with_bookings,
  COUNT(*) FILTER (WHERE source = 'listing_view') as from_listing,
  COUNT(*) FILTER (WHERE source = 'search') as from_search,
  COUNT(*) FILTER (WHERE source = 'direct') as direct,
  COUNT(*) FILTER (WHERE source = 'calendar') as from_calendar
FROM booking_attribution;

-- Top providers by bookings
SELECT 
  'TOP PROVIDERS (BOOKINGS)' as report_name,
  p.name as provider_name,
  COUNT(*) as booking_count,
  ba.source
FROM booking_attribution ba
JOIN providers p ON p.id = ba.provider_id
WHERE ba.provider_id IS NOT NULL
GROUP BY p.id, p.name, ba.source
ORDER BY booking_count DESC
LIMIT 10;

-- ============================================================================
-- 4. PROVIDER ANALYTICS DASHBOARD (Sample)
-- ============================================================================

-- Example: Get full analytics for a specific provider
-- Replace 'PROVIDER_ID_HERE' with actual UUID

/*
SELECT 
  'PROVIDER ANALYTICS EXAMPLE' as report_name,
  (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = 'PROVIDER_ID_HERE' AND event_type = 'view') as total_views,
  (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = 'PROVIDER_ID_HERE' AND event_type = 'phone_click') as phone_clicks,
  (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = 'PROVIDER_ID_HERE' AND event_type = 'website_click') as website_clicks,
  (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = 'PROVIDER_ID_HERE' AND event_type = 'save') as saves,
  (SELECT COUNT(*) FROM funnel_attribution WHERE provider_id = 'PROVIDER_ID_HERE') as funnel_responses,
  (SELECT COUNT(*) FROM booking_attribution WHERE provider_id = 'PROVIDER_ID_HERE') as bookings;
*/

-- ============================================================================
-- 5. DATA QUALITY CHECKS
-- ============================================================================

-- Check for duplicate view events (should be 0 after constraint)
SELECT 
  'DUPLICATE VIEW CHECK' as check_name,
  provider_id,
  session_id,
  user_id,
  COUNT(*) as duplicate_count
FROM listing_analytics
WHERE event_type = 'view'
GROUP BY provider_id, session_id, user_id
HAVING COUNT(*) > 1;

-- Check for orphaned attributions (funnel responses that don't exist)
SELECT 
  'ORPHANED FUNNEL ATTRIBUTIONS' as check_name,
  COUNT(*) as orphaned_count
FROM funnel_attribution fa
LEFT JOIN funnel_responses fr ON fr.id = fa.funnel_response_id
WHERE fr.id IS NULL;

-- Check for orphaned booking attributions (bookings that don't exist)
SELECT 
  'ORPHANED BOOKING ATTRIBUTIONS' as check_name,
  COUNT(*) as orphaned_count
FROM booking_attribution ba
LEFT JOIN booking_events be ON be.id = ba.booking_id
WHERE be.id IS NULL;

-- ============================================================================
-- 6. CONVERSION FUNNEL ANALYSIS
-- ============================================================================

-- Views → Saves → Bookings conversion
WITH provider_stats AS (
  SELECT 
    p.id as provider_id,
    p.name as provider_name,
    (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = p.id AND event_type = 'view') as views,
    (SELECT COUNT(*) FROM listing_analytics WHERE provider_id = p.id AND event_type = 'save') as saves,
    (SELECT COUNT(*) FROM booking_attribution WHERE provider_id = p.id) as bookings
  FROM providers p
  WHERE p.published = true
)
SELECT 
  'CONVERSION FUNNEL' as report_name,
  provider_name,
  views,
  saves,
  bookings,
  CASE WHEN views > 0 THEN ROUND((saves::numeric / views) * 100, 2) ELSE 0 END as save_rate,
  CASE WHEN views > 0 THEN ROUND((bookings::numeric / views) * 100, 2) ELSE 0 END as conversion_rate
FROM provider_stats
WHERE views > 0
ORDER BY bookings DESC, views DESC
LIMIT 20;

-- ============================================================================
-- 7. RECENT ACTIVITY LOG (Debug)
-- ============================================================================

-- Last 20 analytics events
SELECT 
  'RECENT ACTIVITY (LAST 20)' as report_name,
  la.created_at,
  la.event_type,
  p.name as provider_name,
  COALESCE(pr.email, 'Anonymous') as user_email,
  la.metadata
FROM listing_analytics la
JOIN providers p ON p.id = la.provider_id
LEFT JOIN profiles pr ON pr.id = la.user_id
ORDER BY la.created_at DESC
LIMIT 20;

-- ============================================================================
-- 8. RLS POLICY CHECK
-- ============================================================================

-- Verify RLS policies are enabled
SELECT 
  'RLS ENABLED CHECK' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('listing_analytics', 'funnel_attribution', 'booking_attribution');

-- List all policies
SELECT 
  'RLS POLICIES' as check_name,
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN qual IS NOT NULL THEN 'WITH CHECK' ELSE 'USING' END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('listing_analytics', 'funnel_attribution', 'booking_attribution')
ORDER BY tablename, policyname;

