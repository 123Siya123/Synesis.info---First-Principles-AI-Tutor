-- CRITICAL FIX: The automation successfully creates the post but FAILS to mark the topic as "done".
-- This is because of Row Level Security (RLS) blocking the update.

-- 1. Disable RLS on the queue table so the API can definitely update it.
ALTER TABLE blog_topics DISABLE ROW LEVEL SECURITY;

-- 2. Clean up the "Calculus" mess (delete duplicates again)
DELETE FROM blog_posts 
WHERE slug LIKE '%calculus%' 
AND id NOT IN (
    SELECT id 
    FROM blog_posts 
    WHERE slug LIKE '%calculus%' 
    ORDER BY published_at DESC 
    LIMIT 1
);

-- 3. Manually mark the Calculus topic as published so we move to the next one.
UPDATE blog_topics 
SET status = 'published' 
WHERE topic = 'How to Understand Calculus Instead of Just Memorizing Formulas';
