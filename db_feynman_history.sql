-- =====================================================
-- FEYNMAN HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feynman_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT, -- For mind map subtopics
  essay_text TEXT,
  teaching_text TEXT,
  question_history JSONB, -- Store the Q&A session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feynman_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own feynman history" ON public.feynman_history;
CREATE POLICY "Users can view their own feynman history"
  ON public.feynman_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feynman history" ON public.feynman_history;
CREATE POLICY "Users can insert their own feynman history"
  ON public.feynman_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own feynman history" ON public.feynman_history;
CREATE POLICY "Users can delete their own feynman history"
  ON public.feynman_history FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS feynman_history_study_id_idx ON public.feynman_history (study_id);
CREATE INDEX IF NOT EXISTS feynman_history_user_id_idx ON public.feynman_history (user_id);
