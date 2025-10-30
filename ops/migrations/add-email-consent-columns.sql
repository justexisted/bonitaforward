-- ADD EMAIL CONSENT & PREFERENCE COLUMNS TO PROFILES
-- Date: 2025-10-28
-- Purpose: Add email consent tracking and unsubscribe functionality

-- Add email notification preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_unsubscribe_date TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Transactional emails (account updates, business notifications). Required for platform use.';
COMMENT ON COLUMN profiles.marketing_emails_enabled IS 'Marketing emails (newsletters, promotions). Optional, requires explicit consent.';
COMMENT ON COLUMN profiles.email_consent_date IS 'Timestamp when user consented to receive emails';
COMMENT ON COLUMN profiles.email_unsubscribe_date IS 'Timestamp when user unsubscribed from emails';

-- Set consent date for existing users who haven't unsubscribed
UPDATE profiles 
SET email_consent_date = created_at 
WHERE email_consent_date IS NULL 
  AND created_at IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications 
ON profiles(email_notifications_enabled);

-- Verify the changes
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name LIKE '%email%'
ORDER BY ordinal_position;

