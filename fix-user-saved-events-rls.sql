-- Fix user_saved_events RLS policies
-- Run this in Supabase SQL Editor

-- First, check if table exists and current policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_saved_events';

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own saved events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can save events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can unsave events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can view their saved events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can insert saved events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can delete saved events" ON user_saved_events;

-- Enable RLS
ALTER TABLE user_saved_events ENABLE ROW LEVEL SECURITY;

-- Create clean, simple policies with admin access
CREATE POLICY "user_saved_events_select_own"
  ON user_saved_events
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "user_saved_events_insert_own"
  ON user_saved_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "user_saved_events_delete_own"
  ON user_saved_events
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Verify policies were created
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_saved_events';

-- Test query (replace with your user ID)
-- SELECT * FROM user_saved_events WHERE user_id = auth.uid();

