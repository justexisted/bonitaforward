-- DIAGNOSE RLS POLICIES - Run this in Supabase SQL Editor
-- This will show you the current RLS policies and help identify the problem

-- ============================================================================
-- 1. CHECK CURRENT RLS STATUS
-- ============================================================================

-- Check if RLS is enabled on each table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('providers', 'provider_change_requests');

-- ============================================================================
-- 2. SHOW CURRENT POLICIES
-- ============================================================================

-- Show all current RLS policies for providers table
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
  AND tablename = 'providers';

-- Show all current RLS policies for provider_change_requests table
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
  AND tablename = 'provider_change_requests';

-- Note: provider_job_posts table doesn't exist in the database schema
-- This section is commented out to prevent errors

-- ============================================================================
-- 3. CHECK FOR PROBLEMATIC POLICIES
-- ============================================================================

-- Look for policies that might be accessing auth.users table
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('providers', 'provider_change_requests')
  AND (
    qual LIKE '%auth.users%' 
    OR with_check LIKE '%auth.users%'
    OR qual LIKE '%users%'
    OR with_check LIKE '%users%'
  );

-- ============================================================================
-- 4. TEST AUTH CONTEXT
-- ============================================================================

-- Test if auth.uid() works (this should work for authenticated users)
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- ============================================================================
-- 5. TEST BASIC QUERIES
-- ============================================================================

-- Test if you can query your own providers (this should work)
SELECT 
  id,
  name,
  owner_user_id,
  published
FROM public.providers 
WHERE owner_user_id = auth.uid()
LIMIT 5;

-- Test if you can query published providers (this should work)
SELECT 
  id,
  name,
  owner_user_id,
  published
FROM public.providers 
WHERE published = true
LIMIT 5;
