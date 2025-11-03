-- Check Thai Restaurant ownership and connection to user
-- Run this to diagnose the MyBusiness page issue

-- Find Thai Restaurant
SELECT 
  id,
  name,
  email,
  owner_user_id,
  created_at,
  updated_at
FROM providers
WHERE name ILIKE '%Thai Restaurant%'
  OR email = 'justexisted@gmail.com'
ORDER BY created_at DESC;

-- Check if user exists and has business role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role_from_metadata,
  email_confirmed_at
FROM auth.users
WHERE email = 'justexisted@gmail.com';

-- Check profiles table for role
SELECT 
  id,
  email,
  role,
  name
FROM profiles
WHERE email = 'justexisted@gmail.com';

-- Find all providers with this email
SELECT 
  id,
  name,
  email,
  owner_user_id,
  CASE 
    WHEN owner_user_id IS NULL THEN 'NOT LINKED'
    ELSE 'LINKED'
  END as link_status
FROM providers
WHERE email = 'justexisted@gmail.com'
ORDER BY created_at DESC;

