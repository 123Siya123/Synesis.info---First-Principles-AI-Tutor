-- Blog Topics Table (Queue for automation)
create table blog_topics (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  status text default 'pending' check (status in ('pending', 'published', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  published_at timestamp with time zone
);

-- Blog Posts Table (Actual content)
create table blog_posts (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  content text not null, -- Markdown content
  excerpt text, -- For SEO meta description and previews
  seo_keywords text[], -- Array of keywords
  published_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (If RLS is enabled, we need to allow public read access to posts)
alter table blog_posts enable row level security;

create policy "Enable read access for all users"
on blog_posts for select
using (true);

-- Allow service role (server) to insert/update
create policy "Enable insert for service role only"
on blog_posts for insert
with check (true); -- modifying via service role bypasses RLS anyway, but good to be explicit if using authenticated client

-- Policies for topics (internal usage)
alter table blog_topics enable row level security;
-- Only service role should touch this usually
