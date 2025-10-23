-- Create user_saved_events table
-- This table stores events that users have saved for later reference

CREATE TABLE IF NOT EXISTS user_saved_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_saved_events_user_id ON user_saved_events(user_id);

-- Create index for faster lookups by event_id
CREATE INDEX IF NOT EXISTS idx_user_saved_events_event_id ON user_saved_events(event_id);

-- Enable Row Level Security
ALTER TABLE user_saved_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved events
CREATE POLICY "Users can view their own saved events"
  ON user_saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved events
CREATE POLICY "Users can save events"
  ON user_saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved events
CREATE POLICY "Users can unsave events"
  ON user_saved_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE user_saved_events IS 'Stores events that users have saved for later reference. Migrated from localStorage to provide cross-device synchronization.';

