-- ============================================================================
-- URGENT FIX: Allow Admins to Send Notifications to Business Users
-- ============================================================================
-- PROBLEM: Business users can create notifications for themselves, but admins
--          cannot create notifications for business users when approving changes.
--
-- SYMPTOM: Business owners get "waiting for approval" notification but NOT
--          "change approved" notification.
--
-- ROOT CAUSE: RLS policy only allows users to insert notifications for themselves.
--             Admin needs permission to insert notifications for OTHER users.
--
-- SOLUTION: Add RLS policy allowing admins to insert notifications for anyone.
--
-- Run this in Supabase SQL Editor NOW
-- ============================================================================

-- Step 1: Check current policies (for reference)
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 100)
    ELSE 'No check'
  END as policy_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 2: Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;

-- Step 3: Create NEW comprehensive policies

-- Policy 1: Users can insert notifications for THEMSELVES
CREATE POLICY "Users can insert own notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    -- Allow if inserting for own user_id
    auth.uid() = user_id 
    OR 
    -- Allow if inserting for own email
    (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Policy 2: ADMINS can insert notifications for ANYONE (THIS IS THE FIX!)
CREATE POLICY "Admins can insert any notification"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    -- Check if current user is an admin
    EXISTS (
      SELECT 1 
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy 3: Service role can always insert (for Netlify functions)
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Step 4: Verify new policies were created
SELECT 
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 150)
    ELSE 'No check'
  END as policy_summary
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 5: Verify admin user has is_admin flag set
-- REPLACE 'your-admin-email@example.com' with your actual admin email
SELECT 
  id,
  email,
  is_admin,
  CASE 
    WHEN is_admin THEN '✅ You can send notifications to business users'
    ELSE '❌ YOU NEED TO SET is_admin = true'
  END as notification_permission
FROM public.profiles
WHERE email = auth.jwt()->>'email';  -- Shows current logged-in user

-- If is_admin is FALSE, run this to fix it:
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE email = 'your-admin-email@example.com';

-- Step 6: TEST - Try to insert a test notification as admin
-- This will ONLY work if you're logged in as an admin user
-- DO $$
-- DECLARE
--   test_business_user_id UUID;
-- BEGIN
--   -- Get a real business user ID (not an admin)
--   SELECT id INTO test_business_user_id 
--   FROM profiles 
--   WHERE is_admin = false 
--   LIMIT 1;
--   
--   IF test_business_user_id IS NOT NULL THEN
--     -- Try to insert notification for that business user
--     INSERT INTO public.user_notifications (
--       user_id,
--       type,
--       title,
--       message,
--       metadata
--     ) VALUES (
--       test_business_user_id,
--       'test_admin_notification',
--       '🧪 Test: Admin Can Send Notifications',
--       'If you see this, the fix worked! Admin can now notify business users.',
--       '{"test": true, "fixed_at": "' || NOW()::text || '"}'::jsonb
--     );
--     
--     RAISE NOTICE '✅ SUCCESS! Test notification inserted for user %', test_business_user_id;
--     RAISE NOTICE 'Business user should now see this notification in their bell!';
--     
--     -- Clean up test notification after 5 seconds (optional)
--     -- DELETE FROM public.user_notifications 
--     -- WHERE type = 'test_admin_notification' AND metadata->>'test' = 'true';
--     
--   ELSE
--     RAISE NOTICE '⚠️  No business users found for testing';
--   END IF;
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE '❌ FAILED: %', SQLERRM;
--     RAISE NOTICE 'Check if current user is an admin: SELECT is_admin FROM profiles WHERE id = auth.uid()';
-- END $$;

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================
-- After running this script, verify:
-- 
-- [ ] 3 INSERT policies exist for user_notifications table
-- [ ] "Admins can insert any notification" policy exists
-- [ ] Your admin user has is_admin = true in profiles table
-- [ ] Test notification was inserted successfully
-- [ ] Business user can see test notification in their notification bell
--
-- If test notification insert fails, check:
-- 1. Are you logged into Supabase as the admin user?
-- 2. Does that user have is_admin = true in profiles?
-- 3. Are there any other RLS policies interfering?
-- ============================================================================

-- Final check: Show all RLS policies for user_notifications
SELECT 
  policyname,
  cmd as command,
  permissive,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has check'
    ELSE 'No check'
  END as has_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
ORDER BY cmd, policyname;

-- Success message
SELECT '
╔════════════════════════════════════════════════════════════╗
║  ✅ RLS POLICIES FIXED                                     ║
║                                                            ║
║  Admins can now send notifications to business users!     ║
║                                                            ║
║  Next steps:                                               ║
║  1. Verify your admin user has is_admin = true            ║
║  2. Test by approving a business change request           ║
║  3. Business owner should see approval notification       ║
║                                                            ║
║  If still not working, run verify-notification-system.sql ║
╚════════════════════════════════════════════════════════════╝
' as "Status";

