-- AUDIT: Check current INSERT policies on providers table
-- Run this FIRST to see what policies actually exist
-- This will show the actual state before we apply any fixes
--
-- Date: 2025-01-XX

-- ============================================================================
-- 1. CHECK ALL INSERT POLICIES ON PROVIDERS TABLE
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- 2. CHECK ALL POLICIES ON PROVIDERS TABLE (for context)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. SUMMARY: COUNT POLICIES BY OPERATION
-- ============================================================================

SELECT 
  cmd as operation,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
GROUP BY cmd
ORDER BY cmd;

-- ============================================================================
-- 4. CHECK IF is_admin_user FUNCTION EXISTS
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_user';

-- ============================================================================
-- 5. CHECK IF admin_emails TABLE EXISTS (used by is_admin_user)
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_emails'
ORDER BY ordinal_position;

-- ============================================================================
-- 6. CHECK IF RLS IS ENABLED ON PROVIDERS TABLE
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'providers';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
--
-- INSERT policies should show:
-- - providers_insert_auth (for users: owner_user_id = auth.uid())
-- - providers_insert_admin (for admins: is_admin_user(auth.uid())) - THIS MIGHT BE MISSING
--
-- If providers_insert_admin is missing, that's the problem!
--
-- All policies should show:
-- - SELECT: providers_select_all (or similar)
-- - INSERT: providers_insert_auth, providers_insert_admin (if exists)
-- - UPDATE: providers_update_owner, providers_update_admin
-- - DELETE: providers_delete_owner, providers_delete_admin
--
-- ============================================================================

