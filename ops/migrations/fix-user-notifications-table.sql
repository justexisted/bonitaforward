-- Fix user_notifications table by adding missing columns
-- This script adds any missing columns to the existing user_notifications table

-- Add missing columns if they don't exist
ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS booking_id UUID,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Notification',
ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have default values for required fields
UPDATE public.user_notifications 
SET 
  type = 'general',
  title = 'Notification',
  message = 'Notification message'
WHERE type IS NULL OR title IS NULL OR message IS NULL;

-- Make sure required columns are NOT NULL
ALTER TABLE public.user_notifications
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN message SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_email ON public.user_notifications(email);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at);

-- Add comments for clarity
COMMENT ON COLUMN public.user_notifications.email IS 'Email address for notifications when user_id is not available';
COMMENT ON COLUMN public.user_notifications.type IS 'Type of notification: booking_received, booking_updated, etc.';
COMMENT ON COLUMN public.user_notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN public.user_notifications.booking_id IS 'Reference to the booking that triggered this notification';
