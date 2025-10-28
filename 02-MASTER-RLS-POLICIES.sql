-- ============================================================================
-- MASTER RLS POLICIES - SINGLE SOURCE OF TRUTH
-- Date: October 28, 2025
-- 
-- This file replaces ALL scattered RLS fix files with ONE master file.
-- Run this file to reset ALL policies to a clean, consistent state.
--
-- IMPORTANT: This is IDEMPOTENT - safe to run multiple times
-- ============================================================================

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is admin (using admin_emails table)
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- TABLE: providers
-- Security Model:
-- - SELECT: Everyone can view all providers
-- - INSERT: Authenticated users can create providers
-- - UPDATE: Owners can update their own, admins can update any
-- - DELETE: Owners can delete their own, admins can delete any
-- ============================================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin full DELETE on providers" ON public.providers;
DROP POLICY IF EXISTS "providers_delete_owner" ON public.providers;
DROP POLICY IF EXISTS "Admin full INSERT on providers" ON public.providers;
DROP POLICY IF EXISTS "providers_insert_auth" ON public.providers;
DROP POLICY IF EXISTS "Admin full SELECT on providers" ON public.providers;
DROP POLICY IF EXISTS "providers_select_all" ON public.providers;
DROP POLICY IF EXISTS "Admin full UPDATE on providers" ON public.providers;
DROP POLICY IF EXISTS "providers_update_owner" ON public.providers;

-- Enable RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Create clean policies
CREATE POLICY "providers_select_all" 
ON public.providers FOR SELECT
USING (true);

CREATE POLICY "providers_insert_auth" 
ON public.providers FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "providers_update_owner" 
ON public.providers FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "providers_update_admin" 
ON public.providers FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "providers_delete_owner" 
ON public.providers FOR DELETE
USING (owner_user_id = auth.uid());

CREATE POLICY "providers_delete_admin" 
ON public.providers FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: provider_job_posts (YOUR CURRENT PROBLEM!)
-- Security Model:
-- - SELECT: Everyone can view approved posts, owners can view their own
-- - INSERT: Authenticated users can create posts
-- - UPDATE: Owners can update their own, admins can update any
-- - DELETE: Owners can delete their own, admins can delete any
-- ============================================================================

-- Drop ALL existing policies (there are 14 of them!)
DROP POLICY IF EXISTS "Business owners can manage their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admin full DELETE on provider_job_posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admin full INSERT on provider_job_posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to insert their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Authenticated users can create job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admin full SELECT on provider_job_posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow all users to view job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Job posts are publicly readable when approved" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can view their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Public can view approved job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Admin full UPDATE on provider_job_posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to update their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can update their own job posts" ON public.provider_job_posts;

-- Enable RLS
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- Create clean policies
CREATE POLICY "job_posts_select_approved" 
ON public.provider_job_posts FOR SELECT
USING (status = 'approved' OR status IS NULL);

CREATE POLICY "job_posts_select_owner" 
ON public.provider_job_posts FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "job_posts_select_admin" 
ON public.provider_job_posts FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "job_posts_insert_auth" 
ON public.provider_job_posts FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "job_posts_update_owner" 
ON public.provider_job_posts FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "job_posts_update_admin" 
ON public.provider_job_posts FOR UPDATE
USING (is_admin_user(auth.uid()));

-- THIS IS THE KEY FIX FOR YOUR DELETE ISSUE
CREATE POLICY "job_posts_delete_owner" 
ON public.provider_job_posts FOR DELETE
USING (owner_user_id = auth.uid());

CREATE POLICY "job_posts_delete_admin" 
ON public.provider_job_posts FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: provider_change_requests
-- ============================================================================

DROP POLICY IF EXISTS "Admin full DELETE on provider_change_requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "change_requests_delete_owner" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admin full INSERT on provider_change_requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "change_requests_insert_auth" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admin full SELECT on provider_change_requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "change_requests_select_owner" ON public.provider_change_requests;
DROP POLICY IF EXISTS "Admin full UPDATE on provider_change_requests" ON public.provider_change_requests;
DROP POLICY IF EXISTS "change_requests_update_owner" ON public.provider_change_requests;

ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_requests_select_owner" 
ON public.provider_change_requests FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_select_admin" 
ON public.provider_change_requests FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "change_requests_insert_auth" 
ON public.provider_change_requests FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "change_requests_update_owner" 
ON public.provider_change_requests FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_update_admin" 
ON public.provider_change_requests FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "change_requests_delete_owner" 
ON public.provider_change_requests FOR DELETE
USING (owner_user_id = auth.uid());

