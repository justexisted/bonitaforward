-- Add Google Calendar integration fields to providers table
-- Run this in Supabase SQL Editor

-- Add columns for Google Calendar integration
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_sync_enabled BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups of calendar-enabled providers
CREATE INDEX IF NOT EXISTS idx_providers_google_calendar 
ON providers(google_calendar_connected) 
WHERE google_calendar_connected = TRUE;

-- Comment explaining the fields
COMMENT ON COLUMN providers.google_calendar_connected IS 'Whether the business has connected their Google Calendar';
COMMENT ON COLUMN providers.google_calendar_id IS 'The Google Calendar ID to sync with';
COMMENT ON COLUMN providers.google_access_token IS 'Encrypted Google OAuth access token';
COMMENT ON COLUMN providers.google_refresh_token IS 'Encrypted Google OAuth refresh token';
COMMENT ON COLUMN providers.google_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN providers.google_calendar_sync_enabled IS 'Whether automatic syncing is enabled';

-- Create a table to store booking events (optional - for tracking)
CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  booking_date TIMESTAMPTZ NOT NULL,
  booking_duration_minutes INTEGER DEFAULT 60,
  booking_notes TEXT,
  google_event_id VARCHAR(255), -- ID of the event in Google Calendar
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for provider lookups
CREATE INDEX IF NOT EXISTS idx_booking_events_provider 
ON booking_events(provider_id, booking_date DESC);

-- Add index for Google event ID lookups
CREATE INDEX IF NOT EXISTS idx_booking_events_google 
ON booking_events(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- Enable RLS on booking_events
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view their own bookings
CREATE POLICY "Business owners can view their bookings"
ON booking_events FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM providers WHERE owner_user_id = auth.uid()
  )
);

-- Policy: Authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings"
ON booking_events FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON booking_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create updated_at trigger for booking_events
CREATE OR REPLACE FUNCTION update_booking_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_events_updated_at
BEFORE UPDATE ON booking_events
FOR EACH ROW
EXECUTE FUNCTION update_booking_events_updated_at();

-- Success message
SELECT 'Google Calendar integration schema created successfully!' AS message;


