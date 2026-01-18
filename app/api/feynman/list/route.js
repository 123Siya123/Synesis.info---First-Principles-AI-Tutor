import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const studyId = searchParams.get('studyId');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let query = supabase
            .from('feynman_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (studyId) {
            query = query.eq('study_id', studyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching feynman history:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Fetch failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
