-- ============================================================================
-- ADD METADATA COLUMN TO user_notifications TABLE
-- ============================================================================
-- This migration adds the metadata column if it doesn't exist.
-- The metadata column stores additional information about notifications
-- such as request IDs, rejection reasons, and other contextual data.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add metadata column if it doesn't exist
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.user_notifications.metadata IS 
  'Additional JSON data about the notification (request ID, reason, business details, etc.)';

-- Create index for faster metadata queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_user_notifications_metadata 
  ON public.user_notifications USING gin(metadata);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
  AND column_name = 'metadata';

-- Test query: Show recent notifications with metadata
SELECT 
  id,
  user_id,
  type,
  title,
  created_at,
  metadata
FROM public.user_notifications
ORDER BY created_at DESC
LIMIT 5;

COMMENT ON COLUMN public.user_notifications.metadata IS 
  'Stores additional data: { reqId, reason, businessName, etc. }';

