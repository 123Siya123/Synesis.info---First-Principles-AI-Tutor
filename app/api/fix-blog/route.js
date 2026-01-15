import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/fix-blog
 * Utility endpoint to fix common blog issues
 * Query params:
 *   - action=reset-failed : Reset all failed topics back to pending
 *   - action=reset-all : Reset ALL topics back to pending (dangerous!)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (!action) {
            return NextResponse.json({
                message: 'Available actions',
                usage: [
                    '/api/fix-blog?action=reset-failed - Reset failed topics to pending',
                    '/api/fix-blog?action=reset-all - Reset ALL topics to pending (use with caution!)',
                ]
            });
        }

        if (action === 'reset-failed') {
            // Reset all 'failed' topics back to 'pending'
            const { data, error, count } = await supabase
                .from('blog_topics')
                .update({ status: 'pending', published_at: null })
                .eq('status', 'failed')
                .select();

            return NextResponse.json({
                action: 'reset-failed',
                success: !error,
                resetCount: data?.length || 0,
                error: error?.message
            });
        }

        if (action === 'reset-all') {
            // WARNING: This resets ALL topics back to pending
            const { data, error } = await supabase
                .from('blog_topics')
                .update({ status: 'pending', published_at: null })
                .neq('status', 'pending') // Only change non-pending ones
                .select();

            return NextResponse.json({
                action: 'reset-all',
                success: !error,
                resetCount: data?.length || 0,
                error: error?.message,
                warning: 'All topics have been reset to pending'
            });
        }

        return NextResponse.json({
            error: 'Unknown action',
            validActions: ['reset-failed', 'reset-all']
        }, { status: 400 });

    } catch (e) {
        return NextResponse.json({
            status: 'ERROR',
            error: e.message
        }, { status: 500 });
    }
}
