-- CREATE PROVIDER_JOB_POSTS TABLE
-- Run this if you need job posts functionality

-- Create the provider_job_posts table
CREATE TABLE IF NOT EXISTS public.provider_job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  apply_url text,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for provider_job_posts table
-- SELECT: Allow everyone to view published job posts (public read)
CREATE POLICY "Public can view published job posts" ON public.provider_job_posts
  FOR SELECT USING (published = true);

-- SELECT: Allow owners to view their own job posts (published or not)
CREATE POLICY "Owners can view their own job posts" ON public.provider_job_posts
  FOR SELECT USING (owner_user_id = auth.uid());

-- INSERT: Allow authenticated users to create job posts
CREATE POLICY "Authenticated users can create job posts" ON public.provider_job_posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow owners to update their own job posts
CREATE POLICY "Owners can update their own job posts" ON public.provider_job_posts
  FOR UPDATE USING (owner_user_id = auth.uid());

-- DELETE: Allow owners to delete their own job posts
CREATE POLICY "Owners can delete their own job posts" ON public.provider_job_posts
  FOR DELETE USING (owner_user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_job_posts_provider_id ON public.provider_job_posts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_job_posts_owner_user_id ON public.provider_job_posts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_provider_job_posts_published ON public.provider_job_posts(published);
CREATE INDEX IF NOT EXISTS idx_provider_job_posts_created_at ON public.provider_job_posts(created_at);
