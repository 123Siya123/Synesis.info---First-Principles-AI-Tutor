-- =====================================================
-- BLOG FIX SCRIPT - RUN THIS IN SUPABASE SQL EDITOR
-- This fixes duplicate issues and adds atomic claiming
-- =====================================================

-- 1. DISABLE RLS on blog_topics (service role handles all operations)
ALTER TABLE blog_topics DISABLE ROW LEVEL SECURITY;

-- 2. Add 'processing' status to the check constraint
ALTER TABLE blog_topics DROP CONSTRAINT IF EXISTS blog_topics_status_check;
ALTER TABLE blog_topics ADD CONSTRAINT blog_topics_status_check 
    CHECK (status IN ('pending', 'processing', 'published', 'failed'));

-- 3. Create atomic claim function to prevent race conditions
CREATE OR REPLACE FUNCTION claim_next_blog_topic()
RETURNS TABLE(id uuid, topic text, status text, created_at timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
    claimed_id uuid;
BEGIN
    -- Atomically select and update the next pending topic
    UPDATE blog_topics t
    SET status = 'processing'
    WHERE t.id = (
        SELECT bt.id 
        FROM blog_topics bt 
        WHERE bt.status = 'pending'
        ORDER BY bt.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED  -- Skip if another process is claiming
    )
    RETURNING t.id INTO claimed_id;
    
    -- Return the claimed topic
    RETURN QUERY 
    SELECT bt.id, bt.topic, bt.status, bt.created_at
    FROM blog_topics bt
    WHERE bt.id = claimed_id;
END;
$$;

-- 4. CLEANUP: Delete all the duplicate blog posts, keeping only ONE per title
-- First, let's see what we have
SELECT title, COUNT(*) as count 
FROM blog_posts 
GROUP BY title 
HAVING COUNT(*) > 1;

-- Delete duplicates (keeps the OLDEST one per title)
DELETE FROM blog_posts 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM blog_posts 
    GROUP BY title
);

-- 5. Reset all 'processing' topics back to 'pending' (in case of interrupted runs)
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

-- 7. View current state
SELECT 'Topics by status:' as info;
SELECT status, COUNT(*) as count FROM blog_topics GROUP BY status;

SELECT 'Next 5 pending topics:' as info;
SELECT id, topic, created_at 
FROM blog_topics 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 5;

SELECT 'Current blog posts:' as info;
SELECT id, title, slug, published_at 
FROM blog_posts 
ORDER BY published_at DESC
LIMIT 10;
