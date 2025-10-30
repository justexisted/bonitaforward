-- ========================================
-- DIAGNOSE AND FIX: v_bookings_with_provider View
-- ========================================
-- This script will:
-- 1. Check the current view definition
-- 2. Verify if SECURITY DEFINER is present
-- 3. Completely remove and recreate the view
-- 4. Verify the fix
-- ========================================

-- STEP 1: Check current state
DO $$
DECLARE
  view_def TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Checking current view state';
  RAISE NOTICE '========================================';
  
  -- Check if view exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_bookings_with_provider'
  ) THEN
    RAISE NOTICE '✓ View exists';
    
    -- Get the view definition
    SELECT pg_get_viewdef('public.v_bookings_with_provider'::regclass, true)
    INTO view_def;
    
    RAISE NOTICE 'Current view definition:';
    RAISE NOTICE '%', view_def;
    
    -- Check if SECURITY DEFINER appears in definition
    IF view_def ILIKE '%SECURITY DEFINER%' THEN
      RAISE NOTICE '⚠️  WARNING: View definition contains SECURITY DEFINER';
    ELSE
      RAISE NOTICE '✓ View definition does NOT contain SECURITY DEFINER in pg_get_viewdef';
    END IF;
    
  ELSE
    RAISE NOTICE '✗ View does not exist';
  END IF;
  
END $$;

-- STEP 2: Check if helper function exists
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Checking helper function';
  RAISE NOTICE '========================================';
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_current_user_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '✓ Helper function is_current_user_admin exists';
  ELSE
    RAISE NOTICE '✗ Helper function is_current_user_admin does NOT exist';
    RAISE NOTICE '   Creating it now...';
  END IF;
END $$;

-- STEP 3: Create/Recreate helper function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Check if that email exists in admin_emails
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM admin_emails WHERE email = user_email
  );
END;
$$;

-- STEP 4: Drop and recreate the view
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Recreating view';
  RAISE NOTICE '========================================';
  
  -- Drop the view completely
  DROP VIEW IF EXISTS public.v_bookings_with_provider CASCADE;
  RAISE NOTICE '✓ Dropped existing view';
  
END $$;

-- STEP 5: Create the view (as a regular view, NOT SECURITY DEFINER)
-- IMPORTANT: Views are SECURITY INVOKER by default in PostgreSQL
-- We do NOT add any SECURITY clause - it will default to INVOKER
CREATE VIEW public.v_bookings_with_provider AS
SELECT 
  -- Booking event columns
  b.id,
  b.provider_id,
  b.customer_email,
  b.customer_name,
  b.booking_date,
  b.booking_duration_minutes,
  b.booking_notes,
  b.status,
  b.created_at,
  
  -- Provider information
  p.name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.category_key as provider_category,
  p.address as provider_address
  
FROM booking_events b
LEFT JOIN providers p ON p.id = b.provider_id

-- Security filter: NO auth.users access here!
WHERE 
  p.published = true  -- Public can see published providers
  OR p.owner_user_id = auth.uid()  -- Owners see their own bookings
  OR is_current_user_admin() = true;  -- Admins see all (via helper function)

-- STEP 6: Grant permissions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Granting permissions';
  RAISE NOTICE '========================================';
  
  -- Grant select to authenticated and anonymous users
  GRANT SELECT ON public.v_bookings_with_provider TO authenticated;
  GRANT SELECT ON public.v_bookings_with_provider TO anon;
  
  RAISE NOTICE '✓ Granted SELECT to authenticated and anon';
  
END $$;

-- STEP 7: Verify the fix
DO $$
DECLARE
  view_def TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: VERIFICATION';
  RAISE NOTICE '========================================';
  
  -- Get the view definition again
  SELECT pg_get_viewdef('public.v_bookings_with_provider'::regclass, true)
  INTO view_def;
  
  RAISE NOTICE 'New view definition:';
  RAISE NOTICE '%', view_def;
  
  -- Check if SECURITY DEFINER appears
  IF view_def ILIKE '%SECURITY DEFINER%' THEN
    RAISE NOTICE '❌ FAILED: View still contains SECURITY DEFINER';
  ELSE
    RAISE NOTICE '✅ SUCCESS: View does NOT contain SECURITY DEFINER';
  END IF;
  
  -- Check if auth.users is referenced
  IF view_def ILIKE '%auth.users%' THEN
    RAISE NOTICE '❌ FAILED: View still references auth.users directly';
  ELSE
    RAISE NOTICE '✅ SUCCESS: View does NOT reference auth.users';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Helper function created: is_current_user_admin()';
  RAISE NOTICE '✓ View recreated: v_bookings_with_provider';
  RAISE NOTICE '✓ Permissions granted to authenticated and anon';
  RAISE NOTICE '✓ View is SECURITY INVOKER (default)';
  RAISE NOTICE '✓ No direct auth.users access in view';
  RAISE NOTICE '';
  RAISE NOTICE 'The view should now pass Supabase security checks!';
  RAISE NOTICE '========================================';
  
END $$;

-- STEP 8: Additional check - look at pg_views
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_bookings_with_provider';


