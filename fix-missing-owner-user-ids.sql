-- Fix missing owner_user_id values in providers table
-- This ensures that business owners have proper ownership records for RLS policies
-- Run this in Supabase SQL Editor

-- First, let's see what we're working with
-- Check for providers without owner_user_id but with email
SELECT 
  id, 
  name, 
  email, 
  owner_user_id,
  created_at
FROM providers 
WHERE owner_user_id IS NULL 
  AND email IS NOT NULL
ORDER BY created_at DESC;

-- Update providers to set owner_user_id where it's missing
-- This matches providers with users based on email
UPDATE providers 
SET owner_user_id = (
  SELECT id 
  FROM auth.users 
  WHERE auth.users.email = providers.email
)
WHERE owner_user_id IS NULL 
  AND email IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.email = providers.email
  );

-- Check the results
SELECT 
  id, 
  name, 
  email, 
  owner_user_id,
  created_at
FROM providers 
WHERE email IS NOT NULL
ORDER BY created_at DESC;

-- If you want to see which providers still don't have owner_user_id set:
SELECT 
  id, 
  name, 
  email, 
  owner_user_id
FROM providers 
WHERE owner_user_id IS NULL 
  AND email IS NOT NULL;

-- Note: Providers without email or with emails that don't match any auth.users
-- will need to be manually assigned or the business owner needs to claim them
-- through the business application process
