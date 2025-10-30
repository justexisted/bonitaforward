-- Fix user deletion from Supabase Dashboard by adding CASCADE to foreign keys
-- Run this in Supabase SQL Editor to allow dashboard deletions

-- This allows deleting users from the Supabase Dashboard Authentication section
-- by automatically cascading deletes to related tables

BEGIN;

-- 1. Drop existing foreign key constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.providers DROP CONSTRAINT IF EXISTS providers_owner_user_id_fkey;
ALTER TABLE public.provider_change_requests DROP CONSTRAINT IF EXISTS provider_change_requests_owner_user_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_fk;
ALTER TABLE public.coupon_redemptions DROP CONSTRAINT IF EXISTS coupon_redemptions_user_id_fkey;
ALTER TABLE public.saved_providers DROP CONSTRAINT IF EXISTS saved_providers_user_id_fkey;
ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_user_id_fkey;
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_target_user_id_fkey;

-- 2. Re-add foreign key constraints WITH CASCADE DELETE
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.providers 
  ADD CONSTRAINT providers_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.provider_change_requests 
  ADD CONSTRAINT provider_change_requests_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_user_fk 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.coupon_redemptions 
  ADD CONSTRAINT coupon_redemptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.saved_providers 
  ADD CONSTRAINT saved_providers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_notifications 
  ADD CONSTRAINT user_notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_audit_log 
  ADD CONSTRAINT admin_audit_log_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.admin_audit_log 
  ADD CONSTRAINT admin_audit_log_target_user_id_fkey 
  FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;

-- After running this, you can delete users from Supabase Dashboard
-- and all related data will be automatically cleaned up

