-- PROPER RLS FIX - Run this in Supabase SQL Editor
-- This creates proper RLS policies that don't access auth.users table

-- ============================================================================
-- 1. FIX PROVIDERS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on providers table if not already enabled
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow all users to view providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to insert their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow users to delete their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can view all providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Public can view published providers" ON public.providers;
DROP POLICY IF EXISTS "Owners can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers;
DROP POLICY IF EXISTS "Owners can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Owners can delete their own providers" ON public.providers;

-- Create proper RLS policies for providers table
-- SELECT: Allow everyone to view published providers (public read)
CREATE POLICY "Public can view published providers" ON public.providers
  FOR SELECT USING (published = true);

-- SELECT: Allow owners to view their own providers (published or not)
CREATE POLICY "Owners can view their own providers" ON public.providers
  FOR SELECT USING (owner_user_id = auth.uid());

-- INSERT: Allow authenticated users to create providers (they become the owner)
CREATE POLICY "Authenticated users can create providers" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow owners to update their own providers
CREATE POLICY "Owners can update their own providers" ON public.providers
  FOR UPDATE USING (owner_user_id = auth.uid());

-- DELETE: Allow owners to delete their own providers
CREATE POLICY "Owners can delete their own providers" ON public.providers
  FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- 2. FIX PROVIDER_CHANGE_REQUESTS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on provider_change_requests table if not already enabled
ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can update their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can insert their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Users can delete their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Owners can view their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Authenticated users can create change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Owners can update their own change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Owners can delete their own change requests" ON public.provider_change_requests;

-- Create proper RLS policies for provider_change_requests table
-- SELECT: Allow owners to view their own change requests
CREATE POLICY "Owners can view their own change requests" ON public.provider_change_requests
  FOR SELECT USING (owner_user_id = auth.uid());

-- INSERT: Allow authenticated users to create change requests
CREATE POLICY "Authenticated users can create change requests" ON public.provider_change_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow owners to update their own change requests
CREATE POLICY "Owners can update their own change requests" ON public.provider_change_requests
  FOR UPDATE USING (owner_user_id = auth.uid());

-- DELETE: Allow owners to delete their own change requests
CREATE POLICY "Owners can delete their own change requests" ON public.provider_change_requests
  FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- 3. NOTE: PROVIDER_JOB_POSTS TABLE DOES NOT EXIST
-- ============================================================================

-- The provider_job_posts table doesn't exist in the database schema.
-- The error you're seeing is because the code is trying to query a non-existent table.
-- This section is commented out to prevent errors.

-- If you need job posts functionality, you'll need to create the table first:
-- CREATE TABLE public.provider_job_posts (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   provider_id uuid REFERENCES public.providers(id),
--   owner_user_id uuid REFERENCES auth.users(id),
--   title text NOT NULL,
--   description text,
--   apply_url text,
--   published boolean DEFAULT true,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now()
-- );

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify the policies work)
-- ============================================================================

-- Test that you can view your own providers
-- SELECT * FROM public.providers WHERE owner_user_id = auth.uid();

-- Test that you can view published providers
-- SELECT * FROM public.providers WHERE published = true LIMIT 5;

-- Test that you can view your own change requests
-- SELECT * FROM public.provider_change_requests WHERE owner_user_id = auth.uid();

-- Test that you can view your own job posts
-- SELECT * FROM public.provider_job_posts WHERE owner_user_id = auth.uid();
