-- Diagnose booking RLS issue
-- Run this in Supabase SQL Editor to identify the problem

-- 1. Check if RLS is enabled on providers table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasoids
FROM pg_tables 
WHERE tablename = 'providers';

-- 2. Check all existing RLS policies on providers table
SELECT 
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'providers'
ORDER BY policyname;

-- 3. Check current user context (run this while logged in as a business owner)
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email,
  auth.role() as current_user_role;

-- 4. Check if the business owner's provider has proper ownership
-- Replace 'your-provider-id' with the actual provider ID that's failing
-- Replace 'user-email@example.com' with the actual user email
SELECT 
  p.id,
  p.name,
  p.email as provider_email,
  p.owner_user_id,
  p.enable_calendar_booking,
  p.booking_enabled,
  u.email as owner_email,
  u.id as owner_id,
  CASE 
    WHEN p.owner_user_id = auth.uid() THEN 'Direct ownership via owner_user_id'
    WHEN p.email = auth.email() THEN 'Ownership via email match'
    WHEN p.owner_user_id IS NULL AND p.email IS NULL THEN 'No ownership info'
    ELSE 'Other ownership scenario'
  END as ownership_status
FROM providers p
LEFT JOIN auth.users u ON u.id = p.owner_user_id
WHERE p.email = auth.email()  -- This will show the current user's provider
   OR p.owner_user_id = auth.uid()  -- Or their owned provider
ORDER BY p.created_at DESC;

-- 5. Test if the user can SELECT their own provider (basic RLS test)
SELECT 
  id,
  name,
  email,
  owner_user_id,
  enable_calendar_booking,
  booking_enabled
FROM providers 
WHERE owner_user_id = auth.uid() 
   OR email = auth.email();

-- 6. Check if there are any triggers or other constraints
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'providers';

-- 7. Check column permissions
SELECT 
  table_name,
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns 
WHERE table_name = 'providers' 
  AND column_name IN ('enable_calendar_booking', 'booking_enabled', 'owner_user_id', 'email')
ORDER BY ordinal_position;

-- 8. Test a simple UPDATE to see the exact error
-- Uncomment and run this to test (replace with actual provider ID):
/*
UPDATE providers 
SET enable_calendar_booking = true 
WHERE id = 'your-provider-id-here' 
  AND (owner_user_id = auth.uid() OR email = auth.email());
*/

-- 9. Check if there are any foreign key constraints that might be causing issues
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'providers';

-- 10. Check if the providers table has any custom validation rules
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'providers'::regclass;
