-- ============================================================================
-- FIX JOB POSTS DELETE - DEFINITIVE FIX
-- Date: October 28, 2025
-- Issue: 403 Forbidden when trying to delete job posts
-- ============================================================================

-- This script fixes the RLS policies on provider_job_posts to allow users
-- to delete their own job posts. The 403 error indicates the DELETE policy
-- is either missing or incorrectly configured.

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts';

-- Check existing policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts'
ORDER BY cmd, policyname;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================================

-- Drop ALL possible policy names to avoid conflicts
DROP POLICY IF EXISTS "Public can view published job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Public can view approved job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can view their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Authenticated users can create job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can update their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Users can view job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Users can update their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Users can insert job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Users can delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admins can manage all job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can view their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can update their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can create job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can delete their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow all users to view job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to update their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to insert their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Job posts are publicly readable when approved" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can manage their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admin users can manage all job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Service role can access all job posts" ON public.provider_job_posts;

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE SIMPLE, WORKING POLICIES
-- ============================================================================

-- Policy 1: SELECT - Allow everyone to view approved job posts
CREATE POLICY "select_approved_jobs" 
ON public.provider_job_posts
FOR SELECT
USING (status = 'approved' OR status IS NULL);

-- Policy 2: SELECT - Allow owners to view their own job posts (any status)
CREATE POLICY "select_own_jobs" 
ON public.provider_job_posts
FOR SELECT
USING (owner_user_id = auth.uid());

-- Policy 3: INSERT - Allow authenticated users to create job posts
CREATE POLICY "insert_jobs" 
ON public.provider_job_posts
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Policy 4: UPDATE - Allow owners to update their own job posts
CREATE POLICY "update_own_jobs" 
ON public.provider_job_posts
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Policy 5: DELETE - Allow owners to delete their own job posts
-- THIS IS THE KEY POLICY THAT FIXES THE 403 ERROR
CREATE POLICY "delete_own_jobs" 
ON public.provider_job_posts
FOR DELETE
USING (owner_user_id = auth.uid());

-- ============================================================================
-- STEP 5: ADMIN POLICIES (if you need admin access)
-- ============================================================================

-- Check if is_admin_user function exists
-- If you have an admin system, uncomment these:

-- CREATE POLICY "admin_select_all_jobs" 
-- ON public.provider_job_posts
-- FOR SELECT
-- USING (is_admin_user(auth.uid()));

-- CREATE POLICY "admin_update_all_jobs" 
-- ON public.provider_job_posts
-- FOR UPDATE
-- USING (is_admin_user(auth.uid()));

-- CREATE POLICY "admin_delete_all_jobs" 
-- ON public.provider_job_posts
-- FOR DELETE
-- USING (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 6: VERIFY POLICIES WERE CREATED
-- ============================================================================

-- Show all policies for provider_job_posts table
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as policy_condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts'
ORDER BY cmd, policyname;

-- Expected output:
-- policyname           | operation | policy_condition
-- ---------------------+-----------+----------------------------------
-- delete_own_jobs      | DELETE    | USING: (owner_user_id = auth.uid())
-- insert_jobs          | INSERT    | WITH CHECK: (owner_user_id = auth.uid())
-- select_approved_jobs | SELECT    | USING: ((status = 'approved'::text) OR (status IS NULL))
-- select_own_jobs      | SELECT    | USING: (owner_user_id = auth.uid())
-- update_own_jobs      | UPDATE    | USING: (owner_user_id = auth.uid())

-- ============================================================================
-- STEP 7: TEST DELETE OPERATION
-- ============================================================================

-- Test if auth context works
SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_role;

-- See your job posts (should work now)
SELECT 
  id,
  title,
  owner_user_id,
  status,
  created_at
FROM provider_job_posts
WHERE owner_user_id = auth.uid()
ORDER BY created_at DESC;

-- ============================================================================
-- DONE!
-- ============================================================================

-- After running this script:
-- 1. You should be able to DELETE job posts where owner_user_id = your user id
-- 2. You should be able to UPDATE job posts where owner_user_id = your user id
-- 3. You should be able to INSERT new job posts
-- 4. You should be able to SELECT all approved job posts + your own job posts

-- If you still get 403 errors:
-- 1. Make sure you're authenticated (check auth.uid() is not null)
-- 2. Make sure the owner_user_id in the job post matches your user id
-- 3. Check the browser console for the exact error message
-- 4. Try refreshing the page to get a new auth token

