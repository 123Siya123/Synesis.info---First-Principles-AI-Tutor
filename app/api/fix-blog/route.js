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
        // RESET 'Circuits' topic from published to pending
        const { data, error } = await supabase
            .from('blog_topics')
            .update({ status: 'pending' })
            .ilike('topic', '%Circuits%')
            .eq('status', 'published')
            .select();

        return NextResponse.json({
            status: 'Fix Attempted',
            reset_topics: data,
            error: error
        });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
