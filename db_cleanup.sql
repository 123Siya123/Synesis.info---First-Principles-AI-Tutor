-- 1. DELETE DUPLICATES: Keep only the most recent "Calculus" post, delete the others.
DELETE FROM blog_posts 
WHERE slug LIKE '%calculus%' 
AND id NOT IN (
    SELECT id 
    FROM blog_posts 
    WHERE slug LIKE '%calculus%' 
    ORDER BY published_at DESC 
    LIMIT 1
);

-- 2. FORCE COMPLETE: Ensure the topic is marked as 'published' so the automation moves to Topic #2.
UPDATE blog_topics 
SET status = 'published' 
WHERE topic = 'How to Understand Calculus Instead of Just Memorizing Formulas';
