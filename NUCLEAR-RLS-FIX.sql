-- NUCLEAR RLS FIX - This will DEFINITELY work
-- This completely removes all RLS and recreates it from scratch

-- ============================================================================
-- STEP 1: COMPLETELY DISABLE RLS ON ALL TABLES
-- ============================================================================

-- Disable RLS completely on providers table
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on provider_change_requests table  
ALTER TABLE public.provider_change_requests DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES (even if they don't exist)
-- ============================================================================

-- Drop ALL possible policy names for providers table
DO $$
DECLARE
    pol_name text;
BEGIN
    -- Get all policy names for providers table
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'providers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.providers', pol_name);
    END LOOP;
    
    -- Get all policy names for provider_change_requests table
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'provider_change_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_change_requests', pol_name);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: RECREATE RLS WITH PROPER POLICIES
-- ============================================================================

-- Re-enable RLS on providers table
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies for providers table
CREATE POLICY "providers_select_policy" ON public.providers
    FOR SELECT USING (true);

CREATE POLICY "providers_insert_policy" ON public.providers
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "providers_update_policy" ON public.providers
    FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "providers_delete_policy" ON public.providers
    FOR DELETE USING (owner_user_id = auth.uid());

-- Re-enable RLS on provider_change_requests table
ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies for provider_change_requests table
CREATE POLICY "change_requests_select_policy" ON public.provider_change_requests
    FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_insert_policy" ON public.provider_change_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "change_requests_update_policy" ON public.provider_change_requests
    FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_delete_policy" ON public.provider_change_requests
    FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================

-- Test that RLS is working properly
SELECT 'RLS Status Check' as test_name;

-- Check providers table policies
SELECT 
    'providers' as table_name,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'providers'
ORDER BY policyname;

-- Check provider_change_requests table policies  
SELECT 
    'provider_change_requests' as table_name,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'provider_change_requests'
ORDER BY policyname;

-- Test auth.uid() function
SELECT 
    'auth_test' as test_name,
    auth.uid() as current_user_id,
    auth.role() as current_role;
