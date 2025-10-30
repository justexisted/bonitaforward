-- Fix RLS policies for providers table to allow business owners to enable booking features
-- Run this in Supabase SQL Editor

-- First, let's check current policies
-- You can run: SELECT * FROM pg_policies WHERE tablename = 'providers';

-- Drop existing UPDATE policies that might be too restrictive
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can update their listings" ON public.providers;
DROP POLICY IF EXISTS "Owners can update their providers" ON public.providers;

-- Create a comprehensive UPDATE policy that allows business owners to update their listings
-- This handles multiple ownership scenarios:
-- 1. owner_user_id matches auth.uid()
-- 2. email matches the authenticated user's email
-- 3. Admin users (for emergency updates)
CREATE POLICY "Business owners can update their listings" 
ON public.providers
FOR UPDATE
USING (
  -- User owns via owner_user_id
  owner_user_id = auth.uid()
  OR
  -- User owns via email match (for businesses without owner_user_id set)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can update any listing (for emergency fixes)
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    SELECT unnest(string_to_array(current_setting('app.settings.admin_emails', true), ','))
  )
)
WITH CHECK (
  -- Same conditions for the WITH CHECK clause
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    SELECT unnest(string_to_array(current_setting('app.settings.admin_emails', true), ','))
  )
);

-- Also ensure SELECT policy exists so users can see their listings
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
CREATE POLICY "Users can view their own providers"
ON public.providers
FOR SELECT
USING (
  -- Public can see published listings
  published = true
  OR
  -- Owner can see their own listings (even unpublished)
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can see all listings
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    SELECT unnest(string_to_array(current_setting('app.settings.admin_emails', true), ','))
  )
);

-- Ensure INSERT policy exists for creating new listings
DROP POLICY IF EXISTS "Users can insert their own providers" ON public.providers;
CREATE POLICY "Users can insert their own providers"
ON public.providers
FOR INSERT
WITH CHECK (
  -- Owner can create listings with their user ID
  owner_user_id = auth.uid()
  OR
  -- Owner can create listings with their email
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can create listings for anyone
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    SELECT unnest(string_to_array(current_setting('app.settings.admin_emails', true), ','))
  )
);

-- Ensure DELETE policy exists (keeping existing delete policy)
DROP POLICY IF EXISTS "Business owners can delete their listings" ON public.providers;
CREATE POLICY "Business owners can delete their listings" 
ON public.providers
FOR DELETE
USING (
  -- User owns via owner_user_id
  owner_user_id = auth.uid()
  OR
  -- User owns via email match
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can delete any listing
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    SELECT unnest(string_to_array(current_setting('app.settings.admin_emails', true), ','))
  )
);

-- Set up the admin emails configuration
-- This allows admin users to bypass RLS restrictions
-- You'll need to set this in your Supabase dashboard or via SQL
-- Example: ALTER DATABASE your_db_name SET app.settings.admin_emails = 'admin@example.com,admin2@example.com';

-- Alternative: Create a function to check admin status
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is in the admin emails list
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com',  -- Add your admin emails here
    'your-admin@example.com'  -- Add more as needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies to use the function for better performance
DROP POLICY IF EXISTS "Business owners can update their listings" ON public.providers;
CREATE POLICY "Business owners can update their listings" 
ON public.providers
FOR UPDATE
USING (
  -- User owns via owner_user_id
  owner_user_id = auth.uid()
  OR
  -- User owns via email match
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can update any listing
  is_admin_user()
)
WITH CHECK (
  -- Same conditions for the WITH CHECK clause
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
);

-- Refresh the other policies with the function
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
CREATE POLICY "Users can view their own providers"
ON public.providers
FOR SELECT
USING (
  -- Public can see published listings
  published = true
  OR
  -- Owner can see their own listings (even unpublished)
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin users can see all listings
  is_admin_user()
);

-- Test the policies
-- You can test with: 
-- SELECT * FROM providers WHERE owner_user_id = auth.uid();
-- UPDATE providers SET enable_calendar_booking = true WHERE id = 'your-provider-id';

-- If you still have issues, you can temporarily check RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'providers';
-- If rowsecurity is true, the policies above should work
-- If you need to disable RLS temporarily for debugging: ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
