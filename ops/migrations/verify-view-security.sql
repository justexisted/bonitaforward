-- ========================================
-- VERIFY VIEW SECURITY
-- ========================================
-- Simple verification script to check if v_bookings_with_provider
-- has SECURITY DEFINER or exposes auth.users
-- ========================================

-- Check 1: Does the view exist?
SELECT 
  'View Exists' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = 'v_bookings_with_provider'
    ) THEN '✓ YES'
    ELSE '✗ NO'
  END as result;

-- Check 2: Get the view definition
SELECT 
  'View Definition' as check_type,
  pg_get_viewdef('public.v_bookings_with_provider'::regclass, true) as result;

-- Check 3: Check for SECURITY DEFINER in definition
SELECT 
  'Contains SECURITY DEFINER?' as check_type,
  CASE 
    WHEN pg_get_viewdef('public.v_bookings_with_provider'::regclass, true) ILIKE '%SECURITY DEFINER%' 
    THEN '❌ YES (PROBLEM!)'
    ELSE '✅ NO (GOOD)'
  END as result;

-- Check 4: Check for auth.users in definition  
SELECT 
  'References auth.users?' as check_type,
  CASE 
    WHEN pg_get_viewdef('public.v_bookings_with_provider'::regclass, true) ILIKE '%auth.users%'
    THEN '❌ YES (PROBLEM!)'
    ELSE '✅ NO (GOOD)'
  END as result;

-- Check 5: Check helper function exists
SELECT 
  'Helper Function Exists?' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'is_current_user_admin'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✓ YES'
    ELSE '✗ NO'
  END as result;

-- Check 6: Check view permissions
SELECT 
  'View Permissions' as check_type,
  string_agg(grantee || ': ' || privilege_type, ', ') as result
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'v_bookings_with_provider'
GROUP BY table_schema, table_name;

-- Check 7: Alternative check using pg_views
SELECT 
  'View from pg_views' as check_type,
  LEFT(definition, 200) || '...' as result
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_bookings_with_provider';


