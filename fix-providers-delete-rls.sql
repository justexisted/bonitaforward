-- Fix RLS policies for providers table to allow business owners to delete their listings
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
-- You can run: SELECT * FROM pg_policies WHERE tablename = 'providers';

-- Drop existing DELETE policies that might be blocking
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
DROP POLICY IF EXISTS "Owners can delete their providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can delete their listings" ON public.providers;

-- Create a proper DELETE policy that allows owners to delete their listings
-- This checks BOTH owner_user_id AND email to handle all cases
CREATE POLICY "Business owners can delete their listings" 
ON public.providers
FOR DELETE
USING (
  -- User owns via owner_user_id
  owner_user_id = auth.uid()
  OR
  -- User owns via email match
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
);

-- Ensure UPDATE policy exists for editing
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
CREATE POLICY "Users can update their own providers"
ON public.providers
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Note: If you have RLS enabled but no policies, nothing will work
-- Check if RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'providers';
-- If rowsecurity is true but no policies work, you may need to disable RLS temporarily:
-- ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
-- (Not recommended for production - better to fix policies)

