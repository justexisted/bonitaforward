-- ============================================================================
-- Find and Analyze Duplicate Business Names
-- Date: 2025-10-19
-- Purpose: Identify duplicate providers created from the approval bug
-- ============================================================================

-- STEP 1: Find all duplicate business names
-- This shows groups of businesses with the same name (case-insensitive)
SELECT 
  LOWER(TRIM(name)) as normalized_name,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ' ORDER BY created_at) as provider_ids,
  STRING_AGG(name, ' | ' ORDER BY created_at) as name_variations,
  STRING_AGG(
    CONCAT(
      'ID: ', id::text, 
      ' | Created: ', TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI'), 
      ' | Email: ', COALESCE(email, 'none'),
      ' | Published: ', COALESCE(published::text, 'null')
    ), 
    E'\n      ' 
    ORDER BY created_at
  ) as details
FROM providers
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, LOWER(TRIM(name));

-- STEP 2: Get detailed info for each duplicate group
-- Uncomment and replace 'business-name-here' with an actual duplicate name
/*
SELECT 
  id,
  name,
  email,
  phone,
  created_at,
  updated_at,
  published,
  is_member,
  is_featured,
  booking_enabled,
  COALESCE(ARRAY_LENGTH(images, 1), 0) as image_count,
  COALESCE(ARRAY_LENGTH(tags, 1), 0) as tag_count,
  COALESCE(ARRAY_LENGTH(specialties, 1), 0) as specialty_count,
  owner_user_id
FROM providers
WHERE LOWER(TRIM(name)) = LOWER('business-name-here')
ORDER BY created_at;
*/

-- STEP 3: Check if duplicates have different data
-- This helps determine if they're truly duplicates or legitimate separate businesses
/*
WITH duplicate_group AS (
  SELECT * FROM providers 
  WHERE LOWER(TRIM(name)) = LOWER('business-name-here')
  ORDER BY created_at
)
SELECT 
  'Phone Numbers' as field,
  STRING_AGG(DISTINCT COALESCE(phone, 'NULL'), ', ') as values,
  COUNT(DISTINCT phone) as unique_count
FROM duplicate_group
UNION ALL
SELECT 
  'Email Addresses',
  STRING_AGG(DISTINCT COALESCE(email, 'NULL'), ', '),
  COUNT(DISTINCT email)
FROM duplicate_group
UNION ALL
SELECT 
  'Addresses',
  STRING_AGG(DISTINCT COALESCE(address, 'NULL'), ', '),
  COUNT(DISTINCT address)
FROM duplicate_group
UNION ALL
SELECT 
  'Owner IDs',
  STRING_AGG(DISTINCT COALESCE(owner_user_id::text, 'NULL'), ', '),
  COUNT(DISTINCT owner_user_id)
FROM duplicate_group;
*/

-- STEP 4: Find the "best" record to keep
-- Usually the one with the most complete data
/*
WITH duplicate_group AS (
  SELECT 
    *,
    -- Score based on completeness
    (CASE WHEN description IS NOT NULL AND description != '' THEN 10 ELSE 0 END) +
    (CASE WHEN phone IS NOT NULL AND phone != '' THEN 5 ELSE 0 END) +
    (CASE WHEN email IS NOT NULL AND email != '' THEN 5 ELSE 0 END) +
    (CASE WHEN website IS NOT NULL AND website != '' THEN 5 ELSE 0 END) +
    (CASE WHEN address IS NOT NULL AND address != '' THEN 5 ELSE 0 END) +
    (COALESCE(ARRAY_LENGTH(images, 1), 0) * 3) +
    (COALESCE(ARRAY_LENGTH(tags, 1), 0) * 2) +
    (COALESCE(ARRAY_LENGTH(specialties, 1), 0) * 2) +
    (CASE WHEN business_hours IS NOT NULL THEN 5 ELSE 0 END) +
    (CASE WHEN is_member = true THEN 20 ELSE 0 END) +
    (CASE WHEN published = true THEN 10 ELSE 0 END)
    as completeness_score
  FROM providers 
  WHERE LOWER(TRIM(name)) = LOWER('business-name-here')
)
SELECT 
  id,
  name,
  created_at,
  completeness_score,
  CASE 
    WHEN completeness_score = MAX(completeness_score) OVER () THEN '✅ KEEP THIS ONE'
    ELSE '❌ DELETE THIS ONE'
  END as recommendation,
  -- Details for review
  CONCAT(
    'Images: ', COALESCE(ARRAY_LENGTH(images, 1), 0),
    ' | Tags: ', COALESCE(ARRAY_LENGTH(tags, 1), 0),
    ' | Member: ', COALESCE(is_member::text, 'false'),
    ' | Published: ', COALESCE(published::text, 'false'),
    ' | Has Description: ', CASE WHEN description IS NOT NULL AND description != '' THEN 'Yes' ELSE 'No' END
  ) as details
FROM duplicate_group
ORDER BY completeness_score DESC, created_at ASC;
*/

-- STEP 5: Before deleting, check for foreign key references
-- This shows if the duplicate provider is referenced by other tables
/*
SELECT 
  'booking_events' as table_name,
  COUNT(*) as reference_count
FROM booking_events
WHERE provider_id = 'provider-id-to-delete'
UNION ALL
SELECT 
  'provider_change_requests',
  COUNT(*)
FROM provider_change_requests
WHERE provider_id = 'provider-id-to-delete'
UNION ALL
SELECT 
  'provider_job_posts',
  COUNT(*)
FROM provider_job_posts
WHERE provider_id = 'provider-id-to-delete';
*/

-- STEP 6: Delete the duplicate (AFTER CONFIRMING IT'S SAFE)
-- ⚠️ DANGER: This permanently deletes data. Double-check the ID!
/*
DELETE FROM providers 
WHERE id = 'provider-id-to-delete';
*/

-- STEP 7: (Optional) Add unique constraint to prevent future duplicates
-- ⚠️ WARNING: This prevents ANY exact name matches (case-insensitive)
-- Only run this if you're sure you won't have legitimate businesses with the same name
/*
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_name_unique 
ON providers (LOWER(TRIM(name)));
*/

-- ============================================================================
-- HOW TO USE THIS SCRIPT
-- ============================================================================
-- 1. Run STEP 1 to see all duplicates
-- 2. For each duplicate group, uncomment STEP 2-3 and replace the name
-- 3. Use STEP 4 to see which record has the most complete data
-- 4. Use STEP 5 to check for foreign key references
-- 5. If safe, use STEP 6 to delete the duplicate
-- 6. Optionally use STEP 7 to prevent future duplicates
-- ============================================================================

