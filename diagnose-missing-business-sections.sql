-- DIAGNOSE MISSING BUSINESS SECTIONS IN /ACCOUNT PAGE
-- Date: 2025-10-28
-- Issue: Some users don't see their business management section

-- Step 1: Check for businesses with NULL owner_user_id
SELECT 
  'Businesses with NULL owner_user_id' as issue,
  COUNT(*) as count
FROM providers
WHERE owner_user_id IS NULL;

-- Step 2: Check for businesses with email but no owner_user_id
SELECT 
  'Businesses with email but NULL owner_user_id' as issue,
  id,
  name,
  email,
  owner_user_id
FROM providers
WHERE email IS NOT NULL 
  AND email != ''
  AND owner_user_id IS NULL
LIMIT 10;

-- Step 3: Check for mismatches between business email and profile email
SELECT 
  'Email mismatches' as issue,
  p.id as provider_id,
  p.name as business_name,
  p.email as business_email,
  p.owner_user_id,
  prof.email as profile_email
FROM providers p
LEFT JOIN profiles prof ON p.owner_user_id = prof.id
WHERE p.email IS NOT NULL 
  AND p.email != ''
  AND p.email != prof.email
LIMIT 10;

-- Step 4: Check profiles that should have businesses but owner_user_id doesn't match
SELECT 
  'Potential orphaned businesses' as issue,
  prof.id as user_id,
  prof.email as user_email,
  prof.name as user_name,
  p.id as provider_id,
  p.name as business_name,
  p.owner_user_id as current_owner
FROM profiles prof
JOIN providers p ON LOWER(TRIM(p.email)) = LOWER(TRIM(prof.email))
WHERE p.owner_user_id IS NULL 
   OR p.owner_user_id != prof.id
LIMIT 20;

-- Step 5: Count total affected users
SELECT 
  'Total users affected' as issue,
  COUNT(DISTINCT prof.id) as user_count
FROM profiles prof
WHERE EXISTS (
  SELECT 1 
  FROM providers p 
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(prof.email))
    AND (p.owner_user_id IS NULL OR p.owner_user_id != prof.id)
);

