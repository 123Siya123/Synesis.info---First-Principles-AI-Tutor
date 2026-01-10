-- =====================================================
-- COMPLETE DATABASE SETUP FOR LEARNING APP
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- ================================
-- 1. PROFILES TABLE (for subscriptions & usage)
-- ================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium', 'pro'
  subscription_status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  stripe_customer_id TEXT,
  monthly_article_count INT DEFAULT 0,
  monthly_mind_map_count INT DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ================================
-- 2. TRIGGER: Auto-create profile on user signup
-- ================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING; -- Prevents errors if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================
-- 3. STUDIES TABLE (for saving learning sessions)
-- ================================
CREATE TABLE IF NOT EXISTS public.studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  topic TEXT NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studies
DROP POLICY IF EXISTS "Users can view their own studies" ON public.studies;
CREATE POLICY "Users can view their own studies"
  ON public.studies FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own studies" ON public.studies;
CREATE POLICY "Users can insert their own studies"
  ON public.studies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own studies" ON public.studies;
CREATE POLICY "Users can update their own studies"
  ON public.studies FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own studies" ON public.studies;
CREATE POLICY "Users can delete their own studies"
  ON public.studies FOR DELETE
  USING (auth.uid() = user_id);

-- ================================
-- 4. GENERATED_ARTICLES TABLE (for caching articles)
-- ================================
CREATE TABLE IF NOT EXISTS public.generated_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.generated_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_articles
DROP POLICY IF EXISTS "Users can view their own articles" ON public.generated_articles;
CREATE POLICY "Users can view their own articles"
  ON public.generated_articles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own articles" ON public.generated_articles;
CREATE POLICY "Users can insert their own articles"
  ON public.generated_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster topic lookups
CREATE INDEX IF NOT EXISTS articles_topic_idx ON public.generated_articles (topic);

-- ================================
-- 5. MANUALLY INSERT PROFILE FOR EXISTING USERS
-- If you already have a user logged in who was created BEFORE the trigger existed,
-- their profile won't exist. This command creates it.
-- Replace 'YOUR_USER_ID' and 'YOUR_EMAIL' if needed, or run the generic version.
-- ================================
-- This will create a profile for ALL existing users who don't have one yet.
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ================================
-- 6. SERVICE ROLE ACCESS FOR WEBHOOKS
-- The webhook uses a Service Role key, which bypasses RLS.
-- No special policy is needed. The Service Role has full access.
-- ================================

-- =====================================================
-- DONE! Your database is now fully configured.
-- =====================================================
