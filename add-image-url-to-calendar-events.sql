-- Add image_url and image_type columns to calendar_events table
-- This allows us to store event header images permanently in the database

-- Add columns if they don't exist
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_type TEXT CHECK (image_type IN ('image', 'gradient'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_image_url ON calendar_events(image_url);

-- Add comment explaining the columns
COMMENT ON COLUMN calendar_events.image_url IS 'URL to header image (Unsplash) or CSS gradient string';
COMMENT ON COLUMN calendar_events.image_type IS 'Type of image: "image" for Unsplash URLs, "gradient" for CSS gradients';

