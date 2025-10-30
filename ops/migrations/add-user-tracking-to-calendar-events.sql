-- Add user tracking to calendar_events table
-- This allows users to see and manage their own events

-- 1. Add created_by_user_id column to track event creator
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by_user_id 
ON calendar_events(created_by_user_id);

-- 3. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own events" ON calendar_events;
CREATE POLICY "Users can view own events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;
CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND column_name = 'created_by_user_id';

-- Show all policies on calendar_events
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events';
