-- ============================================================================
-- VERIFY RESIDENT VERIFICATION DATA
-- Date: 2025-01-XX
-- Purpose: Check if any profiles have resident verification data saved
-- ============================================================================

-- Check for profiles with resident verification data
SELECT 
  id,
  email,
  name,
  is_bonita_resident,
  resident_verification_method,
  resident_zip_code,
  resident_verified_at,
  created_at
FROM profiles
WHERE is_bonita_resident = true 
   OR resident_verification_method IS NOT NULL
   OR resident_zip_code IS NOT NULL
ORDER BY created_at DESC;

-- Count statistics
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_bonita_resident = true THEN 1 END) as verified_residents,
  COUNT(CASE WHEN resident_verification_method IS NOT NULL THEN 1 END) as with_verification_method,
  COUNT(CASE WHEN resident_zip_code IS NOT NULL THEN 1 END) as with_zip_code
FROM profiles;

