-- Fix RLS policy for business_applications INSERT
-- This fixes "new row violates row-level security policy" errors when users try to create business applications
--
-- Problem: The existing policy requires email = auth.jwt() ->> 'email', but auth.jwt() ->> 'email' 
-- may not be available or may not match exactly, causing inserts to fail.
--
-- Solution: Allow public inserts (WITH CHECK (true)) - similar to contact_leads table
-- Business applications should be able to be submitted by anyone, authenticated or not.
-- Users can view their own applications later using their email.
--
-- Date: 2025-01-XX

-- Drop ALL existing INSERT policies to ensure clean state
-- Note: There may be duplicate policies from different migration files
DROP POLICY IF EXISTS "applications_insert_all" ON public.business_applications;
DROP POLICY IF EXISTS "applications_insert_public" ON public.business_applications;
DROP POLICY IF EXISTS "applications_insert_authenticated" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications (auth)" ON public.business_applications;
DROP POLICY IF EXISTS "ba_anon_insert" ON public.business_applications;
DROP POLICY IF EXISTS "ba_auth_insert" ON public.business_applications;

-- Allow public inserts (anyone can submit a business application)
-- This is similar to how contact_leads works - public forms should work
-- Using "applications_insert_public" name to match master RLS policies
CREATE POLICY "applications_insert_public" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'business_applications'
  AND cmd = 'INSERT'
ORDER BY policyname;

