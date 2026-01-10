-- Improvement: Add columns for usage tracking and precise limits
-- Run this in your Supabase SQL Editor

-- 1. Add Timestamp for Monthly Reset
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add Counter for Mind Map specific generations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_mind_map_count INTEGER DEFAULT 0;

-- 3. Function to handle monthly reset (Lazy evaluation approach)
-- We will handle the logic in the API for simplicity and control, 
-- but having these columns is essential.

-- (Optional) If we wanted a DB trigger for reset, it's complex to schedule.
-- The API "Check-and-Reset" approach is standard for serverless.
