-- ROLLBACK SCRIPT for security changes
-- Use this if the security fixes break functionality
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. DISABLE RLS ON ALL TABLES (EMERGENCY ROLLBACK)
-- ========================================

-- Disable RLS on all tables that were enabled
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers_backup DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_job_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_change_requests DISABLE ROW LEVEL SECURITY;

-- Disable RLS on additional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_events' AND table_schema = 'public') THEN
    ALTER TABLE public.booking_events DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications' AND table_schema = 'public') THEN
    ALTER TABLE public.user_notifications DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_providers' AND table_schema = 'public') THEN
    ALTER TABLE public.saved_providers DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ========================================
-- 2. DROP ALL CREATED POLICIES
-- ========================================

-- Drop all policies that were created
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;
DROP POLICY IF EXISTS "Only admins can access providers_backup" ON public.providers_backup;
DROP POLICY IF EXISTS "Only admins can access admin_emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Job posts are publicly readable when approved" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can manage their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can view their change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can create change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admins can manage all change requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Business owners can update their listings" ON public.providers;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can manage their saved providers" ON public.saved_providers;

-- ========================================
-- 3. DROP HELPER FUNCTION
-- ========================================

DROP FUNCTION IF EXISTS is_admin_user();

-- ========================================
-- 4. RESTORE ORIGINAL VIEW (IF NEEDED)
-- ========================================

-- If you had a view that was dropped, you might need to restore it
-- Check your backup or recreate it based on your needs
-- Example:
-- CREATE VIEW public.v_bookings_with_provider AS
-- SELECT * FROM booking_events; -- Adjust as needed

-- ========================================
-- 5. VERIFICATION
-- ========================================

-- Check that RLS is disabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('categories', 'providers_backup', 'admin_emails', 'provider_job_posts', 'provider_change_requests', 'providers', 'booking_events', 'user_notifications', 'saved_providers')
ORDER BY tablename;

-- Check that no policies exist
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 6. NOTES
-- ========================================

-- After running this rollback script:
-- 1. Your database will be back to its original state
-- 2. All RLS policies will be removed
-- 3. All tables will have RLS disabled
-- 4. The booking functionality should work again
-- 5. You'll still have the Supabase linter warnings, but functionality will be restored

-- If you want to try a more conservative approach later:
-- 1. Enable RLS on one table at a time
-- 2. Test functionality after each change
-- 3. Create very permissive policies initially
-- 4. Gradually tighten security as needed
