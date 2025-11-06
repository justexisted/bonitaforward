-- Fix RLS policies for calendar_events INSERT to allow admin to create events
-- This ensures admin section can create calendar events without RLS errors
--
-- Problem:
-- The current INSERT policy requires created_by_user_id = auth.uid(), which means only users can create
-- events for themselves. But when an admin creates an event in the admin section, they need to be able
-- to create events (possibly with created_by_user_id belonging to someone else or null).
--
-- Solution:
-- Add an admin INSERT policy that allows admins to create events for anyone, similar to how
-- there's already an admin UPDATE and DELETE policy.
--
-- Date: 2025-01-XX

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing admin INSERT policy if it exists (might have different name)
DROP POLICY IF EXISTS "events_insert_admin" ON public.calendar_events;
DROP POLICY IF EXISTS "Admin full INSERT on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Only admins can insert calendar events" ON public.calendar_events;

-- Create admin INSERT policy
-- This allows admins to create events for anyone (including null created_by_user_id)
CREATE POLICY "events_insert_admin" 
ON public.calendar_events FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'calendar_events'
  AND cmd = 'INSERT'
ORDER BY policyname;

COMMIT;

-- Expected Result:
-- Two INSERT policies:
-- 1. "events_insert_auth" - Allows authenticated users to create events for themselves (created_by_user_id = auth.uid())
-- 2. "events_insert_admin" - Allows admins to create events for anyone (is_admin_user(auth.uid()))

