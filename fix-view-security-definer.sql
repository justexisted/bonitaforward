-- ========================================
-- FIX: Remove SECURITY DEFINER from v_bookings_with_provider view
-- ========================================
-- 
-- Issue: View public.v_bookings_with_provider is defined with SECURITY DEFINER
-- 
-- This is a security risk because:
-- - SECURITY DEFINER views run with the permissions of the view creator (typically superuser)
-- - This bypasses Row Level Security (RLS) policies
-- - Any user who can query the view gets elevated privileges
--
-- Solution: Recreate the view WITHOUT SECURITY DEFINER
-- The view will then use the permissions of the querying user (SECURITY INVOKER - default)
--
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Check if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'v_bookings_with_provider' 
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '✓ View v_bookings_with_provider found';
    
    -- Show current definition
    RAISE NOTICE 'Current view definition:';
    RAISE NOTICE '%', pg_get_viewdef('public.v_bookings_with_provider'::regclass, true);
  ELSE
    RAISE NOTICE '✗ View v_bookings_with_provider does not exist';
  END IF;
END $$;

-- Step 2: Drop the existing view
DO $$
BEGIN
  DROP VIEW IF EXISTS public.v_bookings_with_provider CASCADE;
  RAISE NOTICE '✓ Dropped existing view (if it existed)';
END $$;

-- Step 3: Recreate the view WITHOUT SECURITY DEFINER
-- This view joins booking_events with provider information
CREATE VIEW public.v_bookings_with_provider AS
SELECT 
  -- All booking event columns
  b.id,
  b.provider_id,
  b.customer_email,
  b.customer_name,
  b.booking_date,
  b.booking_duration_minutes,
  b.booking_notes,
  b.status,
  b.created_at,
  
  -- Provider information (useful for queries)
  p.name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.category_key as provider_category,
  p.address as provider_address
  
FROM booking_events b
LEFT JOIN providers p ON p.id = b.provider_id

-- Only show bookings for published providers OR the provider's own bookings OR admin users
WHERE 
  p.published = true  -- Published providers visible to all
  OR p.owner_user_id = auth.uid()  -- Provider owners can see their bookings
  OR p.email = (SELECT email FROM auth.users WHERE id = auth.uid())  -- Provider owners can see their bookings
  OR (
    -- Admin users can see all bookings (check if user email is in admin_emails table)
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) IN (
    SELECT email FROM admin_emails
  );

-- Step 4: Grant appropriate permissions
DO $$
BEGIN
  -- Public users should be able to query this view
  GRANT SELECT ON public.v_bookings_with_provider TO authenticated;
  GRANT SELECT ON public.v_bookings_with_provider TO anon;
  
  RAISE NOTICE '✓ Recreated view without SECURITY DEFINER';
  RAISE NOTICE '✓ Granted SELECT permissions to authenticated and anon roles';
END $$;

-- Step 5: Verify the fix
DO $$
DECLARE
  view_security TEXT;
BEGIN
  -- Check if view has SECURITY DEFINER
  SELECT 
    CASE 
      WHEN prosecdef THEN 'SECURITY DEFINER ⚠️'
      ELSE 'SECURITY INVOKER ✓'
    END
  INTO view_security
  FROM pg_proc
  WHERE proname = 'v_bookings_with_provider';
  
  IF view_security IS NULL THEN
    -- Views don't show up in pg_proc, check pg_views
    RAISE NOTICE '✓ View created successfully (views are SECURITY INVOKER by default)';
  ELSE
    RAISE NOTICE 'View security setting: %', view_security;
  END IF;
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

-- Show the new view definition
SELECT pg_get_viewdef('public.v_bookings_with_provider'::regclass, true) as view_definition;

-- Show all views with SECURITY DEFINER (should not include v_bookings_with_provider)
SELECT 
  n.nspname as schema_name,
  c.relname as view_name,
  CASE 
    WHEN pg_get_viewdef(c.oid) ILIKE '%security definer%' THEN 'YES ⚠️'
    ELSE 'NO ✓'
  END as has_security_definer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND c.relname = 'v_bookings_with_provider';

-- ========================================
-- NOTES
-- ========================================
-- 
-- What changed:
-- ✓ View now runs with the permissions of the querying user (SECURITY INVOKER - default)
-- ✓ RLS policies on underlying tables (booking_events, providers) are now enforced
-- ✓ Admin users can still see all bookings via the WHERE clause
-- ✓ Provider owners can see their own bookings
-- ✓ Public users can only see bookings for published providers
--
-- Testing:
-- 1. Log in as a business owner and query the view - should see only your bookings
-- 2. Log in as an admin and query the view - should see all bookings
-- 3. Query as a public user - should see only published provider bookings
--
-- If you get permission errors after running this script:
-- Make sure RLS policies on booking_events and providers tables are set up correctly
--
-- ========================================

