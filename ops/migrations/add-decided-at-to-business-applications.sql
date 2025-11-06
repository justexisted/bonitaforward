-- Add decided_at column to business_applications table
-- This allows tracking when applications were approved/rejected
-- Similar to provider_change_requests and provider_job_posts tables
--
-- Date: 2025-01-XX

-- Add the column
ALTER TABLE public.business_applications 
ADD COLUMN IF NOT EXISTS decided_at timestamptz;

-- Add comment explaining the column
COMMENT ON COLUMN public.business_applications.decided_at IS 
'Timestamp when the application status was changed to approved or rejected. NULL if still pending.';

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_applications'
  AND column_name = 'decided_at';

