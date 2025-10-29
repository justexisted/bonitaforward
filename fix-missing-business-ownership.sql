-- FIX MISSING BUSINESS OWNERSHIP LINKS
-- Date: 2025-10-28
-- Issue: Users can't see their businesses because owner_user_id is NULL or mismatched
-- Solution: Link businesses to users by matching email addresses

-- IMPORTANT: Run diagnose-missing-business-sections.sql first to see what will be affected

-- Step 1: Update providers where owner_user_id is NULL but email matches a profile
UPDATE providers
SET 
  owner_user_id = profiles.id,
  updated_at = NOW()
FROM profiles
WHERE providers.email IS NOT NULL
  AND providers.email != ''
  AND LOWER(TRIM(providers.email)) = LOWER(TRIM(profiles.email))
  AND providers.owner_user_id IS NULL;

-- Step 2: Fix mismatched owner_user_id (where email matches but owner_user_id is wrong)
UPDATE providers
SET 
  owner_user_id = profiles.id,
  updated_at = NOW()
FROM profiles
WHERE providers.email IS NOT NULL
  AND providers.email != ''
  AND LOWER(TRIM(providers.email)) = LOWER(TRIM(profiles.email))
  AND providers.owner_user_id IS NOT NULL
  AND providers.owner_user_id != profiles.id;

-- Step 3: Verify the fixes
SELECT 
  'After fix - businesses now linked' as status,
  COUNT(*) as count
FROM providers
WHERE owner_user_id IS NOT NULL;

-- Step 4: Check remaining orphaned businesses (email doesn't match any profile)
SELECT 
  'Orphaned businesses (no matching profile)' as status,
  COUNT(*) as count,
  ARRAY_AGG(name) FILTER (WHERE name IS NOT NULL) as business_names
FROM providers
WHERE owner_user_id IS NULL
  AND email IS NOT NULL
  AND email != '';

-- Step 5: Show sample of fixed businesses
SELECT 
  p.name as business_name,
  p.email as business_email,
  prof.name as owner_name,
  prof.email as owner_email,
  p.owner_user_id
FROM providers p
JOIN profiles prof ON p.owner_user_id = prof.id
WHERE p.updated_at > NOW() - INTERVAL '5 minutes'
LIMIT 10;

