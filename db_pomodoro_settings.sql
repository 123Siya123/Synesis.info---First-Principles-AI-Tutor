-- Add Pomodoro settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pomodoro_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pomodoro_focus_duration INT DEFAULT 25,
ADD COLUMN IF NOT EXISTS pomodoro_break_duration INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS pomodoro_repetitions INT DEFAULT 4;
