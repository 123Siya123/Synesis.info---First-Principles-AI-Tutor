-- Create a table to store user study sessions/topics
create table if not exists public.studies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  topic text not null,
  session_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.studies enable row level security;

-- Create policies
create policy "Users can view their own studies"
  on public.studies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own studies"
  on public.studies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own studies"
  on public.studies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own studies"
  on public.studies for delete
  using (auth.uid() = user_id);
