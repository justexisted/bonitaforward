-- ============================================================================
-- NUCLEAR OPTION: Drop ALL policies, then run master file
-- ============================================================================

BEGIN;

-- Drop existing function first
DROP FUNCTION IF EXISTS is_admin_user(uuid);

-- Make sure admin_emails table exists
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Make sure your email is in there
INSERT INTO public.admin_emails (email)
VALUES ('justexisted@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create is_admin_user function
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- NUCLEAR: Drop ALL policies from ALL tables using DO block
-- ============================================================================

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- Now create ALL policies fresh
-- ============================================================================

-- PROVIDERS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_select_all" 
ON public.providers FOR SELECT
USING (true);

CREATE POLICY "providers_insert_auth" 
ON public.providers FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "providers_update_owner" 
ON public.providers FOR UPDATE
USING (owner_user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "providers_delete_owner" 
ON public.providers FOR DELETE
USING (owner_user_id = auth.uid() OR is_admin_user(auth.uid()));

-- PROVIDER_JOB_POSTS
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "job_posts_delete_owner" 
ON public.provider_job_posts FOR DELETE
USING (owner_user_id = auth.uid());

CREATE POLICY "job_posts_delete_admin" 
ON public.provider_job_posts FOR DELETE
USING (is_admin_user(auth.uid()));

-- PROVIDER_CHANGE_REQUESTS
ALTER TABLE public.provider_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_requests_select_owner" 
ON public.provider_change_requests FOR SELECT
USING (owner_user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "change_requests_insert_auth" 
ON public.provider_change_requests FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "change_requests_update" 
ON public.provider_change_requests FOR UPDATE
USING (owner_user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "change_requests_delete" 
ON public.provider_change_requests FOR DELETE
USING (owner_user_id = auth.uid() OR is_admin_user(auth.uid()));

-- BUSINESS_APPLICATIONS
ALTER TABLE public.business_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_insert_all" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "applications_select_admin" 
ON public.business_applications FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "applications_update_admin" 
ON public.business_applications FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "applications_delete_admin" 
ON public.business_applications FOR DELETE
USING (is_admin_user(auth.uid()));

-- CALENDAR_EVENTS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_all" 
ON public.calendar_events FOR SELECT
USING (true);

CREATE POLICY "events_insert_auth" 
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "events_update_admin" 
ON public.calendar_events FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "events_delete_admin" 
ON public.calendar_events FOR DELETE
USING (is_admin_user(auth.uid()));

-- BOOKING_EVENTS
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_events_select_admin" 
ON public.booking_events FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "booking_events_insert_auth" 
ON public.booking_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "booking_events_update_admin" 
ON public.booking_events FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "booking_events_delete_admin" 
ON public.booking_events FOR DELETE
USING (is_admin_user(auth.uid()));

-- BOOKINGS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_admin" 
ON public.bookings FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "bookings_insert_auth" 
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bookings_update_admin" 
ON public.bookings FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "bookings_delete_admin" 
ON public.bookings FOR DELETE
USING (is_admin_user(auth.uid()));

-- BLOG_POSTS
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

-- CONTACT_LEADS
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_insert_all" 
ON public.contact_leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "contact_select_admin" 
ON public.contact_leads FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "contact_update_admin" 
ON public.contact_leads FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "contact_delete_admin" 
ON public.contact_leads FOR DELETE
USING (is_admin_user(auth.uid()));

-- FUNNEL_RESPONSES
ALTER TABLE public.funnel_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_insert_all" 
ON public.funnel_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "funnel_select_admin" 
ON public.funnel_responses FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "funnel_update_admin" 
ON public.funnel_responses FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "funnel_delete_admin" 
ON public.funnel_responses FOR DELETE
USING (is_admin_user(auth.uid()));

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" 
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "profiles_insert_auth" 
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_admin" 
ON public.profiles FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "profiles_delete_admin" 
ON public.profiles FOR DELETE
USING (is_admin_user(auth.uid()));

-- USER_NOTIFICATIONS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_admin" 
ON public.user_notifications FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "notifications_insert_auth" 
ON public.user_notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_update_admin" 
ON public.user_notifications FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "notifications_delete_admin" 
ON public.user_notifications FOR DELETE
USING (is_admin_user(auth.uid()));

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" 
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "categories_insert_admin" 
ON public.categories FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "categories_update_admin" 
ON public.categories FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "categories_delete_admin" 
ON public.categories FOR DELETE
USING (is_admin_user(auth.uid()));

-- EVENT_FLAGS
ALTER TABLE public.event_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_flags_select_all" 
ON public.event_flags FOR SELECT
USING (true);

CREATE POLICY "event_flags_insert_auth" 
ON public.event_flags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "event_flags_update_admin" 
ON public.event_flags FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "event_flags_delete_admin" 
ON public.event_flags FOR DELETE
USING (is_admin_user(auth.uid()));

-- ADMIN_EMAILS
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_emails_select_admin" 
ON public.admin_emails FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "admin_emails_all_admin" 
ON public.admin_emails FOR ALL
USING (is_admin_user(auth.uid()));

-- ADMIN_AUDIT_LOG (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_log') THEN
    ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY audit_log_admin ON public.admin_audit_log FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- PROVIDERS_BACKUP (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers_backup') THEN
    ALTER TABLE public.providers_backup ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY backup_admin ON public.providers_backup FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

COMMIT;

SELECT '✅ ALL POLICIES RECREATED!' as status;
SELECT 'Total policies created: 60+' as info;
SELECT 'Admin access: ENABLED' as admin_status;
SELECT 'User access: ENABLED' as user_status;

