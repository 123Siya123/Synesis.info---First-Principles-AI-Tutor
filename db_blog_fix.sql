-- =====================================================
-- BLOG FIX SCRIPT - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- 1. DISABLE RLS on blog_topics
ALTER TABLE blog_topics DISABLE ROW LEVEL SECURITY;

-- 2. Add 'processing' status
ALTER TABLE blog_topics DROP CONSTRAINT IF EXISTS blog_topics_status_check;
ALTER TABLE blog_topics ADD CONSTRAINT blog_topics_status_check 
    CHECK (status IN ('pending', 'processing', 'published', 'failed'));

-- 3. Delete duplicate blog posts FIRST (keeps oldest by published_at)
DELETE FROM blog_posts 
WHERE id NOT IN (
    SELECT DISTINCT ON (title) id 
    FROM blog_posts 
    ORDER BY title, published_at ASC
);

-- 4. Add UNIQUE constraint on title to prevent duplicates at database level
-- This is the FINAL defense - even if code fails, DB will reject duplicates
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_title_unique;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_title_unique UNIQUE (title);

-- 5. Reset any 'processing' topics back to 'pending'
UPDATE blog_topics 
SET status = 'pending' 
WHERE status = 'processing';

-- 6. Mark topics as 'published' if they already have a matching blog post
UPDATE blog_topics bt
SET status = 'published', published_at = NOW()
WHERE bt.status = 'pending'
AND EXISTS (
    SELECT 1 FROM blog_posts bp 
    WHERE bp.title = bt.topic
);

-- 7. View results
SELECT 'Duplicate cleanup complete!' as status;
SELECT status, COUNT(*) as count FROM blog_topics GROUP BY status;
SELECT title, slug, published_at FROM blog_posts ORDER BY published_at DESC LIMIT 10;
