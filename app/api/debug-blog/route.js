import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Check Topic Queue Stats
        const { count: pendingCount } = await supabase.from('blog_topics').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: publishedCount } = await supabase.from('blog_topics').select('*', { count: 'exact', head: true }).eq('status', 'published');

        // 2. Get Next Pending Topic
        const { data: nextTopic } = await supabase
            .from('blog_topics')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        const nextTopicTitle = nextTopic && nextTopic[0] ? nextTopic[0].topic : null;

        let analysis = {};

        if (nextTopicTitle) {
            // Check how many times this topic exists in TOTAL
            const { data: duplicates } = await supabase
                .from('blog_topics')
                .select('id, status, created_at')
                .eq('topic', nextTopicTitle);

            analysis.next_topic_duplicates = duplicates;
        }

        // 3. Get Recent Posts
        const { data: recentPosts } = await supabase
            .from('blog_posts')
            .select('id, title, slug, published_at')
            .order('published_at', { ascending: false })
            .limit(5);

        return NextResponse.json({
            status: 'Debug Info v2',
            queue: {
                pending: pendingCount,
                published: publishedCount,
                next_up: nextTopic ? nextTopic[0] : 'NONE'
            },
            analysis: analysis,
            recent_posts: recentPosts
        });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
