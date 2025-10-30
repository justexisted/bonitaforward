-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id),
  CONSTRAINT admin_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.admin_emails (
  email text NOT NULL,
  CONSTRAINT admin_emails_pkey PRIMARY KEY (email)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_key text NOT NULL CHECK (category_key = ANY (ARRAY['real-estate'::text, 'home-services'::text, 'health-wellness'::text, 'restaurants-cafes'::text, 'professional-services'::text])),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email text,
  category text NOT NULL,
  name text NOT NULL,
  notes text,
  answers jsonb,
  status text DEFAULT 'new'::text,
  created_at timestamp with time zone DEFAULT now(),
  provider_id uuid,
  user_id uuid,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_provider_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT bookings_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.business_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text,
  business_name text,
  email text,
  phone text,
  category text,
  challenge text,
  created_at timestamp with time zone DEFAULT now(),
  tier_requested text DEFAULT 'free'::text CHECK (tier_requested = ANY (ARRAY['free'::text, 'featured'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT business_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  key text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (key)
);
CREATE TABLE public.contact_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name text,
  contact_email text,
  details text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupon_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid,
  code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT coupon_redemptions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.funnel_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email text,
  category text NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT funnel_responses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text,
  role text CHECK (role = ANY (ARRAY['business'::text, 'community'::text])),
  created_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.provider_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['update'::text, 'delete'::text, 'feature_request'::text, 'claim'::text])),
  changes jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  decided_at timestamp with time zone,
  CONSTRAINT provider_change_requests_pkey PRIMARY KEY (id),
  CONSTRAINT provider_change_requests_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_change_requests_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.provider_job_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  apply_url text,
  salary_range text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  decided_at timestamp with time zone,
  CONSTRAINT provider_job_posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric,
  created_at timestamp with time zone DEFAULT now(),
  category_key text,
  published boolean NOT NULL DEFAULT true,
  badges ARRAY DEFAULT '{}'::text[],
  phone text,
  email text,
  website text,
  address text,
  images ARRAY DEFAULT '{}'::text[],
  name_norm text DEFAULT lower(btrim(name)),
  owner_user_id uuid,
  is_member boolean DEFAULT false,
  description text,
  specialties ARRAY,
  social_links jsonb,
  business_hours jsonb,
  service_areas ARRAY,
  google_maps_url text,
  updated_at timestamp with time zone DEFAULT now(),
  is_featured boolean DEFAULT false,
  featured_since timestamp with time zone,
  subscription_type text CHECK (subscription_type = ANY (ARRAY['monthly'::text, 'yearly'::text])),
  plan text,
  tier text,
  paid boolean DEFAULT false,
  bonita_resident_discount text,
  booking_enabled boolean DEFAULT false,
  booking_type text CHECK (booking_type = ANY (ARRAY['appointment'::text, 'reservation'::text, 'consultation'::text, 'walk-in'::text])),
  booking_instructions text,
  booking_url text,
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_category_key_fkey FOREIGN KEY (category_key) REFERENCES public.categories(key),
  CONSTRAINT providers_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.providers_backup (
  id uuid,
  name text,
  tags jsonb,
  rating numeric,
  created_at timestamp with time zone,
  category_key text,
  published boolean,
  badges ARRAY,
  phone text,
  email text,
  website text,
  address text,
  images ARRAY
);
CREATE TABLE public.saved_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_providers_pkey PRIMARY KEY (id),
  CONSTRAINT saved_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT saved_providers_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  body text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

// ok columns for provider are: id(uuid), name(text), tags(jsonb), rating(numeric), created_at(timestamptz), category(text), published(bool), badges(text[]), phone(text), email(text), website(text), address(text), images(text[]), name_norm(text), owner_user_id(uuid), is_member(bool), description(text), specialties(text[]), social_links(jsonb), business_hours(jsonb), service_areas(text[]), google_maps_url(text), updated_at(timestamptz), is_featured(bool), featured_since(timestamptz), subscription_type(text), bonita_resident_discount(text), booking_enabled(bool), booking_type(text), booking_instructions(text), booking_url(text) //