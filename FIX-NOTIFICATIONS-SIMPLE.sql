-- ============================================================================
-- SIMPLE NOTIFICATION FIX - Step by Step
-- ============================================================================
-- This script fixes the notification system without assuming column names
-- Run each section separately to diagnose the issue
-- ============================================================================

-- ============================================================================
-- STEP 1: Check what columns exist in profiles table
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check what columns exist in user_notifications table
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 3: Add metadata column if missing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_notifications' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.user_notifications 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added metadata column';
  ELSE
    RAISE NOTICE '✅ metadata column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Fix RLS Policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;

-- Policy 1: Users can insert their own notifications
CREATE POLICY "Users can insert own notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
-- STEP 5: Show RLS policies
-- ============================================================================
SELECT 
  policyname,
  cmd as command,
  permissive
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: Check YOUR admin status (run when logged in as admin)
-- ============================================================================
SELECT 
  id,
  is_admin,
  CASE 
    WHEN is_admin THEN '✅ Can send notifications to business users'
    ELSE '❌ NEED TO SET is_admin = true'
  END as status
FROM public.profiles
WHERE id = auth.uid();

-- ============================================================================
-- STEP 7: Check recent notifications
-- ============================================================================
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.created_at,
  n.is_read,
  p.is_admin as recipient_is_admin
FROM public.user_notifications n
LEFT JOIN public.profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 8: If you need to set admin flag (EDIT THIS!)
-- ============================================================================
-- Find your user ID first:
-- SELECT id, is_admin FROM public.profiles WHERE id = auth.uid();
--
-- Then set admin flag:
-- UPDATE public.profiles 
-- SET is_admin = true 
-- WHERE id = '<YOUR-USER-ID-HERE>';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
╔════════════════════════════════════════════════════════════╗
║  ✅ NOTIFICATION POLICIES FIXED                            ║
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  What was done:                                            ║
║  ✓ RLS policies updated                                   ║
║  ✓ Admins can now notify business users                   ║
║                                                            ║
║  Check STEP 6 output above:                                ║
║  - If is_admin = true → You are ready!                    ║
║  - If is_admin = false → Run STEP 8                       ║
║                                                            ║
║  Test:                                                     ║
║  1. Approve a business change request                     ║
║  2. Business owner should see notification                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as "Status";

