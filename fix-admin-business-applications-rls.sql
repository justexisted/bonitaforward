-- Fix all RLS policies for business_applications to allow admin operations
-- This fixes "permission denied" errors when admins try to approve/reject applications

-- Drop all existing policies on business_applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can delete all applications" ON public.business_applications;
DROP POLICY IF EXISTS "Service role can do anything" ON public.business_applications;

-- 1. Allow users to view their own applications
CREATE POLICY "Users can view own applications" ON public.business_applications
  FOR SELECT USING (
    email = auth.jwt() ->> 'email'
  );

-- 2. Allow users to insert their own applications
CREATE POLICY "Users can insert own applications" ON public.business_applications
  FOR INSERT WITH CHECK (
    email = auth.jwt() ->> 'email'
  );

-- 3. Allow users to delete their own pending applications (cancel button)
CREATE POLICY "Users can delete own applications" ON public.business_applications
  FOR DELETE USING (
    email = auth.jwt() ->> 'email'
  );

-- 4. Allow admins to view ALL applications
CREATE POLICY "Admins can view all applications" ON public.business_applications
  FOR SELECT USING (
    auth.jwt() ->> 'email' ILIKE '%admin%'
  );

-- 5. Allow admins to update ANY application (approve/reject)
CREATE POLICY "Admins can update all applications" ON public.business_applications
  FOR UPDATE USING (
    auth.jwt() ->> 'email' ILIKE '%admin%'
  );

-- 6. Allow admins to delete ANY application (reject)
CREATE POLICY "Admins can delete all applications" ON public.business_applications
  FOR DELETE USING (
    auth.jwt() ->> 'email' ILIKE '%admin%'
  );

-- 7. Service role can do anything (for Netlify Functions)
CREATE POLICY "Service role can do anything" ON public.business_applications
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'business_applications'
ORDER BY cmd, policyname;

