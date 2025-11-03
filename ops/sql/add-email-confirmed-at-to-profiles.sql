-- ============================================================================
-- ADD EMAIL_CONFIRMED_AT COLUMN TO PROFILES TABLE
-- ============================================================================
-- 
-- Adds email_confirmed_at column to profiles table for custom email verification.
-- This replaces Supabase's built-in email confirmation system.
-- 
-- The column stores when the email was verified via our custom verification system.
--

-- Add email_confirmed_at column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed_at ON profiles(email_confirmed_at);

-- Add comment to column
COMMENT ON COLUMN profiles.email_confirmed_at IS 'Timestamp when email was verified via custom verification system (Resend)';

