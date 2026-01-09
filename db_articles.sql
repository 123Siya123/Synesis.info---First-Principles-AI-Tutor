-- Create a table to cache generated articles
create table if not exists public.generated_articles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  topic text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.generated_articles enable row level security;

-- Policies
create policy "Users can view their own articles"
  on public.generated_articles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own articles"
  on public.generated_articles for insert
  with check (auth.uid() = user_id);

-- Optional: Allow users to search by topic easily (index)
create index if not exists articles_topic_idx on public.generated_articles (topic);
