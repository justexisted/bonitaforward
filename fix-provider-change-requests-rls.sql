-- Fix RLS policies for provider_change_requests table
-- This ensures business owners can access their own change requests

-- Drop existing policies first
DROP POLICY IF EXISTS "Business owners can view their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can create change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admins can manage all change requests" ON public.provider_change_requests;

-- Recreate the SELECT policy with proper logic (no auth.users table access)
CREATE POLICY "Business owners can view their change requests" 
ON public.provider_change_requests
FOR SELECT
USING (
  -- Allow users to see their own change requests
  owner_user_id = auth.uid()
);

-- Recreate the INSERT policy
CREATE POLICY "Business owners can create change requests" 
ON public.provider_change_requests
FOR INSERT
WITH CHECK (
  -- Allow users to create change requests for themselves
  owner_user_id = auth.uid()
);

-- Create a simple UPDATE policy for owners
CREATE POLICY "Business owners can update their change requests" 
ON public.provider_change_requests
FOR UPDATE
USING (
  -- Allow users to update their own change requests
  owner_user_id = auth.uid()
)
WITH CHECK (
  -- Ensure they can only update their own requests
  owner_user_id = auth.uid()
);

-- Create a simple DELETE policy for owners
CREATE POLICY "Business owners can delete their change requests" 
ON public.provider_change_requests
FOR DELETE
USING (
  -- Allow users to delete their own change requests
  owner_user_id = auth.uid()
);

-- Note: Admin policies should be created separately using service role
-- or through the Supabase dashboard with proper admin permissions
-- The above policies handle all user-level operations safely

-- Verify the policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_change_requests'
ORDER BY policyname;
