-- FIX RLS POLICIES WITHOUT DISABLING RLS
-- This keeps RLS enabled but fixes the broken policies

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (but keep RLS enabled)
-- ============================================================================

-- Drop ALL possible policy names for providers table
DO $$
DECLARE
    pol_name text;
BEGIN
    -- Get all policy names for providers table and drop them
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'providers'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.providers', pol_name);
    END LOOP;
    
    -- Get all policy names for provider_change_requests table and drop them
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'provider_change_requests'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.provider_change_requests', pol_name);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: CREATE NEW WORKING POLICIES (RLS stays enabled)
-- ============================================================================

-- Create new policies for providers table
CREATE POLICY "providers_select_all" ON public.providers
    FOR SELECT USING (true);

CREATE POLICY "providers_insert_auth" ON public.providers
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "providers_update_owner" ON public.providers
    FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "providers_delete_owner" ON public.providers
    FOR DELETE USING (owner_user_id = auth.uid());

-- Create new policies for provider_change_requests table
CREATE POLICY "change_requests_select_owner" ON public.provider_change_requests
    FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_insert_auth" ON public.provider_change_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "change_requests_update_owner" ON public.provider_change_requests
    FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_delete_owner" ON public.provider_change_requests
    FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- STEP 3: VERIFY RLS IS STILL ENABLED AND POLICIES WORK
-- ============================================================================

-- Check that RLS is still enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('providers', 'provider_change_requests');

-- Check the new policies
SELECT 
    'providers' as table_name,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'providers'
ORDER BY policyname;

SELECT 
    'provider_change_requests' as table_name,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'provider_change_requests'
ORDER BY policyname;

-- Test auth.uid() works
SELECT 
    'auth_test' as test_name,
    auth.uid() as current_user_id,
    auth.role() as current_role;
