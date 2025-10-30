-- ============================================================================
-- FIX RLS POLICIES FOR user_notifications TABLE
-- ============================================================================
-- This migration fixes Row Level Security policies to allow:
-- 1. Users to insert their own notifications
-- 2. Admins to insert notifications for ANY user
-- 3. Service role to insert any notification
--
-- PROBLEM: Current policies only allow users to insert their OWN notifications,
-- which prevents admins from creating notifications for business owners.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop existing INSERT policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;

-- Step 2: Create new comprehensive INSERT policies

-- Policy 1: Users can insert notifications for themselves
CREATE POLICY "Users can insert own notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Policy 2: Admins can insert notifications for ANY user
-- This is CRITICAL for the admin notification system
CREATE POLICY "Admins can insert any notification"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy 3: Service role can always insert (for Netlify functions)
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
  );

-- Step 3: Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 4: Test admin notification insert (replace USER_ID with actual admin user ID)
-- This should succeed if you're an admin
-- DO $$
-- DECLARE
--   test_user_id UUID;
-- BEGIN
--   -- Get a test user ID (not yourself)
--   SELECT id INTO test_user_id FROM profiles WHERE is_admin = false LIMIT 1;
--   
--   IF test_user_id IS NOT NULL THEN
--     -- Try to insert a test notification
--     INSERT INTO public.user_notifications (
--       user_id,
--       type,
--       title,
--       message,
--       metadata
--     ) VALUES (
--       test_user_id,
--       'test',
--       'Test Admin Notification',
--       'This is a test notification from the admin',
--       '{"test": true}'::jsonb
--     );
--     
--     RAISE NOTICE 'Test notification inserted successfully!';
--     
--     -- Clean up test notification
--     DELETE FROM public.user_notifications 
--     WHERE user_id = test_user_id AND type = 'test' AND metadata->>'test' = 'true';
--   ELSE
--     RAISE NOTICE 'No non-admin users found for testing';
--   END IF;
-- END $$;

COMMENT ON POLICY "Admins can insert any notification" ON public.user_notifications IS 
  'Allows admins to create notifications for business owners when approving/rejecting applications';

