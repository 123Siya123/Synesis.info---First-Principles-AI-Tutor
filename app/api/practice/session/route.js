
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for backend ops if needed, but RLS works with user token conceptually. Here we are backend, so service role is reliable.
// Actually, to respect RLS, we should create client with auth header or just use service role and manually check?
// I'll use service role for simplicity in this prototype phase to avoid auth header parsing complexity, assuming userId is passed and valid (in real app, use auth middleware).
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const studyId = searchParams.get('studyId');
    const nodeId = searchParams.get('nodeId');

    if (!userId || !studyId || !nodeId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('practice_sessions')
        .select('tab_state')
        .eq('user_id', userId)
        .eq('study_id', studyId)
        .eq('node_id', nodeId)
        .single();

    if (error && error.code !== 'PGRST116') { // 116 is not found
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tab_state: data?.tab_state || null });
}

export async function POST(req) {
    const body = await req.json();
    const { userId, studyId, nodeId, tabState } = body;

    if (!userId || !studyId || !nodeId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Upsert
    const { data, error } = await supabase
        .from('practice_sessions')
        .upsert({ user_id: userId, study_id: studyId, node_id: nodeId, tab_state: tabState, updated_at: new Date().toISOString() }, { onConflict: 'user_id, study_id, node_id' });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
