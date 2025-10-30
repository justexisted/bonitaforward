-- Fix RLS policies for user_notifications so admins can send notifications to users
-- This allows admin users to insert notifications for any user

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.user_notifications;

-- 1. Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Admins can view ALL notifications
CREATE POLICY "Admins can view all notifications" ON public.user_notifications
  FOR SELECT USING (
    auth.jwt() ->> 'email' ILIKE '%admin%'
  );

-- 3. Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Admins can insert notifications for ANY user
CREATE POLICY "Admins can insert any notification" ON public.user_notifications
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' ILIKE '%admin%'
    OR auth.role() = 'service_role'
  );

-- Clean up old broken notifications that just say "Notification"
DELETE FROM public.user_notifications 
WHERE title = 'Notification' 
  OR message = 'Notification message'
  OR message = '';

-- Show remaining notifications for verification
SELECT 
  id, 
  user_id, 
  title, 
  message, 
  is_read,
  created_at 
FROM public.user_notifications 
ORDER BY created_at DESC;

