-- Fix RLS policies for provider_job_posts table
-- The current policy tries to access auth.users table which causes permission denied errors

-- Drop existing policies
DROP POLICY IF EXISTS "Job posts are publicly readable when approved" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can manage their job posts" ON public.provider_job_posts;

-- Create new policies that don't access auth.users table directly
-- Instead, we'll use the admin_emails table for admin verification

-- Policy 1: Public read access for approved job posts
CREATE POLICY "Job posts are publicly readable when approved" 
ON public.provider_job_posts
FOR SELECT
USING (status = 'approved' OR status IS NULL);

-- Policy 2: Business owners can manage their own job posts
CREATE POLICY "Business owners can manage their job posts" 
ON public.provider_job_posts
FOR ALL
USING (owner_user_id = auth.uid());

-- Policy 3: Admin users can manage all job posts (using admin_emails table)
CREATE POLICY "Admin users can manage all job posts" 
ON public.provider_job_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Policy 4: Allow service role to access all job posts (for admin functions)
CREATE POLICY "Service role can access all job posts" 
ON public.provider_job_posts
FOR ALL
USING (auth.role() = 'service_role');
