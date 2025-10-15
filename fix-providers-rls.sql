-- Fix RLS policies for providers table
-- This removes the problematic auth.users table access that causes 403 errors

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

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
ORDER BY policyname;
