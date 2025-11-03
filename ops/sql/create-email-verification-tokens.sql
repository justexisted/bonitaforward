-- ============================================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- ============================================================================
-- 
-- Stores verification tokens for custom email verification system.
-- Replaces Supabase's built-in email confirmation with our own system.
-- 
-- Usage:
-- 1. User signs up → token generated and stored here
-- 2. Verification email sent via Resend with token link
-- 3. User clicks link → token verified and email_confirmed_at set in profiles
-- 4. Token expires after 24 hours or after first use
--

-- Create table for email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active token per user
  CONSTRAINT unique_active_token UNIQUE (user_id, token)
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own tokens (read-only)
CREATE POLICY "Users can view their own verification tokens"
  ON email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything (for Netlify functions)
CREATE POLICY "Service role can manage all tokens"
  ON email_verification_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment to table
COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens for custom verification system using Resend';

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW()
     OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days');
END;
$$;

COMMENT ON FUNCTION cleanup_expired_verification_tokens() IS 'Cleans up expired or old used verification tokens';

