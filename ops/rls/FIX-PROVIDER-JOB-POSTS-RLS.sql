-- FIX PROVIDER_JOB_POSTS RLS POLICIES
-- Run this in Supabase SQL Editor to fix the 403 errors

-- ============================================================================
-- 1. CHECK CURRENT RLS STATUS
-- ============================================================================

-- Check if RLS is enabled on provider_job_posts table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts';

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES (to prevent conflicts)
-- ============================================================================

-- Drop all existing policies for provider_job_posts table
DROP POLICY IF EXISTS "Public can view published job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Public can view approved job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can view their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Authenticated users can create job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can update their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can delete their own job posts" ON public.provider_job_posts;

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE NEW RLS POLICIES
-- ============================================================================

-- SELECT: Allow everyone to view approved job posts (public read)
CREATE POLICY "Public can view approved job posts" ON public.provider_job_posts
  FOR SELECT USING (status = 'approved');

-- SELECT: Allow owners to view their own job posts (any status)
CREATE POLICY "Owners can view their own job posts" ON public.provider_job_posts
  FOR SELECT USING (owner_user_id = auth.uid());

-- INSERT: Allow authenticated users to create job posts
CREATE POLICY "Authenticated users can create job posts" ON public.provider_job_posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow owners to update their own job posts
CREATE POLICY "Owners can update their own job posts" ON public.provider_job_posts
  FOR UPDATE USING (owner_user_id = auth.uid());

-- DELETE: Allow owners to delete their own job posts
CREATE POLICY "Owners can delete their own job posts" ON public.provider_job_posts
  FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- 5. VERIFY POLICIES WERE CREATED
-- ============================================================================

-- Show all current RLS policies for provider_job_posts table
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
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts'
ORDER BY cmd, policyname;

-- ============================================================================
-- 6. TEST AUTH CONTEXT
-- ============================================================================

-- Test if auth.uid() works (this should work for authenticated users)
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- ============================================================================
-- 7. TEST BASIC QUERIES
-- ============================================================================

-- Test if you can query approved job posts (this should work)
SELECT 
  id,
  title,
  status,
  owner_user_id
FROM public.provider_job_posts 
WHERE status = 'approved'
LIMIT 5;

-- Test if you can query your own job posts (this should work when authenticated)
SELECT 
  id,
  title,
  status,
  owner_user_id
FROM public.provider_job_posts 
WHERE owner_user_id = auth.uid()
LIMIT 5;
