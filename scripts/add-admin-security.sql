-- Add admin security features to the database
-- Run this in your Supabase SQL editor

-- 1. Add is_admin column to profiles table (if it doesn't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for better performance on audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp ON admin_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- 4. Enable RLS on admin_audit_log table
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy for admin_audit_log (only admins can read/write)
CREATE POLICY "Admin audit log access" ON admin_audit_log
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = TRUE
  )
);

-- 6. Update existing admin user(s) based on ADMIN_EMAILS environment variable
-- You'll need to manually run this for your specific admin email(s)
-- Example: UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';

-- 7. Create function to safely promote users to admin (optional)
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET is_admin = TRUE 
  WHERE email = user_email;
  
  IF FOUND THEN
    INSERT INTO admin_audit_log (admin_user_id, admin_email, action, details)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'promote_to_admin',
      jsonb_build_object('promoted_email', user_email)
    );
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- 8. Grant necessary permissions
GRANT SELECT, INSERT ON admin_audit_log TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Notes:
-- - After running this script, update your admin user(s) manually:
--   UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';
-- 
-- - The system supports both email-based admin (current) and database-based admin (new)
-- - Gradually transition from VITE_ADMIN_EMAILS to database-based admin flags
-- - All admin actions are now logged for security auditing
