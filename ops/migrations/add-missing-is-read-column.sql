-- Add the missing is_read column to user_notifications table
-- This is a simple fix for the specific error you're seeing

ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Also ensure other essential columns exist
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Notification',
ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';

-- Make sure the columns have proper constraints
ALTER TABLE public.user_notifications 
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN message SET NOT NULL;

-- Create the index for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
