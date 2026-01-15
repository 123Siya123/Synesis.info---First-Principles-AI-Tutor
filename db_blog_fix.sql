-- =====================================================
-- BLOG FIX SCRIPT
-- Run this to fix RLS policies and clean up duplicates
-- =====================================================

-- 1. DISABLE RLS on blog_topics (service role will handle all operations)
-- This fixes any permission issues when updating topic status
ALTER TABLE blog_topics DISABLE ROW LEVEL SECURITY;

-- 2. Or alternatively, create policies that allow service role full access
-- (Uncomment below if you prefer to keep RLS enabled)
-- DROP POLICY IF EXISTS "Allow service role all on blog_topics" ON blog_topics;
-- CREATE POLICY "Allow service role all on blog_topics" ON blog_topics
-- FOR ALL USING (true) WITH CHECK (true);

-- 3. Check current state of topics
SELECT status, COUNT(*) as count 
FROM blog_topics 
GROUP BY status;

-- 4. View some pending topics
SELECT * FROM blog_topics 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 10;

-- 5. Check existing blog posts
SELECT id, slug, title, published_at 
FROM blog_posts 
ORDER BY published_at DESC
LIMIT 10;

-- 6. OPTIONAL: Reset all topics to pending (if you want to start fresh)
-- WARNING: Uncomment only if you want to regenerate all posts!
-- UPDATE blog_topics SET status = 'pending', published_at = NULL;

-- 7. OPTIONAL: Delete duplicate blog posts (keeping only the first one per title)
-- WARNING: Uncomment only if you have duplicates!
-- DELETE FROM blog_posts 
-- WHERE id NOT IN (
--     SELECT MIN(id) FROM blog_posts GROUP BY title
-- );

-- 8. OPTIONAL: Reset failed topics back to pending
UPDATE blog_topics 
SET status = 'pending', published_at = NULL 
WHERE status = 'failed';
