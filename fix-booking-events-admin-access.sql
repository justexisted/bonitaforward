-- Fix booking_events RLS to allow admin access
-- Run this in Supabase SQL Editor

-- Add admin policy for booking_events
-- This allows admin users to view all booking events in the admin panel

-- First, ensure the is_admin_user() function exists (from fix-booking-rls-policies.sql)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is in the admin emails list
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com',  -- Your admin email
    'your-admin@example.com'  -- Add more as needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.booking_events;

-- Create admin policy for viewing all booking events
CREATE POLICY "Admins can view all bookings" 
ON public.booking_events
FOR SELECT
USING (is_admin_user());

-- Also allow admins to update booking status
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.booking_events;

CREATE POLICY "Admins can update all bookings"
ON public.booking_events
FOR UPDATE
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Verify the policies
-- SELECT * FROM pg_policies WHERE tablename = 'booking_events';

-- After running this, your admin panel should be able to fetch booking events without permission errors

