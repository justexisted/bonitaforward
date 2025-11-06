-- Fix admin RLS policy for business_applications SELECT
-- This fixes admins not being able to see all applications
--
-- Problem: The is_admin_user() function uses (SELECT email FROM auth.users WHERE id = user_id)
-- which may fail or return NULL, causing the admin policy to fail.
--
-- Solution: Update the admin policy to use JWT email matching, similar to the owner policy.
-- Also ensure the admin_emails table exists and has the correct emails.
--
-- Date: 2025-01-XX
-- Version: v1.2
-- Status: 🔧 FIX NEEDED
-- Changes in v1.2:
--   - Removed auth.users fallback from is_admin_user() function (uses JWT email only)
--   - This avoids "permission denied for table users" errors
-- Changes in v1.1:
--   - Fixed policy to use is_admin_user() function instead of direct auth.users access
--   - Added STABLE to function for better performance
-- Dependencies: 
--   - admin_emails table must exist
--   - is_admin_user() function must exist (will be updated by this script)
-- Breaking Changes: 
--   - Updates is_admin_user() function (affects ALL admin policies)
--   - Updates applications_select_admin policy (affects admin queries)

-- First, ensure admin_emails table exists
-- NOTE: Actual table may only have 'email' column (check schema first)
-- This creates table with id + created_at if it doesn't exist
-- If table already exists with different schema, it won't modify it
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- If table exists but doesn't have id/created_at columns, add them
-- NOTE: If table already has email as PRIMARY KEY, we can't add id as PRIMARY KEY
DO $$
BEGIN
  -- Check if id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_emails' 
    AND column_name = 'id'
  ) THEN
    -- Check if table already has a primary key (likely email)
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'admin_emails' 
      AND constraint_type = 'PRIMARY KEY'
    ) THEN
      -- Table has primary key, add id as regular column (not primary key)
      ALTER TABLE public.admin_emails ADD COLUMN id uuid DEFAULT gen_random_uuid();
    ELSE
      -- No primary key, add id as primary key
      ALTER TABLE public.admin_emails ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_emails' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.admin_emails ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Ensure admin emails are in the table (add your admin email here)
INSERT INTO public.admin_emails (email)
VALUES ('justexisted@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Update is_admin_user function to use JWT email ONLY (more reliable)
-- This function is used by admin policies to check if user is admin
-- NOTE: Using JWT email only - no auth.users access needed (avoids permission errors)
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE LOWER(TRIM(admin_emails.email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop and recreate admin policy with better error handling
DROP POLICY IF EXISTS "applications_select_admin" ON public.business_applications;

-- Admins can view all applications (using JWT email for reliability)
-- NOTE: Use is_admin_user() function instead of direct auth.users access
-- The function has SECURITY DEFINER so it can access auth.users table
CREATE POLICY "applications_select_admin" 
ON public.business_applications FOR SELECT
USING (is_admin_user(auth.uid()));

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'business_applications'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Test admin check (NOTE: This will return nulls in SQL Editor - that's expected)
-- The actual test happens when querying from the frontend (authenticated context)
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'email' as jwt_email,
  is_admin_user(auth.uid()) as is_admin,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as auth_users_email;

-- Verify admin_emails table has correct emails
-- Check table structure first
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_emails'
ORDER BY ordinal_position;

-- List all admin emails (works regardless of table structure)
SELECT email FROM admin_emails ORDER BY email;

-- Check if admin_emails table exists and has data
SELECT 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_emails') as table_exists,
  (SELECT COUNT(*) FROM admin_emails) as admin_count,
  (SELECT string_agg(email, ', ') FROM admin_emails) as admin_emails_list;

