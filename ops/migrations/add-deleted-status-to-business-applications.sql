-- Migration: Add 'deleted' and 'cancelled' status to business_applications.status CHECK constraint
-- Date: 2025-01-XX
-- Purpose: Allow 'deleted' and 'cancelled' status values in business_applications table
-- 
-- This migration updates the CHECK constraint to include 'deleted' and 'cancelled' status values.
-- The constraint currently only allows: 'pending', 'approved', 'rejected'
-- After this migration, it will allow: 'pending', 'approved', 'rejected', 'cancelled', 'deleted'
--
-- NOTE: This migration is safe to run multiple times (idempotent)
-- If the constraint already includes these values, it will be updated to match

-- Step 1: Drop the existing constraint (if it exists)
ALTER TABLE public.business_applications 
DROP CONSTRAINT IF EXISTS business_applications_status_check;

-- Step 2: Add the new constraint with all allowed status values
ALTER TABLE public.business_applications
ADD CONSTRAINT business_applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'deleted'));

-- Verification query (run this to verify the constraint was updated):
-- SELECT 
--   conname AS constraint_name,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.business_applications'::regclass
--   AND conname = 'business_applications_status_check';

