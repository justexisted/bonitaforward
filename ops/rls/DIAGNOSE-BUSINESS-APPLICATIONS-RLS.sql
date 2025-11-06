-- ========================================
-- DIAGNOSE BUSINESS APPLICATIONS RLS ISSUE
-- ========================================
-- Run this to understand why applications aren't showing
-- Copy/paste ALL results to diagnose the root cause

-- 1. Show ALL policies on business_applications table
-- CRITICAL: PostgreSQL evaluates ALL SELECT policies with OR logic
-- If ANY policy is broken, the ENTIRE query fails
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'business_applications'
ORDER BY cmd, policyname;

-- 2. Check for policies that access auth.users (these often break)
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'business_applications'
  AND (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%')
ORDER BY cmd, policyname;

-- 3. Check what email you're logged in as
SELECT 
  auth.uid() as my_user_id,
  auth.jwt()->>'email' as my_email_from_jwt,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as my_email_from_auth_users;

-- 4. Check if there are any applications in the database
SELECT 
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM business_applications;

-- 5. Check applications with the email we're querying for
-- Replace '01agustin92@gmail.com' with the actual email
-- NOTE: decided_at column may not exist - check schema first
SELECT 
  id,
  business_name,
  email,
  status,
  created_at,
  LOWER(TRIM(email)) as email_normalized,
  LOWER(TRIM('01agustin92@gmail.com')) as query_email_normalized,
  LOWER(TRIM(email)) = LOWER(TRIM('01agustin92@gmail.com')) as emails_match
FROM business_applications
WHERE email ILIKE '%01agustin92%'
ORDER BY created_at DESC;

-- 6. Test the RLS policy directly
-- This simulates what the frontend query does
SELECT 
  id,
  business_name,
  email,
  status,
  created_at
FROM business_applications
WHERE email = '01agustin92@gmail.com'
ORDER BY created_at DESC;

-- 7. Test with case-insensitive matching
SELECT 
  id,
  business_name,
  email,
  status,
  created_at
FROM business_applications
WHERE LOWER(TRIM(email)) = LOWER(TRIM('01agustin92@gmail.com'))
ORDER BY created_at DESC;

-- 8. Check if the RLS policy condition would match
-- This shows what the policy is checking
SELECT 
  ba.id,
  ba.business_name,
  ba.email as app_email,
  ba.status,
  ba.created_at,
  au.email as auth_users_email,
  auth.jwt()->>'email' as jwt_email,
  ba.email = (SELECT email FROM auth.users WHERE id = auth.uid()) as policy_match_auth_users,
  LOWER(TRIM(ba.email)) = LOWER(TRIM(auth.jwt()->>'email')) as policy_match_jwt
FROM business_applications ba
LEFT JOIN auth.users au ON au.id = auth.uid()
WHERE ba.email ILIKE '%01agustin92%'
ORDER BY ba.created_at DESC;

-- 9. Check actual table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_applications'
ORDER BY ordinal_position;