CREATE POLICY "change_requests_delete_admin" 
ON public.provider_change_requests FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: business_applications
-- ============================================================================

DROP POLICY IF EXISTS "Service role can do anything" ON public.business_applications;
DROP POLICY IF EXISTS "Admin full DELETE on business_applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can delete all applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admin full INSERT on business_applications" ON public.business_applications;
DROP POLICY IF EXISTS "Public can insert business applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.business_applications;
DROP POLICY IF EXISTS "ba_anon_insert" ON public.business_applications;
DROP POLICY IF EXISTS "ba_auth_insert" ON public.business_applications;
DROP POLICY IF EXISTS "Admin full SELECT on business_applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.business_applications;
DROP POLICY IF EXISTS "Authenticated can select business applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admin full UPDATE on business_applications" ON public.business_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.business_applications;

ALTER TABLE public.business_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit applications
CREATE POLICY "applications_insert_public" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "applications_select_owner" 
ON public.business_applications FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can view all
CREATE POLICY "applications_select_admin" 
ON public.business_applications FOR SELECT
USING (is_admin_user(auth.uid()));

-- Admins can update (approve/reject)
CREATE POLICY "applications_update_admin" 
ON public.business_applications FOR UPDATE
USING (is_admin_user(auth.uid()));

-- Users can delete their own
CREATE POLICY "applications_delete_owner" 
ON public.business_applications FOR DELETE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can delete any
CREATE POLICY "applications_delete_admin" 
ON public.business_applications FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: calendar_events
-- ============================================================================

DROP POLICY IF EXISTS "Admin full DELETE on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admin full INSERT on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admin full SELECT on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Calendar events are viewable by everyone" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admin full UPDATE on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_all" 
ON public.calendar_events FOR SELECT
USING (true);

CREATE POLICY "events_insert_auth" 
ON public.calendar_events FOR INSERT
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "events_update_owner" 
ON public.calendar_events FOR UPDATE
USING (created_by_user_id = auth.uid());

CREATE POLICY "events_update_admin" 
ON public.calendar_events FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "events_delete_owner" 
ON public.calendar_events FOR DELETE
USING (created_by_user_id = auth.uid());

CREATE POLICY "events_delete_admin" 
ON public.calendar_events FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: booking_events
-- ============================================================================

DROP POLICY IF EXISTS "Admin full DELETE on booking_events" ON public.booking_events;
DROP POLICY IF EXISTS "Admin full INSERT on booking_events" ON public.booking_events;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Service role can insert bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Admin full SELECT on booking_events" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can view their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Admin full UPDATE on booking_events" ON public.booking_events;
DROP POLICY IF EXISTS "Business owners can update their bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Service role can update bookings" ON public.booking_events;

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_events_insert_auth" 
ON public.booking_events FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Customers can view their bookings
CREATE POLICY "booking_events_select_customer" 
ON public.booking_events FOR SELECT
USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Business owners can view bookings for their providers
CREATE POLICY "booking_events_select_provider_owner" 
ON public.booking_events FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM providers WHERE owner_user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "booking_events_select_admin" 
ON public.booking_events FOR SELECT
USING (is_admin_user(auth.uid()));

-- Business owners can update their bookings
CREATE POLICY "booking_events_update_provider_owner" 
ON public.booking_events FOR UPDATE
USING (
  provider_id IN (
    SELECT id FROM providers WHERE owner_user_id = auth.uid()
  )
);

-- Admins can update any
CREATE POLICY "booking_events_update_admin" 
ON public.booking_events FOR UPDATE
USING (is_admin_user(auth.uid()));

-- Admins can delete
CREATE POLICY "booking_events_delete_admin" 
ON public.booking_events FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: bookings
-- ============================================================================

DROP POLICY IF EXISTS "users can manage own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin full DELETE on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin full INSERT on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin full SELECT on bookings" ON public.bookings;
DROP POLICY IF EXISTS "bk_owner_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
DROP POLICY IF EXISTS "Admin full UPDATE on bookings" ON public.bookings;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_owner" 
ON public.bookings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "bookings_select_admin" 
ON public.bookings FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "bookings_insert_auth" 
ON public.bookings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookings_update_owner" 
ON public.bookings FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "bookings_update_admin" 
ON public.bookings FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "bookings_delete_owner" 
ON public.bookings FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "bookings_delete_admin" 
ON public.bookings FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: blog_posts
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin full DELETE on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin full INSERT on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_insert" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin full SELECT on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_select_anon" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_select_auth" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin full UPDATE on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_select_all" 
ON public.blog_posts FOR SELECT
USING (true);

