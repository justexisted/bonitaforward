-- Add booking notification fields to user_notifications table

-- Add new columns to support booking notifications
ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.booking_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- Add index for better performance on booking notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_booking_id ON public.user_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);

-- Update existing notifications to have type 'general' if null
UPDATE public.user_notifications 
SET type = 'general' 
WHERE type IS NULL;

-- Make type column NOT NULL after setting defaults
ALTER TABLE public.user_notifications 
ALTER COLUMN type SET NOT NULL;
