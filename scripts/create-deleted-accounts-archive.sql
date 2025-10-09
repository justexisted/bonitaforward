-- Table to archive deleted business account data
-- Run this in Supabase SQL Editor to create the archive table

CREATE TABLE IF NOT EXISTS deleted_business_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deleted_at timestamptz DEFAULT now(),
  deleted_by_admin_id uuid,
  deleted_by_admin_email text,
  
  -- Original account data
  original_user_id uuid NOT NULL,
  original_email text NOT NULL,
  original_name text,
  original_role text,
  
  -- Business/Provider data (JSONB for flexibility)
  provider_data jsonb, -- Full provider row(s) from providers table
  change_requests jsonb, -- Any pending change requests
  job_posts jsonb, -- Job posts linked to provider
  profile_data jsonb, -- Profile info from profiles table
  
  -- Metadata
  deletion_reason text,
  ip_address text
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_business_accounts(original_email);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_user_id ON deleted_business_accounts(original_user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at ON deleted_business_accounts(deleted_at DESC);

-- Add RLS policies
ALTER TABLE deleted_business_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Only admins can view deleted accounts" ON deleted_business_accounts;

-- Only admins can view archived deleted accounts
CREATE POLICY "Only admins can view deleted accounts"
  ON deleted_business_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can insert into archive (when deleting accounts)
CREATE POLICY "Only admins can archive deleted accounts"
  ON deleted_business_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE deleted_business_accounts IS 'Archive of deleted business accounts including all associated data for audit and recovery purposes. Only accessible by admins.';

