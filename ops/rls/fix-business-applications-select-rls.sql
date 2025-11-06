-- Fix RLS policy for business_applications SELECT
-- This fixes users not being able to see their own applications
--
-- Problem: The existing policy uses `(SELECT email FROM auth.users WHERE id = auth.uid())`
-- which may not match exactly due to case sensitivity, whitespace, or NULL values.
--
-- Solution: Use `auth.jwt() ->> 'email'` which is more reliable and matches what the frontend uses.
-- Also add case-insensitive matching with ILIKE to handle email variations.
--
-- Date: 2025-01-XX
-- Version: v1.1
-- Status: ✅ APPLIED - Verified in production
-- Changes in v1.1:
--   - Removed auth.users fallback from owner policy (uses JWT email only)
--   - This avoids "permission denied for table users" errors
-- Dependencies: None (standalone fix)
-- Breaking Changes: None (replaces existing policy)

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "applications_select_owner" ON public.business_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Authenticated can select business applications" ON public.business_applications;

-- Users can view their own applications (using JWT email for reliability)
-- Use TRIM and LOWER for case-insensitive matching to handle email variations
-- NOTE: Removed auth.users fallback to avoid "permission denied" errors
CREATE POLICY "applications_select_owner" 
ON public.business_applications FOR SELECT
USING (
  LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
);

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

