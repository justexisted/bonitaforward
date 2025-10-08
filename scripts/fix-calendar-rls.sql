-- Fix RLS policies for calendar_events to work with actual admin implementation
-- The app uses is_admin flag or email-based checking, not role='admin'

-- Drop old policies
DROP POLICY IF EXISTS "Only admins can insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can delete calendar events" ON calendar_events;

-- Create new policies that check is_admin flag
-- This aligns with the actual admin verification used in the app
CREATE POLICY "Only admins can insert calendar events" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update calendar events" ON calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete calendar events" ON calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Ensure the is_admin column exists (safe if it already does)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Set is_admin for the admin email (update with your actual admin email)
-- You can also do this manually in Supabase dashboard
-- UPDATE profiles SET is_admin = true WHERE email = 'your-admin@email.com';

-- IMPORTANT: After running this, go to Supabase and run:
-- UPDATE profiles SET is_admin = true WHERE email = 'justexisted@gmail.com';
-- (or whatever your admin email is)

