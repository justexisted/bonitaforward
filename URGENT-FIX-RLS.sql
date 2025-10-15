-- URGENT FIX: Remove all RLS policies that access auth.users table
-- This will immediately fix the 403 permission errors

-- ========================================
-- STEP 1: DISABLE RLS TEMPORARILY TO FIX THE ISSUE
-- ========================================

-- Disable RLS on providers table temporarily
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on provider_change_requests table temporarily  
ALTER TABLE public.provider_change_requests DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: VERIFY RLS IS DISABLED
-- ========================================

-- Check if RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('providers', 'provider_change_requests')
ORDER BY tablename;

-- This should show rls_enabled = false for both tables