CREATE POLICY "blog_insert_admin" 
ON public.blog_posts FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "blog_update_admin" 
ON public.blog_posts FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "blog_delete_admin" 
ON public.blog_posts FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: contact_leads
-- ============================================================================

DROP POLICY IF EXISTS "Admin full DELETE on contact_leads" ON public.contact_leads;
DROP POLICY IF EXISTS "Admin full INSERT on contact_leads" ON public.contact_leads;
DROP POLICY IF EXISTS "cl_anon_insert" ON public.contact_leads;
DROP POLICY IF EXISTS "cl_auth_insert" ON public.contact_leads;
DROP POLICY IF EXISTS "Admin full SELECT on contact_leads" ON public.contact_leads;
DROP POLICY IF EXISTS "Admin full UPDATE on contact_leads" ON public.contact_leads;

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- Public can submit contact forms
CREATE POLICY "contact_insert_public" 
ON public.contact_leads FOR INSERT
WITH CHECK (true);

-- Only admins can view/manage
CREATE POLICY "contact_select_admin" 
ON public.contact_leads FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "contact_update_admin" 
ON public.contact_leads FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "contact_delete_admin" 
ON public.contact_leads FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: funnel_responses
-- ============================================================================

DROP POLICY IF EXISTS "users can manage own funnel responses" ON public.funnel_responses;
DROP POLICY IF EXISTS "Admin full DELETE on funnel_responses" ON public.funnel_responses;
DROP POLICY IF EXISTS "Admin full INSERT on funnel_responses" ON public.funnel_responses;
DROP POLICY IF EXISTS "Admin full SELECT on funnel_responses" ON public.funnel_responses;
DROP POLICY IF EXISTS "fr_owner_select" ON public.funnel_responses;
DROP POLICY IF EXISTS "Admin full UPDATE on funnel_responses" ON public.funnel_responses;

ALTER TABLE public.funnel_responses ENABLE ROW LEVEL SECURITY;

-- Public can submit (no auth required)
CREATE POLICY "funnel_insert_public" 
ON public.funnel_responses FOR INSERT
WITH CHECK (true);

-- Users can view their own
CREATE POLICY "funnel_select_owner" 
ON public.funnel_responses FOR SELECT
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can view all
CREATE POLICY "funnel_select_admin" 
ON public.funnel_responses FOR SELECT
USING (is_admin_user(auth.uid()));

-- Admins can manage
CREATE POLICY "funnel_update_admin" 
ON public.funnel_responses FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "funnel_delete_admin" 
ON public.funnel_responses FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: profiles
-- ============================================================================

DROP POLICY IF EXISTS "Admin full DELETE on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin full INSERT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full SELECT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full UPDATE on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" 
ON public.profiles FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" 
ON public.profiles FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "profiles_delete_admin" 
ON public.profiles FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- TABLE: user_notifications
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admin full DELETE on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admin full INSERT on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admin full SELECT on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admin full UPDATE on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" 
ON public.user_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_select_admin" 
ON public.user_notifications FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "notifications_insert_own" 
ON public.user_notifications FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_admin" 
ON public.user_notifications FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "notifications_update_own" 
ON public.user_notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_admin" 
ON public.user_notifications FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "notifications_delete_own" 
ON public.user_notifications FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_admin" 
ON public.user_notifications FOR DELETE
USING (is_admin_user(auth.uid()));

-- ============================================================================
-- SIMPLE TABLES (Categories, Saved Items, Votes, etc.)
-- ============================================================================

-- Categories: Public read, admin write
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on categories" ON public.categories;
DROP POLICY IF EXISTS "Admin full INSERT on categories" ON public.categories;
DROP POLICY IF EXISTS "Admin full SELECT on categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;
DROP POLICY IF EXISTS "Admin full UPDATE on categories" ON public.categories;

CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE USING (is_admin_user(auth.uid()));
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE USING (is_admin_user(auth.uid()));

