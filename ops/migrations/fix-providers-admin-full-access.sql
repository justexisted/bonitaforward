-- ============================================================================
-- FIX: Admin Full Access to Providers Table
-- ============================================================================
-- Issue: UPDATE returns empty array [] even though update succeeds
-- Root Cause: SELECT policy blocks reading the updated row
-- Solution: Ensure admin has full SELECT, UPDATE, INSERT, DELETE access
-- ============================================================================

-- IMPORTANT: Update this email to match your admin email
DO $$
BEGIN
  RAISE NOTICE 'Current admin email in policies: justexisted@gmail.com';
  RAISE NOTICE 'Make sure this matches your actual admin email!';
END $$;

-- ============================================================================
-- Step 1: Check Current Admin
-- ============================================================================
SELECT 
  auth.uid() as my_user_id,
  auth.jwt()->>'email' as my_email;

-- ============================================================================
-- Step 2: Check Current Policies
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN length(qual::text) > 100 THEN substring(qual::text, 1, 100) || '...'
    ELSE qual::text
  END as using_clause_preview
FROM pg_policies 
WHERE tablename = 'providers'
ORDER BY cmd, policyname;

-- ============================================================================
-- Step 3: Drop Existing Admin Policies (Clean Slate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can update all providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON public.providers;
DROP POLICY IF EXISTS "Admin full access" ON public.providers;

-- ============================================================================
-- Step 4: Create New Admin Policies (Full Access)
-- ============================================================================

-- Admin SELECT: Can read all providers
CREATE POLICY "Admins can view all providers"
ON public.providers
FOR SELECT
USING (
  auth.jwt()->>'email' = 'justexisted@gmail.com'
);

-- Admin UPDATE: Can update all providers
CREATE POLICY "Admins can update all providers"
ON public.providers
FOR UPDATE
USING (
  auth.jwt()->>'email' = 'justexisted@gmail.com'
)
WITH CHECK (
  auth.jwt()->>'email' = 'justexisted@gmail.com'
);

-- Admin INSERT: Can create providers
CREATE POLICY "Admins can insert providers"
ON public.providers
FOR INSERT
WITH CHECK (
  auth.jwt()->>'email' = 'justexisted@gmail.com'
);

-- Admin DELETE: Can delete providers
CREATE POLICY "Admins can delete providers"
ON public.providers
FOR DELETE
USING (
  auth.jwt()->>'email' = 'justexisted@gmail.com'
);

-- ============================================================================
-- Step 5: Ensure Business Owner Policies Don't Conflict
-- ============================================================================

-- Drop old business owner policies that might conflict
DROP POLICY IF EXISTS "Business owners can update" ON public.providers;
DROP POLICY IF EXISTS "Business owners can update their providers" ON public.providers;
DROP POLICY IF EXISTS "Owners can update own provider" ON public.providers;

-- Recreate business owner UPDATE policy (doesn't conflict with admin)
CREATE POLICY "Business owners can update their providers"
ON public.providers
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR email = auth.jwt()->>'email'
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR email = auth.jwt()->>'email'
);

-- ============================================================================
-- Step 6: Verify Policies
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%justexisted%' THEN '✅ Admin policy'
    WHEN qual::text LIKE '%owner_user_id%' THEN '👤 Owner policy'
    ELSE '❓ Other policy'
  END as policy_type
FROM pg_policies 
WHERE tablename = 'providers'
ORDER BY cmd, policyname;

-- ============================================================================
-- Step 7: Test the Fix
-- ============================================================================
-- Test UPDATE with SELECT (this is what the booking toggle does)
DO $$
DECLARE
  test_provider_id UUID := '35993524-0546-4d1a-9831-d3a7147fabde';
  result_count INTEGER;
BEGIN
  -- Try to update and return the row
  UPDATE providers 
  SET booking_enabled = NOT COALESCE(booking_enabled, false),
      updated_at = NOW()
  WHERE id = test_provider_id
  RETURNING id INTO result_count;
  
  IF result_count IS NULL THEN
    RAISE NOTICE '❌ UPDATE failed or returned nothing';
  ELSE
    RAISE NOTICE '✅ UPDATE succeeded and returned row';
  END IF;
  
  -- Try to select the updated row
  SELECT COUNT(*) INTO result_count
  FROM providers
  WHERE id = test_provider_id;
  
  IF result_count = 0 THEN
    RAISE NOTICE '❌ SELECT after UPDATE returned nothing (RLS blocking)';
  ELSE
    RAISE NOTICE '✅ SELECT after UPDATE succeeded';
  END IF;
END $$;

-- ============================================================================
-- Step 8: Manual Test Query
-- ============================================================================
-- Run this to manually test the same operation as the booking toggle:
SELECT 
  id,
  name,
  booking_enabled as current_booking_enabled,
  is_member,
  owner_user_id,
  email
FROM providers
WHERE id = '35993524-0546-4d1a-9831-d3a7147fabde';

-- ============================================================================
-- Expected Result After Fix
-- ============================================================================
-- After running this SQL in Supabase:
-- 1. Refresh your admin page
-- 2. Click the booking toggle
-- 3. Console should show:
--    [Admin] ✅ Booking toggle saved to database: [{ id: "...", booking_enabled: true, ... }]
--    (NOT an empty array!)
-- 4. Toggle should stay in the "on" position
-- ============================================================================

