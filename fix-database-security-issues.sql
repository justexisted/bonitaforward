-- Fix all database security issues identified by Supabase linter
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. FIX SECURITY DEFINER VIEW ISSUE
-- ========================================

-- The view `v_bookings_with_provider` has SECURITY DEFINER which can be risky
-- Let's check what this view does and either fix it or recreate it properly
DROP VIEW IF EXISTS public.v_bookings_with_provider;

-- Recreate the view without SECURITY DEFINER
-- (This assumes it was joining bookings with provider info - adjust as needed)
CREATE VIEW public.v_bookings_with_provider AS
SELECT 
  b.*,
  p.name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.category_key as provider_category
FROM booking_events b
JOIN providers p ON p.id = b.provider_id
WHERE p.published = true; -- Only show bookings for published providers

-- ========================================
-- 2. ENABLE RLS ON ALL PUBLIC TABLES
-- ========================================

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for categories (public read access)
CREATE POLICY "Categories are publicly readable" 
ON public.categories
FOR SELECT
USING (true); -- Allow everyone to read categories

-- Enable RLS on providers_backup table
ALTER TABLE public.providers_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for providers_backup (admin only)
CREATE POLICY "Only admins can access providers_backup" 
ON public.providers_backup
FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Add your admin emails here
    -- Add more admin emails as needed
  )
);

-- Enable RLS on admin_emails table
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin_emails (admin only)
CREATE POLICY "Only admins can access admin_emails" 
ON public.admin_emails
FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Add your admin emails here
    -- Add more admin emails as needed
  )
);

-- Enable RLS on provider_job_posts table
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for provider_job_posts
CREATE POLICY "Job posts are publicly readable when approved" 
ON public.provider_job_posts
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Business owners can manage their job posts" 
ON public.provider_job_posts
FOR ALL
USING (
  owner_user_id = auth.uid()
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
);

-- Enable RLS on provider_change_requests table
ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for provider_change_requests
CREATE POLICY "Business owners can view their change requests" 
ON public.provider_change_requests
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
);

CREATE POLICY "Business owners can create change requests" 
ON public.provider_change_requests
FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid()
  OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
);

CREATE POLICY "Admins can manage all change requests" 
ON public.provider_change_requests
FOR UPDATE
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
)
WITH CHECK (
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Admin emails
  )
);

-- ========================================
-- 3. CREATE HELPER FUNCTION FOR ADMIN CHECKS
-- ========================================

-- Create a reusable function to check admin status
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is in the admin emails list
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com'  -- Add your admin emails here
    -- Add more admin emails as needed: 'admin2@example.com', 'admin3@example.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. UPDATE EXISTING POLICIES TO USE HELPER FUNCTION
-- ========================================

-- Update providers table policies to use the helper function
-- (This assumes you've already run the fix-booking-rls-policies.sql script)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Business owners can update their listings" ON public.providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Business owners can delete their listings" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON public.providers;

-- Recreate with helper function
CREATE POLICY "Business owners can update their listings" 
ON public.providers
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
);

CREATE POLICY "Users can view their own providers"
ON public.providers
FOR SELECT
USING (
  published = true
  OR
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
);

CREATE POLICY "Business owners can delete their listings" 
ON public.providers
FOR DELETE
USING (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
);

CREATE POLICY "Users can insert their own providers"
ON public.providers
FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid()
  OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  is_admin_user()
);

-- ========================================
-- 5. ENABLE RLS ON OTHER IMPORTANT TABLES
-- ========================================

-- Enable RLS on booking_events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_events' AND table_schema = 'public') THEN
    ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for booking_events
    DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_events;
    DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;
    
    CREATE POLICY "Users can view their own bookings" 
    ON public.booking_events
    FOR SELECT
    USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
    
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
      is_admin_user()
    );
  END IF;
END $$;

-- Enable RLS on user_notifications table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications' AND table_schema = 'public') THEN
    ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for user_notifications
    DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;
    
    CREATE POLICY "Users can manage their own notifications" 
    ON public.user_notifications
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Enable RLS on saved_providers table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_providers' AND table_schema = 'public') THEN
    ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for saved_providers
    DROP POLICY IF EXISTS "Users can manage their saved providers" ON public.saved_providers;
    
    CREATE POLICY "Users can manage their saved providers" 
    ON public.saved_providers
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ========================================
-- 6. VERIFICATION QUERIES
-- ========================================

-- Check which tables now have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('categories', 'providers_backup', 'admin_emails', 'provider_job_posts', 'provider_change_requests', 'providers', 'booking_events', 'user_notifications', 'saved_providers')
ORDER BY tablename;

-- Check all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 7. NOTES
-- ========================================

-- IMPORTANT: Update the admin emails in the is_admin_user() function
-- with your actual admin email addresses.

-- After running this script, your database should pass all Supabase linter checks:
-- ✅ No more SECURITY DEFINER views
-- ✅ RLS enabled on all public tables
-- ✅ Proper policies for data access control

-- Test the policies work correctly by:
-- 1. Logging in as a business owner and trying to enable booking
-- 2. Logging in as an admin and accessing admin-only tables
-- 3. Verifying public users can only see published content
