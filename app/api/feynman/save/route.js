import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        const { userId, studyId, topic, subtopic, essayText, teachingText, questionHistory } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('feynman_history')
            .insert({
                user_id: userId,
                study_id: studyId,
                topic: topic,
                subtopic: subtopic,
                essay_text: essayText,
                teaching_text: teachingText,
                question_history: questionHistory
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving feynman history:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Save failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
