-- Allow users to delete their own business applications
-- This enables the "Cancel" button on the /account page to work properly

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete own applications" ON public.business_applications;

-- Create policy to allow users to delete applications that match their email
CREATE POLICY "Users can delete own applications" ON public.business_applications
  FOR DELETE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'business_applications' 
  AND cmd = 'DELETE';

