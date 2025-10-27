-- ============================================================================
-- COMPLETE NOTIFICATION FIX - Run this FIRST
-- ============================================================================
-- This script fixes ALL notification system issues in one go:
-- 1. Adds metadata column if missing
-- 2. Fixes RLS policies to allow admin notifications
-- 3. Verifies admin user permissions
-- 4. Tests the fix
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add metadata column (if missing)
-- ============================================================================
DO $$
BEGIN
  -- Check if metadata column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_notifications' 
    AND column_name = 'metadata'
  ) THEN
    -- Add metadata column
    ALTER TABLE public.user_notifications 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Added metadata column';
  ELSE
    RAISE NOTICE '✅ metadata column already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Fix RLS Policies
-- ============================================================================

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;

-- Create comprehensive policies

-- Policy 1: Users can insert notifications for themselves
CREATE POLICY "Users can insert own notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Policy 2: ADMINS can insert notifications for ANYONE (THE CRITICAL FIX!)
CREATE POLICY "Admins can insert any notification"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy 3: Service role can always insert
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- ============================================================================
-- PART 3: Verify Setup
-- ============================================================================

-- Show table structure
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Show RLS policies
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as command,
  permissive
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
ORDER BY cmd, policyname;

-- Show current user admin status
SELECT 
  'Your Admin Status' as check_type,
  email,
  is_admin,
  CASE 
    WHEN is_admin THEN '✅ Can send notifications to business users'
    ELSE '❌ NEED TO SET is_admin = true'
  END as permission_status
FROM public.profiles
WHERE id = auth.uid();

-- ============================================================================
-- PART 4: Check for Missing Notifications
-- ============================================================================

-- Find change requests that were approved but have no notification
SELECT 
  'Missing Notifications' as check_type,
  cr.id as request_id,
  cr.type,
  cr.status,
  cr.decided_at,
  pr.name as business_name,
  prof.email as owner_email,
  prof.id as owner_user_id,
  CASE 
    WHEN prof.id IS NULL THEN '❌ No user account'
    WHEN NOT EXISTS (
      SELECT 1 FROM user_notifications un 
      WHERE un.user_id = prof.id 
      AND un.type = 'change_request'
      AND un.created_at > cr.decided_at
      AND un.created_at < cr.decided_at + INTERVAL '1 hour'
    ) THEN '❌ Notification missing'
    ELSE '✅ Notification exists'
  END as notification_status
FROM provider_change_requests cr
LEFT JOIN providers pr ON pr.id = cr.provider_id
LEFT JOIN profiles prof ON prof.id = cr.owner_user_id
WHERE cr.status IN ('approved', 'rejected')
  AND cr.decided_at > NOW() - INTERVAL '7 days'
ORDER BY cr.decided_at DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
  '
  ╔════════════════════════════════════════════════════════════╗
  ║                  ✅ NOTIFICATION FIX COMPLETE              ║
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║  What was fixed:                                           ║
  ║  ✓ metadata column added/verified                         ║
  ║  ✓ RLS policies updated                                   ║
  ║  ✓ Admin notification permissions enabled                 ║
  ║                                                            ║
  ║  Next steps:                                               ║
  ║  1. Check "Your Admin Status" above                       ║
  ║  2. If is_admin = false, run:                             ║
  ║     UPDATE profiles SET is_admin = true                   ║
  ║     WHERE email = ''your-email@example.com'';             ║
  ║  3. Test by approving a change request                    ║
  ║  4. Business owner should see approval notification!      ║
  ║                                                            ║
  ║  Still not working? Check browser console for errors      ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  ' as "🎉 Status";

-- ============================================================================
-- OPTIONAL: Set your admin email (UNCOMMENT AND EDIT)
-- ============================================================================
-- Replace 'your-admin-email@example.com' with your actual email
-- 
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE email = 'your-admin-email@example.com';
-- 
-- SELECT 'Admin flag set!' as status;

