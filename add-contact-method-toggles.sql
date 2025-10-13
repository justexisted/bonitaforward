-- Add individual contact method toggles to the 'providers' table
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS enable_calendar_booking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_call_contact BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_email_contact BOOLEAN DEFAULT TRUE;

-- Update existing records to have sensible defaults
-- Most businesses probably want call and email by default, but calendar booking should be opt-in
UPDATE public.providers 
SET 
  enable_calendar_booking = COALESCE(booking_enabled, FALSE),
  enable_call_contact = TRUE,
  enable_email_contact = TRUE
WHERE enable_calendar_booking IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.providers.enable_calendar_booking IS 'Whether to show integrated calendar booking option to customers';
COMMENT ON COLUMN public.providers.enable_call_contact IS 'Whether to show call/phone contact option to customers';
COMMENT ON COLUMN public.providers.enable_email_contact IS 'Whether to show email contact option to customers';
