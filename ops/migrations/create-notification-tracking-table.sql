-- Create table to track dismissed notifications for users
CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected'
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- timestamp of the most recent activity when dismissed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Add RLS policies
ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dismissed notifications
CREATE POLICY "Users can view own dismissed notifications" ON public.dismissed_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own dismissed notifications
CREATE POLICY "Users can insert own dismissed notifications" ON public.dismissed_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own dismissed notifications
CREATE POLICY "Users can update own dismissed notifications" ON public.dismissed_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own dismissed notifications
CREATE POLICY "Users can delete own dismissed notifications" ON public.dismissed_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id ON public.dismissed_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_type ON public.dismissed_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_activity_timestamp ON public.dismissed_notifications(last_activity_timestamp);

-- Add comments for clarity
COMMENT ON TABLE public.dismissed_notifications IS 'Tracks when users dismiss notifications to prevent showing them again until new activity occurs';
COMMENT ON COLUMN public.dismissed_notifications.notification_type IS 'Type of notification: pending, approved, or rejected';
COMMENT ON COLUMN public.dismissed_notifications.last_activity_timestamp IS 'Timestamp of most recent activity when notification was dismissed';
