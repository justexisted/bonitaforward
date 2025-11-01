-- ========================================
-- FAST RLS DIAGNOSTIC - PROFILES TABLE
-- ========================================
-- Run this FIRST to see what's actually in your database
-- Copy/paste the results so we can see the real state

-- 1. Show ALL policies on profiles table
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 2. Check for broken patterns (auth.users references)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
AND (
  qual::text LIKE '%auth.users%' 
  OR with_check::text LIKE '%auth.users%'
  OR qual::text LIKE '%auth.user%' 
  OR with_check::text LIKE '%auth.user%'
);

-- 3. Check current auth context
SELECT 
  auth.uid() as my_user_id,
  auth.jwt()->>'email' as my_email_from_jwt,
  auth.role() as my_role;

-- 4. Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 5. Check UPDATE policies specifically (the problem area)
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check,
  CASE 
    WHEN qual IS NULL THEN '❌ MISSING USING'
    WHEN with_check IS NULL AND cmd = 'UPDATE' THEN '❌ MISSING WITH CHECK'
    ELSE '✅ OK'
  END as status
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'UPDATE'
ORDER BY policyname;

-- 6. Summary: Policy count by operation
SELECT 
  cmd,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE tablename = 'profiles'
GROUP BY cmd
ORDER BY cmd;