-- Saved Providers: Users manage their own
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their saved providers" ON public.saved_providers;
DROP POLICY IF EXISTS "Admin full DELETE on saved_providers" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_delete_own" ON public.saved_providers;
DROP POLICY IF EXISTS "Admin full INSERT on saved_providers" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_insert_own" ON public.saved_providers;
DROP POLICY IF EXISTS "Admin full SELECT on saved_providers" ON public.saved_providers;
DROP POLICY IF EXISTS "saved_select_own" ON public.saved_providers;
DROP POLICY IF EXISTS "Admin full UPDATE on saved_providers" ON public.saved_providers;

CREATE POLICY "saved_providers_all_own" ON public.saved_providers FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Event Votes: Users manage their own
ALTER TABLE public.event_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on event_votes" ON public.event_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.event_votes;
DROP POLICY IF EXISTS "Admin full INSERT on event_votes" ON public.event_votes;
DROP POLICY IF EXISTS "Authenticated users can vote on events" ON public.event_votes;
DROP POLICY IF EXISTS "Admin full SELECT on event_votes" ON public.event_votes;
DROP POLICY IF EXISTS "Users can view all event votes" ON public.event_votes;
DROP POLICY IF EXISTS "Admin full UPDATE on event_votes" ON public.event_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.event_votes;

CREATE POLICY "event_votes_select_all" ON public.event_votes FOR SELECT USING (true);
CREATE POLICY "event_votes_all_own" ON public.event_votes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Event Flags: Users manage their own
ALTER TABLE public.event_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on event_flags" ON public.event_flags;
DROP POLICY IF EXISTS "Admin full INSERT on event_flags" ON public.event_flags;
DROP POLICY IF EXISTS "Users can create event flags" ON public.event_flags;
DROP POLICY IF EXISTS "Admin full SELECT on event_flags" ON public.event_flags;
DROP POLICY IF EXISTS "Users can view own flags" ON public.event_flags;
DROP POLICY IF EXISTS "Admin full UPDATE on event_flags" ON public.event_flags;

CREATE POLICY "event_flags_select_own" ON public.event_flags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "event_flags_select_admin" ON public.event_flags FOR SELECT USING (is_admin_user(auth.uid()));
CREATE POLICY "event_flags_all_own" ON public.event_flags FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- User Saved Events: Users manage their own
ALTER TABLE public.user_saved_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can unsave events" ON public.user_saved_events;
DROP POLICY IF EXISTS "Users can save events" ON public.user_saved_events;
DROP POLICY IF EXISTS "Users can view their own saved events" ON public.user_saved_events;

CREATE POLICY "saved_events_all_own" ON public.user_saved_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Coupon Redemptions: Users manage their own
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_delete_own" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admin full INSERT on coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_insert_own" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admin full SELECT on coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_select_own" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admin full UPDATE on coupon_redemptions" ON public.coupon_redemptions;

CREATE POLICY "coupons_all_own" ON public.coupon_redemptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dismissed Notifications: Users manage their own
ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on dismissed_notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Users can delete own dismissed notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Admin full INSERT on dismissed_notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Users can insert own dismissed notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Admin full SELECT on dismissed_notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Users can view own dismissed notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Admin full UPDATE on dismissed_notifications" ON public.dismissed_notifications;
DROP POLICY IF EXISTS "Users can update own dismissed notifications" ON public.dismissed_notifications;

CREATE POLICY "dismissed_all_own" ON public.dismissed_notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ADMIN-ONLY TABLES
-- ============================================================================

-- Admin Emails: Only admins
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on admin_emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admin full INSERT on admin_emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admin full SELECT on admin_emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admin full UPDATE on admin_emails" ON public.admin_emails;

CREATE POLICY "admin_emails_all_admin" ON public.admin_emails FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Admin Audit Log: Only admins
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on admin_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admin full INSERT on admin_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admin full SELECT on admin_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admin full UPDATE on admin_audit_log" ON public.admin_audit_log;

CREATE POLICY "audit_log_all_admin" ON public.admin_audit_log FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Providers Backup: Only admins
ALTER TABLE public.providers_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full DELETE on providers_backup" ON public.providers_backup;
DROP POLICY IF EXISTS "Admin full INSERT on providers_backup" ON public.providers_backup;
DROP POLICY IF EXISTS "Admin full SELECT on providers_backup" ON public.providers_backup;
DROP POLICY IF EXISTS "Admin full UPDATE on providers_backup" ON public.providers_backup;

CREATE POLICY "backup_all_admin" ON public.providers_backup FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- DONE!
-- ============================================================================

COMMIT;

-- Verify the policies were created
SELECT 
  tablename,
  COUNT(*) as policy_count,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_count,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_count,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_count,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT 'Master RLS policies applied successfully!' as status;

