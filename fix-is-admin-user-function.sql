-- Fix is_admin_user() function to properly check admin status
-- Run this in Supabase SQL Editor

-- Drop and recreate the function with proper null handling
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- If no user found, return FALSE
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if email is in admin list
  RETURN user_email IN (
    'justexisted@gmail.com'
    -- Add more admin emails here if needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test it
SELECT is_admin_user() as am_i_admin;

-- Should return TRUE if you're logged in as justexisted@gmail.com
-- If it returns FALSE, check your current email with:
-- SELECT auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid());


