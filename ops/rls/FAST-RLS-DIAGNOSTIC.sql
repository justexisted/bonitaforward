-- ========================================
-- FAST RLS DIAGNOSTIC - Run this FIRST when you get permission errors
-- ========================================
-- This shows ALL the info you need in one query
-- Copy/paste the results to diagnose the issue quickly

-- 1. Show ALL policies on the table (not just the one you're debugging)
-- CRITICAL: PostgreSQL evaluates ALL SELECT policies with OR logic
-- If ANY policy accesses a forbidden table, the ENTIRE query fails
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'booking_events'
ORDER BY cmd, policyname;

-- Look for ANY policy that contains:
-- - "FROM auth.users" ← This will fail if user doesn't have access
-- - "SELECT ... auth.users" ← Same problem
-- - Complex subqueries that might access restricted tables

-- ========================================
-- KEY LESSON LEARNED:
-- ========================================
-- Problem: "permission denied for table users" on booking_events query
-- 
-- What we thought: The admin policy was broken
-- 
-- What it actually was: OTHER policies (business owners, users) were
-- accessing auth.users table, and since PostgreSQL evaluates ALL SELECT
-- policies, those broken policies blocked the entire query even though
-- the admin policy was correct.
--
-- Solution: Check ALL policies, not just the one you're creating
-- ========================================

-- 2. Check what email you're logged in as
SELECT 
  auth.uid() as my_user_id,
  auth.jwt()->>'email' as my_email_from_jwt;

-- 3. Quick test - can you query the table?
SELECT COUNT(*) FROM booking_events;
-- If this works in SQL Editor but fails in app:
-- → SQL Editor runs as superuser (bypasses RLS)
-- → App uses authenticated user (subject to RLS)

-- ========================================
-- COMMON FIXES
-- ========================================

-- Fix 1: Replace auth.users queries with auth.jwt()
-- BAD (causes permission errors):
-- WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
--
-- GOOD (no auth.users access needed):
-- WHERE email = auth.jwt()->>'email'

-- Fix 2: Use auth.uid() directly when possible
-- BAD:
-- WHERE owner_user_id IN (SELECT id FROM auth.users WHERE ...)
--
-- GOOD:
-- WHERE owner_user_id = auth.uid()

-- ========================================
-- REBUILD ALL booking_events POLICIES (SAFE VERSION)
-- ========================================
-- Run this to fix all the broken policies at once:

/*
-- Drop all policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can update their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.booking_events;

-- Recreate with NO auth.users access
CREATE POLICY "Admins can view all bookings" 
ON public.booking_events FOR SELECT
USING (auth.jwt()->>'email' = 'justexisted@gmail.com');

CREATE POLICY "Admins can update all bookings"
ON public.booking_events FOR UPDATE
USING (auth.jwt()->>'email' = 'justexisted@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'justexisted@gmail.com');

CREATE POLICY "Business owners can view their bookings"
ON public.booking_events FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM providers 
    WHERE owner_user_id = auth.uid() 
    OR email = auth.jwt()->>'email'
  )
);

CREATE POLICY "Business owners can update their bookings"
ON public.booking_events FOR UPDATE
USING (
  provider_id IN (
    SELECT id FROM providers 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view own bookings"
ON public.booking_events FOR SELECT
USING (customer_email = auth.jwt()->>'email');
*/

-- ========================================
-- VERIFICATION
-- ========================================
-- After applying fixes, verify:

-- 1. All policies exist and use safe patterns
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'booking_events'
ORDER BY cmd, policyname;

-- 2. No references to auth.users
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'booking_events'
AND (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%');
-- Should return NO ROWS

-- 3. Test in app - refresh and check console
-- Should see: [DEBUG] Successfully fetched booking_events: X records


