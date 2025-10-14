-- Add individual contact method toggles to the 'providers' table
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS enable_calendar_booking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_call_contact BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_email_contact BOOLEAN DEFAULT FALSE;

-- Update existing records to have sensible defaults
-- All contact methods should be opt-in (FALSE by default)
UPDATE public.providers 
SET 
  enable_calendar_booking = COALESCE(booking_enabled, FALSE),
  enable_call_contact = COALESCE(enable_call_contact, FALSE),
  enable_email_contact = COALESCE(enable_email_contact, FALSE)
WHERE enable_calendar_booking IS NULL OR enable_call_contact IS NULL OR enable_email_contact IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.providers.enable_calendar_booking IS 'Whether to show integrated calendar booking option to customers';
COMMENT ON COLUMN public.providers.enable_call_contact IS 'Whether to show call/phone contact option to customers';
COMMENT ON COLUMN public.providers.enable_email_contact IS 'Whether to show email contact option to customers';
