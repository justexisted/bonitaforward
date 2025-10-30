-- Create booking_events table to store customer bookings (safe version)
-- This script handles existing policies gracefully

-- Create the table first
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  booking_date TIMESTAMPTZ NOT NULL,
  booking_duration_minutes INTEGER DEFAULT 60,
  booking_notes TEXT,
  google_event_id TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can update their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Service role can insert bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Service role can update bookings" ON public.booking_events;

-- Create policies
CREATE POLICY "Customers can view own bookings" ON public.booking_events
  FOR SELECT USING (
    customer_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Business owners can view their bookings" ON public.booking_events
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their bookings" ON public.booking_events
  FOR UPDATE USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert bookings" ON public.booking_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update bookings" ON public.booking_events
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create indexes (these will be created only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_booking_events_provider_id ON public.booking_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_customer_email ON public.booking_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_date ON public.booking_events(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_events_status ON public.booking_events(status);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON public.booking_events(created_at);

-- Add comments for clarity
COMMENT ON TABLE public.booking_events IS 'Stores customer bookings/appointments made through the platform';
COMMENT ON COLUMN public.booking_events.provider_id IS 'The business/provider that the booking is for';
COMMENT ON COLUMN public.booking_events.customer_email IS 'Email of the customer making the booking';
COMMENT ON COLUMN public.booking_events.booking_date IS 'Date and time of the booking';
COMMENT ON COLUMN public.booking_events.google_event_id IS 'ID of the corresponding event in Google Calendar';
COMMENT ON COLUMN public.booking_events.status IS 'Current status of the booking: confirmed, cancelled, completed, no_show';
