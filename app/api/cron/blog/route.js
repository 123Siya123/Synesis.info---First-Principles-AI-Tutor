import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client with service role (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

const BLOG_PROMPT_TEMPLATE = `You are writing a high-conversion blog post for Synesis (synesis.info), an AI-powered 
deep learning platform. Your job: educate readers about why they need deeper learning, 
then position Synesis as the solution.

MOST IMPORTANT:
Generate blog post for the topic: [INSERT_TOPIC_TITLE_HERE]

CRITICAL: Write as Siyamthanda Kuhlmann, in my style - direct, confident, authoritative, experienced, and 
urgently pushing readers toward action. Use "you" constantly. Vary sentence length. 
Sound like a smart student who gets STEM students' pain points.

## SYNESIS PLATFORM: THE SHORT VERSION

Synesis is an AI-powered learning platform built on the Feynman Method. Instead of 
memorizing, students learn through:

1. INPUT: Enter a topic (Quick Study for specific concepts, Plan Mode for complex ones)
2. RECURSIVE QUESTIONING: Ask about things you don't understand until you reach the foundation
3. INGRAIN & VALIDATE (The Feynman Method):
   - Brain dump everything you think you know
   - Teach an AI student (explain simply and logically)
   - Identify gaps (what you struggled explaining)
   - Test yourself (AI quizzes reveal weak spots)
   - Fill those gaps with targeted study
4. TRUE UNDERSTANDING emerges—not memorization

Core Philosophy: "If you can't explain it simply, you don't truly understand it." (Richard Feynman)

KEY FEATURES TO MENTION:
- Recursive questioning that exposes knowledge gaps
- Feynman Method built-in
- AI that teaches you by making you teach it
- Progress tracking and gap identification
- Free 7-day trial available

## TONE & VOICE 

✓ Confident, experienced, slightly urgent
✓ Talk to ONE ambitious student/learner who's short on time but serious about results
✓ Use "you" constantly—make it personal and direct
✓ Short punchy sentences mixed with longer ones
✓ Use contractions: you'll, don't, it's, can't, won't
✓ Sound experienced, not theoretical
✓ Never robotic. Never repetitive. Never filler.

## STRUCTURE TO FOLLOW

1. TITLE: Format: "How to [Outcome] Instead of [Old Way]" or "Why [Pain Point] (And How to Fix It)"
2. OPENING (150-200 words): Start with relatable truth, pivot to stakes
3. KEY TAKEAWAYS: 6 bullet points
4. MAIN CONTENT (750-1200 words): Problem → Root Cause → Solution → How Synesis Helps
5. FAQs (3-5 questions)
6. CONCLUSION with CTA

## FORMATTING RULES
✓ Short paragraphs (1-4 sentences max)
✓ Frequent subheadings
✓ Bullet and numbered lists
✓ No walls of text
`;

// Helper function to generate a unique slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60);
}

// Helper function to get a Groq API key
function getGroqApiKey() {
    const keys = [
        process.env.NEXT_PUBLIC_GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
    ].filter(Boolean);

    if (keys.length === 0) throw new Error('No Groq API keys configured');
    return keys[Math.floor(Math.random() * keys.length)];
}

