-- Create user_notifications table for booking notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- For notifications without user_id (email-based)
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  booking_id UUID, -- Reference to booking_events table if it exists
  type VARCHAR(50) NOT NULL, -- 'booking_received', 'booking_updated', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (email IS NOT NULL AND email = auth.jwt() ->> 'email')
  );

-- Users can insert notifications for themselves
CREATE POLICY "Users can insert own notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (email IS NOT NULL AND email = auth.jwt() ->> 'email')
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (email IS NOT NULL AND email = auth.jwt() ->> 'email')
  );

-- Service role can insert any notification (for system notifications)
CREATE POLICY "Service role can insert notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_email ON public.user_notifications(email);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at);

-- Add comments for clarity
COMMENT ON TABLE public.user_notifications IS 'Stores notifications for users about bookings and other events';
COMMENT ON COLUMN public.user_notifications.type IS 'Type of notification: booking_received, booking_updated, etc.';
COMMENT ON COLUMN public.user_notifications.email IS 'Email address for notifications when user_id is not available';
COMMENT ON COLUMN public.user_notifications.booking_id IS 'Reference to the booking that triggered this notification';
