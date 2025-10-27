-- ============================================================================
-- VERIFY NOTIFICATION SYSTEM - Diagnostic Queries
-- ============================================================================
-- This file contains diagnostic queries to verify the notification system
-- is working correctly. Run these queries to troubleshoot issues.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CHECK TABLE STRUCTURE
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK RLS POLICIES
-- ============================================================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual 
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check 
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. CHECK RECENT NOTIFICATIONS
-- ============================================================================
SELECT 
  n.id,
  n.created_at,
  n.type,
  n.title,
  LEFT(n.message, 100) as message_preview,
  n.is_read,
  p.email as recipient_email,
  p.is_admin as recipient_is_admin,
  n.metadata
FROM public.user_notifications n
LEFT JOIN public.profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- ============================================================================
-- 4. CHECK NOTIFICATION COUNTS BY TYPE
-- ============================================================================
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_read THEN 1 END) as read_count,
  COUNT(CASE WHEN NOT is_read THEN 1 END) as unread_count
FROM public.user_notifications
GROUP BY type
ORDER BY count DESC;

-- ============================================================================
-- 5. CHECK NOTIFICATIONS BY USER
-- ============================================================================
SELECT 
  p.email,
  p.is_admin,
  COUNT(n.id) as total_notifications,
  COUNT(CASE WHEN NOT n.is_read THEN 1 END) as unread_count,
  MAX(n.created_at) as last_notification_at
FROM public.profiles p
LEFT JOIN public.user_notifications n ON n.user_id = p.id
WHERE p.is_admin = false  -- Focus on business owners
GROUP BY p.id, p.email, p.is_admin
HAVING COUNT(n.id) > 0
ORDER BY MAX(n.created_at) DESC
LIMIT 20;

-- ============================================================================
-- 6. CHECK FOR ORPHANED NOTIFICATIONS (missing user)
-- ============================================================================
SELECT 
  n.id,
  n.user_id,
  n.email,
  n.type,
  n.title,
  n.created_at
FROM public.user_notifications n
LEFT JOIN public.profiles p ON p.id = n.user_id
WHERE p.id IS NULL  -- No matching profile
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7. CHECK BUSINESS APPLICATIONS & NOTIFICATION STATUS
-- ============================================================================
SELECT 
  ba.id as application_id,
  ba.business_name,
  ba.email as applicant_email,
  ba.status as application_status,
  ba.created_at as applied_at,
  p.id as profile_id,
  p.email as profile_email,
  (
    SELECT COUNT(*) 
    FROM user_notifications un 
    WHERE un.user_id = p.id 
    AND un.type IN ('application_approved', 'application_rejected')
  ) as notification_count,
  (
    SELECT MAX(un.created_at)
    FROM user_notifications un 
    WHERE un.user_id = p.id 
    AND un.type IN ('application_approved', 'application_rejected')
  ) as last_notification_at
FROM public.business_applications ba
LEFT JOIN public.profiles p ON p.email = ba.email
WHERE ba.status IN ('approved', 'rejected')
ORDER BY ba.created_at DESC
LIMIT 20;

-- ============================================================================
-- 8. CHECK CHANGE REQUESTS & NOTIFICATION STATUS
-- ============================================================================
SELECT 
  cr.id as request_id,
  cr.type as request_type,
  cr.status as request_status,
  cr.created_at as requested_at,
  cr.decided_at,
  cr.reason,
  pr.name as business_name,
  prof.email as owner_email,
  (
    SELECT COUNT(*) 
    FROM user_notifications un 
    WHERE un.user_id = cr.owner_user_id 
    AND un.type = 'change_request'
    AND un.metadata->>'reqId' = cr.id::text
  ) as notification_count,
  (
    SELECT MAX(un.created_at)
    FROM user_notifications un 
    WHERE un.user_id = cr.owner_user_id 
    AND un.type = 'change_request'
    AND un.metadata->>'reqId' = cr.id::text
  ) as notification_sent_at
FROM public.provider_change_requests cr
LEFT JOIN public.providers pr ON pr.id = cr.provider_id
LEFT JOIN public.profiles prof ON prof.id = cr.owner_user_id
WHERE cr.status IN ('approved', 'rejected')
ORDER BY cr.decided_at DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- 9. CHECK FOR MISSING NOTIFICATIONS
-- ============================================================================
-- Business applications that were approved/rejected but have no notification
WITH approved_rejected_apps AS (
  SELECT 
    ba.id,
    ba.business_name,
    ba.email,
    ba.status,
    p.id as user_id
  FROM business_applications ba
  LEFT JOIN profiles p ON p.email = ba.email
  WHERE ba.status IN ('approved', 'rejected')
)
SELECT 
  ara.id as application_id,
  ara.business_name,
  ara.email,
  ara.status,
  ara.user_id,
  CASE 
    WHEN ara.user_id IS NULL THEN 'NO USER ACCOUNT'
    WHEN n.id IS NULL THEN 'NOTIFICATION MISSING'
    ELSE 'Notification exists'
  END as notification_status
FROM approved_rejected_apps ara
LEFT JOIN user_notifications n ON n.user_id = ara.user_id 
  AND n.type IN ('application_approved', 'application_rejected')
ORDER BY notification_status DESC, ara.business_name;

-- ============================================================================
-- 10. TEST ADMIN PERMISSIONS
-- ============================================================================
-- Check if current user is admin
SELECT 
  auth.uid() as my_user_id,
  p.email as my_email,
  p.is_admin as am_i_admin,
  CASE 
    WHEN p.is_admin THEN 'You can insert notifications for other users'
    ELSE 'You can only insert notifications for yourself'
  END as notification_permissions
FROM public.profiles p
WHERE p.id = auth.uid();

-- ============================================================================
-- TROUBLESHOOTING TIPS
-- ============================================================================
/*
If notifications are not being delivered:

1. CHECK METADATA COLUMN:
   - Run query #1 to verify metadata column exists with type JSONB

2. CHECK RLS POLICIES:
   - Run query #2 to verify admin insert policy exists
   - Ensure "Admins can insert any notification" policy is present

3. CHECK ADMIN STATUS:
   - Run query #10 to verify the admin user has is_admin=true

4. CHECK RECENT NOTIFICATIONS:
   - Run query #3 to see if ANY notifications are being created
   - If empty, notifications are not being sent at all

5. CHECK APPLICATION NOTIFICATIONS:
   - Run query #7 to verify approved/rejected applications have notifications
   - Look for "notification_count = 0" which means notification failed

6. CHECK CHANGE REQUEST NOTIFICATIONS:
   - Run query #8 to verify approved/rejected change requests have notifications
   - Look for "notification_count = 0" which means notification failed

7. CHECK BROWSER CONSOLE:
   - Open browser developer tools
   - Look for errors like "Failed to insert notification"
   - Check Network tab for 400/403 errors

8. CHECK NOTIFICATION BELL:
   - The NotificationBell component subscribes to real-time updates
   - If the bell doesn't update, check for subscription errors in console
*/

