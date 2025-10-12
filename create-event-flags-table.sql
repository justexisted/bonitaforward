-- ============================================
-- Event Flags Table Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the event_flags table
CREATE TABLE IF NOT EXISTS event_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_flags_event_id ON event_flags(event_id);
CREATE INDEX IF NOT EXISTS idx_event_flags_user_id ON event_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_event_flags_created_at ON event_flags(created_at DESC);

-- 3. Create unique constraint to prevent duplicate flags from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_flags_unique_user_event 
  ON event_flags(event_id, user_id);

-- 4. Enable Row Level Security
ALTER TABLE event_flags ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Users can insert their own flags
DROP POLICY IF EXISTS "Users can create event flags" ON event_flags;
CREATE POLICY "Users can create event flags"
  ON event_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. RLS Policy: Users can view their own flags
DROP POLICY IF EXISTS "Users can view own flags" ON event_flags;
CREATE POLICY "Users can view own flags"
  ON event_flags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. RLS Policy: Admins can view all flags
DROP POLICY IF EXISTS "Admins can view all flags" ON event_flags;
CREATE POLICY "Admins can view all flags"
  ON event_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 8. RLS Policy: Admins can delete flags
DROP POLICY IF EXISTS "Admins can delete flags" ON event_flags;
CREATE POLICY "Admins can delete flags"
  ON event_flags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 9. Verify the setup
SELECT 'event_flags table created successfully!' as message;
SELECT count(*) as total_flags FROM event_flags;

