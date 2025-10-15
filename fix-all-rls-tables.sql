-- Comprehensive fix for ALL RLS issues across all tables
-- This fixes provider_change_requests, providers, and provider_job_posts tables

-- ========================================
-- 1. FIX PROVIDER_CHANGE_REQUESTS TABLE
-- ========================================

-- Drop all existing policies for provider_change_requests table
DROP POLICY IF EXISTS "Business owners can view their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can create change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admins can manage all change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can update their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can delete their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can view their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can create their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can update their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can delete their own change requests" ON public.provider_change_requests;

-- Create simple policies that only use auth.uid() (no table access)
CREATE POLICY "Users can view their own change requests" 
ON public.provider_change_requests
FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own change requests" 
ON public.provider_change_requests
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own change requests" 
ON public.provider_change_requests
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own change requests" 
ON public.provider_change_requests
FOR DELETE
USING (owner_user_id = auth.uid());

-- ========================================
-- 2. FIX PROVIDERS TABLE
-- ========================================

-- First, enable RLS on providers table if not already enabled
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for providers table
DROP POLICY IF EXISTS "Users can view providers" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can manage all providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can view their providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can update their providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can create providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can delete their providers" ON public.providers;
DROP POLICY IF EXISTS "Allow all users to view providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to insert their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to delete their own providers" ON public.providers;

-- Create simple policies that only use auth.uid() (no table access)

-- Allow users to view all providers (for browsing)
CREATE POLICY "Allow all users to view providers" 
ON public.providers
FOR SELECT
USING (true);

-- Allow users to update providers they own
CREATE POLICY "Allow users to update their own providers" 
ON public.providers
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to insert providers (for new listings)
CREATE POLICY "Allow users to insert their own providers" 
ON public.providers
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to delete providers they own
CREATE POLICY "Allow users to delete their own providers" 
ON public.providers
FOR DELETE
USING (owner_user_id = auth.uid());

-- ========================================
-- 3. FIX PROVIDER_JOB_POSTS TABLE
-- ========================================

-- First, enable RLS on provider_job_posts table if not already enabled
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for provider_job_posts table
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

-- Create simple policies that only use auth.uid() (no table access)

-- Allow users to view all job posts (for browsing)
CREATE POLICY "Allow all users to view job posts" 
ON public.provider_job_posts
FOR SELECT
USING (true);

-- Allow users to update job posts they own
CREATE POLICY "Allow users to update their own job posts" 
ON public.provider_job_posts
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to insert job posts (for new job postings)
CREATE POLICY "Allow users to insert their own job posts" 
ON public.provider_job_posts
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to delete job posts they own
CREATE POLICY "Allow users to delete their own job posts" 
ON public.provider_job_posts
FOR DELETE
USING (owner_user_id = auth.uid());

-- ========================================
-- 4. VERIFY ALL POLICIES ARE CREATED
-- ========================================

-- Check provider_change_requests policies
SELECT 
  'provider_change_requests' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_change_requests'
ORDER BY policyname;

-- Check providers policies
SELECT 
  'providers' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
ORDER BY policyname;

-- Check provider_job_posts policies
SELECT 
  'provider_job_posts' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts'
ORDER BY policyname;
