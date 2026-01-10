-- Create a table for user profiles to track subscription and usage
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  subscription_tier text default 'free', -- 'free', 'premium', 'pro'
  subscription_status text default 'active', -- 'active', 'canceled', 'past_due'
  stripe_customer_id text,
  monthly_article_count int default 0,
  last_reset_date timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function
-- Note: You might need to drop the trigger first if it exists from a previous setup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
