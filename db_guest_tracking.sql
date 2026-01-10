-- Create a table to track guest usage
CREATE TABLE IF NOT EXISTS public.guest_tracking (
  guest_id UUID PRIMARY KEY,
  article_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (though the API uses service key, so it bypasses RLS, but good practice)
ALTER TABLE public.guest_tracking ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access if needed, but we handle this via Service Key in API
-- For now, no public policies needed since API writes to it directly via Service Role.
