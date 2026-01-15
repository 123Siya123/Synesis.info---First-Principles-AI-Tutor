import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug-blog
 * Returns the current status of the blog system for debugging
 */
export async function GET() {
    try {
        // 1. Count topics by status
        const { data: pendingTopics } = await supabase
            .from('blog_topics')
            .select('id', { count: 'exact' })
            .eq('status', 'pending');

        const { data: publishedTopics } = await supabase
            .from('blog_topics')
            .select('id', { count: 'exact' })
            .eq('status', 'published');

        const { data: failedTopics } = await supabase
            .from('blog_topics')
            .select('id', { count: 'exact' })
            .eq('status', 'failed');

        // 2. Get next 5 pending topics
        const { data: nextPending } = await supabase
            .from('blog_topics')
            .select('id, topic, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(5);

        // 3. Get 5 most recent blog posts
        const { data: recentPosts } = await supabase
            .from('blog_posts')
            .select('id, title, slug, published_at')
            .order('published_at', { ascending: false })
            .limit(5);

        // 4. Total blog posts count
        const { count: totalPosts } = await supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true });

        return NextResponse.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            queue: {
                pending: pendingTopics?.length || 0,
                published: publishedTopics?.length || 0,
                failed: failedTopics?.length || 0,
                nextUp: nextPending || []
            },
            posts: {
                total: totalPosts || 0,
                recent: recentPosts || []
            }
        });
    } catch (e) {
        return NextResponse.json({
            status: 'ERROR',
            error: e.message
        }, { status: 500 });
    }
}
