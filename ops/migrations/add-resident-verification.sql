-- ============================================================================
-- ADD BONITA RESIDENT VERIFICATION FIELDS
-- ============================================================================
-- 
-- This migration adds fields to the profiles table to support Bonita resident
-- verification via ZIP code and self-declaration (Phase 1).
-- 
-- Phase 1 Fields:
-- - is_bonita_resident: Boolean flag indicating if user is verified as Bonita resident
-- - resident_verification_method: How the user was verified ('self-declared', 'zip-verified', etc.)
-- - resident_zip_code: ZIP code provided by user for verification
-- - resident_verified_at: Timestamp when verification was completed
--
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- Add is_bonita_resident column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_bonita_resident BOOLEAN DEFAULT FALSE;

-- Add resident_verification_method column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS resident_verification_method TEXT;

-- Add resident_zip_code column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS resident_zip_code TEXT;

-- Add resident_verified_at column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS resident_verified_at TIMESTAMPTZ;

-- Create index on is_bonita_resident for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_bonita_resident 
ON profiles(is_bonita_resident) 
WHERE is_bonita_resident = TRUE;

-- Add comment to document the fields
COMMENT ON COLUMN profiles.is_bonita_resident IS 'Indicates if user is verified as a Bonita resident';
COMMENT ON COLUMN profiles.resident_verification_method IS 'Method used to verify residency: self-declared, zip-verified, address-verified, document-verified';
COMMENT ON COLUMN profiles.resident_zip_code IS 'ZIP code provided by user for verification (first 5 digits stored)';
COMMENT ON COLUMN profiles.resident_verified_at IS 'Timestamp when resident verification was completed';

-- ============================================================================
-- VERIFICATION METHOD VALUES
-- ============================================================================
-- 
-- Valid values for resident_verification_method:
-- - 'self-declared': User self-declared they are a Bonita resident
-- - 'zip-verified': Verified via ZIP code validation (91902, 91908, 91909)
-- - 'address-verified': Verified via address validation API (Phase 2)
-- - 'document-verified': Verified via document upload (Phase 3)
-- - 'admin-verified': Manually verified by admin
-- ============================================================================

