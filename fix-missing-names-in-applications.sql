-- Backfill missing full_name in business_applications
-- This will look up user names from the profiles table and update applications

-- Update business_applications with names from profiles table
UPDATE public.business_applications AS ba
SET full_name = p.name
FROM public.profiles AS p
WHERE ba.email = p.email
  AND (ba.full_name IS NULL OR ba.full_name = '');

-- Verify the update
SELECT 
  id,
  business_name,
  full_name,
  email,
  created_at
FROM public.business_applications
ORDER BY created_at DESC
LIMIT 10;