export async function GET(request) {
    const runId = Math.random().toString(36).substring(7);
    const log = (msg) => console.log(`[Blog ${runId}] ${msg}`);

    try {
        log('Starting...');

        if (!supabase) {
            return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
        }

        // STEP 1: Get a pending topic and IMMEDIATELY try to mark it as processing
        // Use a single atomic update that only succeeds if status is still 'pending'
        const { data: topics, error: fetchError } = await supabase
            .from('blog_topics')
            .select('id, topic')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        if (fetchError) {
            log(`Fetch error: ${fetchError.message}`);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!topics || topics.length === 0) {
            log('No pending topics');
            return NextResponse.json({ success: true, message: 'No pending topics', generated: false });
        }

        const topic = topics[0];
        log(`Found topic: "${topic.topic}" (${topic.id})`);

        // STEP 2: Try to claim this topic atomically
        // Only updates if status is STILL 'pending' - prevents race conditions
        const { data: claimed, error: claimError } = await supabase
            .from('blog_topics')
            .update({ status: 'processing' })
            .eq('id', topic.id)
            .eq('status', 'pending')  // CRITICAL: Only claim if still pending
            .select();

        if (claimError) {
            log(`Claim error: ${claimError.message}`);
            return NextResponse.json({ error: claimError.message }, { status: 500 });
        }

        if (!claimed || claimed.length === 0) {
            log('Topic already claimed by another process');
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Topic claimed by concurrent request'
            });
        }

        log('Topic claimed successfully');

        // STEP 3: Check if a blog post with this EXACT title already exists
        const { data: existing } = await supabase
            .from('blog_posts')
            .select('id, slug')
            .eq('title', topic.topic)
            .limit(1)
            .maybeSingle();

        if (existing) {
            log('Post already exists for this topic');
            await supabase
                .from('blog_topics')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', topic.id);

            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Post already exists',
                existingSlug: existing.slug
            });
        }

        // STEP 4: Generate content via Groq
        log('Generating content...');
        const groqApiKey = getGroqApiKey();
        const filledPrompt = BLOG_PROMPT_TEMPLATE.replace('[INSERT_TOPIC_TITLE_HERE]', topic.topic);

        const completion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: filledPrompt },
                    {
                        role: 'user',
                        content: `Generate a blog post for: "${topic.topic}"
                        
Return ONLY valid JSON with these keys:
{
    "title": "${topic.topic}",
    "slug": "url-friendly-slug",
    "excerpt": "150-160 char description",
    "keywords": ["keyword1", "keyword2"],
    "content": "Full markdown content"
}

IMPORTANT: The title MUST be exactly "${topic.topic}"`
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            })
        });

        if (!completion.ok) {
            const err = await completion.text();
            log(`Groq error: ${err}`);
            await supabase.from('blog_topics').update({ status: 'failed' }).eq('id', topic.id);
            return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
        }

        const result = await completion.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            log('Empty Groq response');
            await supabase.from('blog_topics').update({ status: 'failed' }).eq('id', topic.id);
            return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
        }

        // STEP 5: Parse JSON
        let post;
        try {
            post = JSON.parse(content);
        } catch (e) {
            log('JSON parse failed');
            await supabase.from('blog_topics').update({ status: 'failed' }).eq('id', topic.id);
            return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 });
        }

        if (!post.content) {
            log('Missing content in response');
            await supabase.from('blog_topics').update({ status: 'failed' }).eq('id', topic.id);
            return NextResponse.json({ error: 'Missing content' }, { status: 500 });
        }

        // STEP 6: Insert post - use topic.topic as title to ensure consistency
        // The title has a UNIQUE constraint, so duplicates will fail
        const finalTitle = topic.topic; // Use original topic, NOT AI-generated title
        const slug = generateSlug(finalTitle) + '-' + Date.now(); // Timestamp ensures unique slug

        log(`Inserting post: "${finalTitle}"`);

        const { data: inserted, error: insertError } = await supabase
            .from('blog_posts')
            .insert({
                title: finalTitle,
                slug: slug,
                content: post.content,
                excerpt: post.excerpt || finalTitle.substring(0, 160),
                seo_keywords: post.keywords || [],
                published_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (insertError) {
            // If duplicate title error, just mark as published
            if (insertError.code === '23505') {
                log('Duplicate detected at insert - marking as published');
                await supabase
                    .from('blog_topics')
                    .update({ status: 'published', published_at: new Date().toISOString() })
                    .eq('id', topic.id);
                return NextResponse.json({
                    success: true,
                    skipped: true,
                    reason: 'Duplicate title constraint'
                });
            }

            log(`Insert error: ${insertError.message}`);
            await supabase.from('blog_topics').update({ status: 'failed' }).eq('id', topic.id);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // STEP 7: Mark topic as published
        await supabase
            .from('blog_topics')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', topic.id);

        log(`SUCCESS: ${inserted.slug}`);

        return NextResponse.json({
            success: true,
            generated: true,
            topic: topic.topic,
            slug: inserted.slug
        });

    } catch (error) {
        console.error(`[Blog ${runId}] Error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
