SELECT id, topic, status, created_at, published_at 
FROM blog_topics 
WHERE topic LIKE '%Circuits%';

SELECT count(*) as pending_count FROM blog_topics WHERE status = 'pending';
SELECT count(*) as published_count FROM blog_topics WHERE status = 'published';
