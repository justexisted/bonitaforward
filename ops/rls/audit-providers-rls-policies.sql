-- Audit current RLS policies on providers table
-- This script checks what policies currently exist to diagnose the issue
-- Run this BEFORE applying any fixes to see the current state
--
-- Date: 2025-01-XX

-- Check all INSERT policies on providers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Check ALL policies on providers table (for context)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
ORDER BY cmd, policyname;

-- Check if is_admin_user function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_user';

-- Check if admin_emails table exists (used by is_admin_user)
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_emails';

-- Summary: This will show:
-- 1. What INSERT policies currently exist on providers table
-- 2. What all policies exist (INSERT, UPDATE, DELETE, SELECT)
-- 3. Whether is_admin_user function exists
-- 4. Whether admin_emails table exists
--
-- Expected for fix:
-- - Should have providers_insert_auth (for users)
-- - Should have providers_insert_admin (for admins) - THIS IS PROBABLY MISSING
-- - Should have providers_update_owner, providers_update_admin
-- - Should have providers_delete_owner, providers_delete_admin
-- - Should have providers_select_all (or similar)

