-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  time TEXT,
  location TEXT,
  address TEXT,
  category TEXT NOT NULL DEFAULT 'Community',
  source TEXT NOT NULL DEFAULT 'Local',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_votes table for user voting
CREATE TABLE IF NOT EXISTS event_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_event_votes_event_id ON event_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_votes_user_id ON event_votes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_events (public read, admin write)
CREATE POLICY "Calendar events are viewable by everyone" ON calendar_events
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert calendar events" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update calendar events" ON calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete calendar events" ON calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create RLS policies for event_votes (authenticated users can vote)
CREATE POLICY "Users can view all event votes" ON event_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on events" ON event_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON event_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON event_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update vote counts when votes are added/updated/deleted
CREATE OR REPLACE FUNCTION update_event_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment vote count
    UPDATE calendar_events 
    SET upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE 0 END,
        downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' THEN 1 ELSE 0 END
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update vote count (remove old vote, add new vote)
    UPDATE calendar_events 
    SET upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END,
        downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' THEN 1 ELSE -1 END
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement vote count
    UPDATE calendar_events 
    SET upvotes = upvotes - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE 0 END,
        downvotes = downvotes - CASE WHEN OLD.vote_type = 'down' THEN 1 ELSE 0 END
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update vote counts
CREATE TRIGGER update_vote_counts_on_insert
  AFTER INSERT ON event_votes
  FOR EACH ROW EXECUTE FUNCTION update_event_vote_counts();

CREATE TRIGGER update_vote_counts_on_update
  AFTER UPDATE ON event_votes
  FOR EACH ROW EXECUTE FUNCTION update_event_vote_counts();

CREATE TRIGGER update_vote_counts_on_delete
  AFTER DELETE ON event_votes
  FOR EACH ROW EXECUTE FUNCTION update_event_vote_counts();
