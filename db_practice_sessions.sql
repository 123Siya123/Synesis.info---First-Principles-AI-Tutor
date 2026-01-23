-- =====================================================
-- PRACTICE SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- The unique ID of the node/article in the mind map
  tab_state JSONB DEFAULT '{}'::JSONB, -- Stores activeTab, questions, answers, feedback
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, study_id, node_id) -- One session per node per study per user
);

-- Enable RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can view their own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can insert their own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can update their own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can delete their own practice sessions"
  ON public.practice_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS practice_sessions_lookup_idx ON public.practice_sessions (study_id, node_id);
