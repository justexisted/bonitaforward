-- ============================================================================
-- FIX: Providers Table UPDATE RLS Policy
-- ============================================================================
-- Issue: Booking toggle saves but returns empty array []
-- Cause: UPDATE policy might be missing or too restrictive
-- Solution: Add/fix admin UPDATE policy for providers table
-- ============================================================================

-- Step 1: Check current UPDATE policies
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'providers' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 2: Drop potentially conflicting policies
DROP POLICY IF EXISTS "Admins can update providers" ON public.providers;
DROP POLICY IF EXISTS "Admin full access" ON public.providers;
DROP POLICY IF EXISTS "Business owners can update" ON public.providers;

-- Step 3: Create comprehensive admin UPDATE policy
-- This allows admin to update any provider
CREATE POLICY "Admins can update all providers"
ON public.providers
FOR UPDATE
USING (
  -- Admin can update any provider
  auth.jwt()->>'email' = 'justexisted@gmail.com'
)
WITH CHECK (
  -- Admin can set any values
  auth.jwt()->>'email' = 'justexisted@gmail.com'
);

-- Step 4: Create business owner UPDATE policy
-- This allows business owners to update their own providers
CREATE POLICY "Business owners can update their providers"
ON public.providers
FOR UPDATE
USING (
  -- Owner can update their own providers
  owner_user_id = auth.uid()
  OR email = auth.jwt()->>'email'
)
WITH CHECK (
  -- Owner can only update their own providers
  owner_user_id = auth.uid()
  OR email = auth.jwt()->>'email'
);

-- Step 5: Verify policies were created
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'providers' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================================================
-- Testing
-- ============================================================================
-- Test 1: Check if you can update a provider
-- Replace 'YOUR_PROVIDER_ID' with actual provider ID from the logs
/*
UPDATE providers 
SET booking_enabled = true, updated_at = NOW()
WHERE id = '35993524-0546-4d1a-9831-d3a7147fabde'
RETURNING id, name, booking_enabled;
*/

-- Test 2: Check if you can select after update
/*
SELECT id, name, booking_enabled, is_member
FROM providers
WHERE id = '35993524-0546-4d1a-9831-d3a7147fabde';
*/

-- ============================================================================
-- Notes
-- ============================================================================
-- The issue was that .update().eq().select() was returning []
-- This happens when:
-- 1. UPDATE USING policy blocks the update (but we'd get an error)
-- 2. WITH CHECK policy blocks the update (but we'd get an error)  
-- 3. SELECT policy blocks reading the result (returns [] silently)
--
-- Most likely: The UPDATE succeeds but SELECT can't read the result
-- due to a restrictive SELECT policy.
--
-- Solution: Make sure SELECT policy also allows admin to read all providers
-- ============================================================================

