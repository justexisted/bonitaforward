-- Add user preference columns to profiles table
-- These columns track important user actions and choices

-- Add event_terms_accepted_at column
-- Tracks when user accepted terms to create events (legal compliance)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS event_terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add user_plan_choice column
-- Tracks if user chose free plan or is pending featured plan approval
-- Values: NULL (not chosen), 'free', 'featured', 'featured-pending'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_plan_choice TEXT DEFAULT NULL;

-- Add constraint to ensure valid plan choices
ALTER TABLE profiles
ADD CONSTRAINT check_user_plan_choice 
CHECK (user_plan_choice IN ('free', 'featured', 'featured-pending'));

-- Add index for faster queries on plan choice
CREATE INDEX IF NOT EXISTS idx_profiles_user_plan_choice ON profiles(user_plan_choice);

-- Add comments
COMMENT ON COLUMN profiles.event_terms_accepted_at IS 'Timestamp when user accepted terms to create calendar events. NULL means not yet accepted.';
COMMENT ON COLUMN profiles.user_plan_choice IS 'User''s subscription plan choice: free, featured, or featured-pending. NULL means no choice made yet.';

