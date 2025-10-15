-- Quick fix for the policy conflict error
-- Run this in Supabase SQL Editor to resolve the immediate issue

-- Drop the conflicting policy first
DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;

-- Recreate it with the safe version
CREATE POLICY "Business owners can view their bookings" 
ON public.booking_events
FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM providers 
    WHERE owner_user_id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
  OR
  -- Allow if no user is authenticated (for system operations)
  auth.uid() IS NULL
);

-- Verify the policy was created successfully
SELECT 
  policyname,
  cmd as command,
  permissive
FROM pg_policies 
WHERE tablename = 'booking_events' 
  AND schemaname = 'public'
ORDER BY policyname;
