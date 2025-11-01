-- ============================================================================
-- FIX PROFILES RLS POLICIES - COMPLETE
-- ============================================================================
-- Based on audit results showing:
-- - Missing profiles_update_own policy (users can't update own profiles)
-- - Wrong SELECT policy (profiles_select_all instead of profiles_select_own + profiles_select_admin)
-- - Wrong INSERT policy name (profiles_insert_auth instead of profiles_insert_own)
--
-- Run this in Supabase SQL Editor to fix all profiles RLS issues
-- ============================================================================

BEGIN;

-- Step 1: Drop ALL existing policies on profiles using dynamic SQL
-- This ensures we catch ALL policies regardless of their names
-- This is idempotent - safe to run multiple times
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create correct SELECT policies
-- Users can see their own profile
CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Admins can see all profiles
CREATE POLICY "profiles_select_admin" 
ON public.profiles FOR SELECT
USING (is_admin_user(auth.uid()));

-- Step 4: Create correct INSERT policy
CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Step 5: Create correct UPDATE policies (with both USING and WITH CHECK)
-- Users can update their own profile
CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" 
ON public.profiles FOR UPDATE
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Step 6: Create DELETE policy (admins only - users shouldn't delete profiles)
CREATE POLICY "profiles_delete_admin" 
ON public.profiles FOR DELETE
USING (is_admin_user(auth.uid()));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying the fix to verify:

-- 1. Check all policies exist
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Expected output:
-- profiles_delete_admin | DELETE | ... | NULL
-- profiles_insert_own | INSERT | NULL | (id = auth.uid())
-- profiles_select_admin | SELECT | is_admin_user(...) | NULL
-- profiles_select_own | SELECT | (id = auth.uid()) | NULL
-- profiles_update_admin | UPDATE | is_admin_user(...) | is_admin_user(...)
-- profiles_update_own | UPDATE | (id = auth.uid()) | (id = auth.uid())

-- 2. Summary by operation
SELECT 
  cmd,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE tablename = 'profiles'
GROUP BY cmd
ORDER BY cmd;

-- Expected output:
-- DELETE: 1 policy (profiles_delete_admin)
-- INSERT: 1 policy (profiles_insert_own)
-- SELECT: 2 policies (profiles_select_own, profiles_select_admin)
-- UPDATE: 2 policies (profiles_update_own, profiles_update_admin)

-- 3. Test UPDATE as regular user
-- This should work after the fix:
-- UPDATE profiles SET name = 'Test' WHERE id = auth.uid();

