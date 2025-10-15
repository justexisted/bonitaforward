-- Quick fix for provider_change_requests RLS policies
-- This removes the problematic auth.users table access

-- Drop all existing policies
DROP POLICY IF EXISTS "Business owners can view their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can create change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admins can manage all change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can update their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can delete their change requests" ON public.provider_change_requests;

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

-- Verify policies are created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'provider_change_requests';
