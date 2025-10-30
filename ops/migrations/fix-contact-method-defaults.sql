-- Fix contact method defaults for existing providers
-- This script should be run after the add-contact-method-toggles.sql script

-- Set all contact methods to FALSE by default for existing records
-- This ensures that contact methods are opt-in, not opt-out
UPDATE public.providers 
SET 
  enable_call_contact = FALSE,
  enable_email_contact = FALSE
WHERE enable_call_contact IS NULL OR enable_email_contact IS NULL;

-- Keep calendar booking as FALSE by default (already correct)
UPDATE public.providers 
SET 
  enable_calendar_booking = FALSE
WHERE enable_calendar_booking IS NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN public.providers.enable_call_contact IS 'Whether to show call/phone contact option to customers - defaults to FALSE (opt-in)';
COMMENT ON COLUMN public.providers.enable_email_contact IS 'Whether to show email contact option to customers - defaults to FALSE (opt-in)';
