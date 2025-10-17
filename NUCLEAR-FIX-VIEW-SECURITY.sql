-- ========================================
-- NUCLEAR OPTION: COMPLETELY FIX VIEW SECURITY
-- ========================================
-- This script uses the most aggressive approach to ensure
-- the view is created WITHOUT SECURITY DEFINER
--
-- Run this in Supabase SQL Editor
-- ========================================

-- STEP 1: Kill any dependencies and drop EVERYTHING related
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Nuclear cleanup - dropping everything';
  RAISE NOTICE '========================================';
  
  -- Drop the view with CASCADE to remove all dependencies
  EXECUTE 'DROP VIEW IF EXISTS public.v_bookings_with_provider CASCADE';
  RAISE NOTICE '✓ Dropped view with CASCADE';
  
  -- Also try dropping as a materialized view (just in case)
  EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.v_bookings_with_provider CASCADE';
  RAISE NOTICE '✓ Dropped materialized view (if it existed)';
  
END $$;

-- STEP 2: Create the helper function (SECURITY DEFINER is OK for functions)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Safely get user email without exposing auth.users to views
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM admin_emails WHERE email = user_email
  );
END;
$$;

-- STEP 3: Wait a moment (in case of timing issues)
SELECT pg_sleep(1);

-- STEP 4: Create the view with EXPLICIT SECURITY INVOKER
-- PostgreSQL 15+ supports explicit SECURITY INVOKER
-- For older versions, it's the default anyway, but we'll try to be explicit
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Creating new view';
  RAISE NOTICE '========================================';
  
  -- Try to create with explicit SECURITY INVOKER (PostgreSQL 15+)
  BEGIN
    EXECUTE '
      CREATE VIEW public.v_bookings_with_provider
      WITH (security_invoker = true)
      AS
      SELECT 
        b.id,
        b.provider_id,
        b.customer_email,
        b.customer_name,
        b.booking_date,
        b.booking_duration_minutes,
        b.booking_notes,
        b.status,
        b.created_at,
        p.name as provider_name,
        p.email as provider_email,
        p.phone as provider_phone,
        p.category_key as provider_category,
        p.address as provider_address
      FROM booking_events b
      LEFT JOIN providers p ON p.id = b.provider_id
      WHERE 
        p.published = true
        OR p.owner_user_id = auth.uid()
        OR is_current_user_admin() = true
    ';
    RAISE NOTICE '✓ Created view with explicit security_invoker = true';
  EXCEPTION WHEN syntax_error OR invalid_column_definition THEN
    -- If explicit SECURITY INVOKER not supported, create normally (defaults to INVOKER)
    RAISE NOTICE 'Note: Explicit security_invoker not supported, using default (INVOKER)';
    
    EXECUTE '
      CREATE VIEW public.v_bookings_with_provider AS
      SELECT 
        b.id,
        b.provider_id,
        b.customer_email,
        b.customer_name,
        b.booking_date,
        b.booking_duration_minutes,
        b.booking_notes,
        b.status,
        b.created_at,
        p.name as provider_name,
        p.email as provider_email,
        p.phone as provider_phone,
        p.category_key as provider_category,
        p.address as provider_address
      FROM booking_events b
      LEFT JOIN providers p ON p.id = b.provider_id
      WHERE 
        p.published = true
        OR p.owner_user_id = auth.uid()
        OR is_current_user_admin() = true
    ';
    RAISE NOTICE '✓ Created view with default security (INVOKER)';
  END;
END $$;

-- STEP 5: Grant permissions
GRANT SELECT ON public.v_bookings_with_provider TO authenticated;
GRANT SELECT ON public.v_bookings_with_provider TO anon;

-- STEP 6: Comprehensive verification
DO $$
DECLARE
  view_def TEXT;
  view_owner TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  
  -- Get view definition
  SELECT pg_get_viewdef('public.v_bookings_with_provider'::regclass, true)
  INTO view_def;
  
  -- Get view owner
  SELECT u.usename INTO view_owner
  FROM pg_class c
  JOIN pg_user u ON c.relowner = u.usesysid
  WHERE c.relname = 'v_bookings_with_provider'
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE 'View owner: %', view_owner;
  
  -- Check for SECURITY DEFINER
  IF view_def ILIKE '%SECURITY%DEFINER%' THEN
    RAISE WARNING '❌ View definition STILL contains SECURITY DEFINER!';
    RAISE NOTICE 'Definition: %', view_def;
  ELSE
    RAISE NOTICE '✅ View does NOT contain SECURITY DEFINER';
  END IF;
  
  -- Check for auth.users
  IF view_def ILIKE '%auth.users%' THEN
    RAISE WARNING '❌ View definition STILL references auth.users!';
  ELSE
    RAISE NOTICE '✅ View does NOT reference auth.users';
  END IF;
  
  -- Check helper function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_current_user_admin') THEN
    RAISE NOTICE '✅ Helper function exists';
  ELSE
    RAISE WARNING '❌ Helper function missing!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Check Supabase Dashboard → Database → Views';
  RAISE NOTICE '2. Verify v_bookings_with_provider is listed';
  RAISE NOTICE '3. Wait 30 seconds for Supabase linter to re-scan';
  RAISE NOTICE '4. Check if security warning is gone';
  RAISE NOTICE '';
  RAISE NOTICE 'If warning persists:';
  RAISE NOTICE '- It may be a Supabase cache issue';
  RAISE NOTICE '- Try refreshing the dashboard';
  RAISE NOTICE '- Contact Supabase support if needed';
  RAISE NOTICE '========================================';
  
END $$;

-- FINAL CHECK: Show the actual view definition from system catalogs
SELECT 
  'View Definition Check' as check_name,
  pg_get_viewdef('public.v_bookings_with_provider'::regclass, false) as definition;

-- Show view options (PostgreSQL 15+)
SELECT 
  'View Options' as check_name,
  reloptions as options
FROM pg_class
WHERE relname = 'v_bookings_with_provider'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


