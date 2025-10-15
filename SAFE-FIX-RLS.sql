-- SAFE FIX: Re-enable RLS with proper policies (no auth.users access)
-- Run this AFTER the URGENT-FIX-RLS.sql script

-- ========================================
-- STEP 1: RE-ENABLE RLS WITH SAFE POLICIES
-- ========================================

-- Re-enable RLS on providers table with safe policies
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Create safe policies for providers (no auth.users table access)
CREATE POLICY "Allow all users to view providers" 
ON public.providers
FOR SELECT
USING (true);

CREATE POLICY "Allow users to update their own providers" 
ON public.providers
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Allow users to insert their own providers" 
ON public.providers
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Allow users to delete their own providers" 
ON public.providers
FOR DELETE
USING (owner_user_id = auth.uid());

-- Re-enable RLS on provider_change_requests table with safe policies
ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

-- Create safe policies for provider_change_requests (no auth.users table access)
CREATE POLICY "Allow users to view their own change requests" 
ON public.provider_change_requests
FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Allow users to create their own change requests" 
ON public.provider_change_requests
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Allow users to update their own change requests" 
ON public.provider_change_requests
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Allow users to delete their own change requests" 
ON public.provider_change_requests
FOR DELETE
USING (owner_user_id = auth.uid());

-- ========================================
-- STEP 2: VERIFY POLICIES ARE CREATED
-- ========================================

-- Check providers policies
SELECT 
  'providers' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
ORDER BY policyname;

-- Check provider_change_requests policies
SELECT 
  'provider_change_requests' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_change_requests'
ORDER BY policyname;
