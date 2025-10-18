-- ========================================
-- DIAGNOSTIC QUERIES FOR BOOKING EVENTS RLS
-- Run these in Supabase SQL Editor to diagnose the issue
-- ========================================

-- 1. Check if RLS policies exist on booking_events table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'booking_events'
ORDER BY policyname;

-- Expected to see:
-- - "Admins can view all bookings" (SELECT)
-- - "Admins can update all bookings" (UPDATE)
-- - "Business owners can view their bookings" (SELECT)
-- - "Business owners can update their bookings" (UPDATE)
-- - "Customers can view own bookings" (SELECT)

-- ========================================

-- 2. Check if is_admin_user() function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'is_admin_user';

-- Expected: Should return the function definition
-- If empty, the function doesn't exist - need to run fix-booking-events-admin-access.sql

-- ========================================

-- 3. Test if current user is recognized as admin
SELECT is_admin_user() as am_i_admin;

-- Expected: TRUE if you're logged in with admin email
-- If FALSE, your email doesn't match the ones in the function
-- If ERROR, the function doesn't exist

-- ========================================

-- 4. Check what email you're currently logged in as
SELECT 
  auth.uid() as my_user_id,
  auth.email() as my_email;

-- This shows your current user ID and email
-- Compare this email with the ones in is_admin_user() function

-- ========================================

-- 5. Check RLS status on booking_events table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'booking_events';

-- Expected: rls_enabled = true
-- If false, RLS is disabled (unusual but would explain no policies working)

-- ========================================

-- 6. Try to fetch booking_events as current user
SELECT COUNT(*) as booking_events_count FROM booking_events;

-- If this returns a number: RLS is working and you have access
-- If permission error: RLS is blocking you - policies not set up correctly

-- ========================================

-- COMMON ISSUES AND FIXES:

-- Issue 1: Function doesn't exist
-- Fix: Run fix-booking-events-admin-access.sql

-- Issue 2: Function exists but returns FALSE
-- Fix: Update the is_admin_user() function with your actual email
-- Run this separately:
/*
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'YOUR_ACTUAL_EMAIL@gmail.com',  -- UPDATE THIS
    'another-admin@example.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- Issue 3: Policies don't exist
-- Fix: Run fix-booking-events-admin-access.sql

-- Issue 4: Wrong email in function
-- Fix: Run the UPDATE_FUNCTION query above with correct email

-- ========================================

-- VERIFICATION STEPS AFTER FIX:
-- 1. Run: SELECT is_admin_user();  → Should return TRUE
-- 2. Run: SELECT COUNT(*) FROM booking_events;  → Should return a number
-- 3. Refresh admin panel → Warning should disappear

