-- Comprehensive fix for all RLS issues
-- This fixes both provider_change_requests and providers tables

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

-- Create simple policies that only use auth.uid() (no table access)

-- Allow users to view all providers (for browsing)
CREATE POLICY "Users can view all providers" 
ON public.providers
FOR SELECT
USING (true);

-- Allow users to update providers they own
CREATE POLICY "Users can update their own providers" 
ON public.providers
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to insert providers (for new listings)
CREATE POLICY "Users can insert providers" 
ON public.providers
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to delete providers they own
CREATE POLICY "Users can delete their own providers" 
ON public.providers
FOR DELETE
USING (owner_user_id = auth.uid());

-- ========================================
-- 3. VERIFY POLICIES ARE CREATED
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
