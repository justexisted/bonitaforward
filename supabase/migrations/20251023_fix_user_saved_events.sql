-- Fix user_saved_events table and policies
-- Safe to run multiple times

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saved events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can save events" ON user_saved_events;
DROP POLICY IF EXISTS "Users can unsave events" ON user_saved_events;

-- Create policies
CREATE POLICY "Users can view their own saved events"
  ON user_saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save events"
  ON user_saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave events"
  ON user_saved_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE user_saved_events ENABLE ROW LEVEL SECURITY;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_saved_events_user_id ON user_saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_events_event_id ON user_saved_events(event_id);

