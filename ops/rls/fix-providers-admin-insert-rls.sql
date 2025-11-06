-- Fix RLS policies for providers INSERT to allow admin to create providers
-- This fixes "Failed to create provider: new row violates row-level security policy for table 'providers'"
-- when admin approves a business application
--
-- Problem:
-- The current INSERT policy requires owner_user_id = auth.uid(), which means only users can create
-- providers for themselves. But when an admin approves a business application, they need to create
-- a provider on behalf of someone else (or with null owner_user_id if the applicant doesn't have an account).
--
-- Solution:
-- Add an admin INSERT policy that allows admins to create providers for anyone, similar to how
-- there's already an admin UPDATE and DELETE policy.
--
-- Date: 2025-01-XX

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Drop existing admin INSERT policy if it exists (might have different name)
DROP POLICY IF EXISTS "providers_insert_admin" ON public.providers;
DROP POLICY IF EXISTS "Admin full INSERT on providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON public.providers;
DROP POLICY IF EXISTS "providers_admin_insert" ON public.providers;

-- Create admin INSERT policy
-- This allows admins to create providers for anyone (or with null owner_user_id)
CREATE POLICY "providers_insert_admin" 
ON public.providers FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'providers'
  AND cmd = 'INSERT'
ORDER BY policyname;

COMMIT;

-- Expected Result:
-- Two INSERT policies:
-- 1. "providers_insert_auth" - Allows authenticated users to create providers for themselves (owner_user_id = auth.uid())
-- 2. "providers_insert_admin" - Allows admins to create providers for anyone (is_admin_user(auth.uid()))

