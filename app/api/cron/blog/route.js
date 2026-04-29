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

// =============================================================================
// TOPIC GENERATION PROMPT
// Used when the queue is empty — fills the queue with 50-100 fresh topics.
// =============================================================================
const TOPIC_GENERATION_PROMPT = `You are a senior copywriter & SEO strategist for Synesis (synesis.info), an AI-powered
learning platform built on the Feynman Method. Your job: brainstorm a fresh batch of
blog post TITLES that we will turn into articles to rank for AI-SEO and classic SEO,
attract STEM students and self-learners, and convert them into trial users.

## OUTPUT FORMAT (STRICT)
Return ONLY valid JSON in this exact shape:
{
  "topics": [
    "Title 1",
    "Title 2",
    ...
  ]
}
- Generate between 60 and 80 unique titles.
- Each title must be a single string, 40-110 characters, no quotes or markdown.
- No numbering, no leading dashes, no trailing punctuation other than ! or ?.

## WHAT WE SELL (CONTEXT)
Synesis = AI tutor that uses recursive questioning + the Feynman Method
(brain dump → teach the AI → spot gaps → quiz → fill gaps). Audience:
ambitious STEM students, med students, law students, self-learners,
working professionals upskilling, and curious adults who want deep — not
surface — understanding.

## THEMES TO COVER (MIX THESE — DON'T DO ONE TYPE OVER AND OVER)

A. AI-SEO / "answer engine" topics (people asking AI assistants):
   - "Best AI tutors for [subject] in 2026"
   - "Is the Feynman method better than flashcards?"
   - "How to learn faster with AI without cheating"
   - Long-tail comparisons: Synesis vs. ChatGPT, Synesis vs. Anki, etc.

B. Classic SEO long-tail (high intent, low competition):
   - "How to study organic chemistry from first principles"
   - "Why your highlights don't help you remember anything"
   - Subject-specific: physics, biology, calculus, ML, philosophy, history, languages

C. Pain-point hooks (counterintuitive, scroll-stopping):
   - "Why straight-A students forget everything by July"
   - "Re-reading is killing your grades — do this instead"

D. Personal-story / narrative titles (these MUST sound human):
   - "I almost failed thermodynamics. Then I taught it to my dog."
   - "The 4 a.m. moment I realised flashcards were lying to me"
   - "What a barista in Cape Town taught me about deep learning"
   - Use first-person "I", concrete details, time/place anchors. The body of
     the article (written later) will use the same voice — so the title should
     promise a story, not a listicle.

E. Identity / archetype hooks:
   - "For the student who reads everything but understands nothing"
   - "If you're 'good at school' but bad at thinking, read this"

F. Frameworks & systems:
   - "The 5-question test that reveals if you actually understand a topic"
   - "A 30-minute study loop that beats 3 hours of re-reading"

G. Contrarian / mythbusting:
   - "Memorisation isn't the problem. This is."
   - "Why ChatGPT is making you a worse student (and the fix)"

## ANTI-AI WRITING GUIDE (CRITICAL — TITLES MUST NOT SOUND AI-WRITTEN)

DO NOT use any of these AI tells:
✗ "Unlock", "Unleash", "Master", "Supercharge", "Revolutionise", "Game-changer"
✗ "In today's fast-paced world…", "In the era of AI…"
✗ "The ultimate guide to…", "Everything you need to know about…"
✗ "Harness the power of…", "Leverage…"
✗ "Dive deep", "Delve into", "Embark on"
✗ Em-dashes used as drama (—) more than once
✗ Triads of adjectives ("clear, concise, and compelling")
✗ Vague abstractions like "transformative", "innovative", "cutting-edge"
✗ Clickbait numbers without specificity ("10 amazing ways…")

DO use:
✓ Concrete nouns (organic chem, MCAT, calculus 2, Krebs cycle, Bayes' theorem)
✓ Specific times / places / situations (4 a.m., final exam week, the night before)
✓ First-person stories with stakes ("I", "my", felt-experience)
✓ Plain words a 14-year-old understands
✓ Friction in the title — a contradiction, a question, a confession
✓ One idea per title (no compound titles glued with "and")

## DIVERSITY RULES
- Spread across themes A-G; do not cluster.
- Vary opening words (don't start 5 titles with "How to").
- Include AT LEAST 8 personal-story style titles (theme D).
- Include AT LEAST 10 long-tail SEO titles tied to a real subject.
- Include AT LEAST 5 AI-SEO comparison/answer-engine titles.
- Avoid duplicates and near-duplicates.

## BANNED PATTERNS (these already exist or are overused)
Do not start more than 2 titles with "Why".
Do not start more than 2 titles with "How to".
No title may contain the word "Unlock" or "Master" or "Ultimate" or "Supercharge".

Now produce the JSON. Return ONLY the JSON object — no preface, no markdown fences.`;

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

// =============================================================================
// REFILL CYCLE
// When the pending queue is empty, spend this cron tick refilling the queue
// with 50-100 fresh, human-sounding topics instead of generating a blog post.
// The next cron tick will then have topics to consume.
// =============================================================================
async function refillTopicQueue(log) {
    log('Queue empty — running refill cycle to generate new topics');

    const groqApiKey = getGroqApiKey();

    const completion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: TOPIC_GENERATION_PROMPT },
                { role: 'user', content: 'Generate the JSON object now. 60-80 titles, mixed themes, no AI tells.' }
            ],
            temperature: 0.9,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        })
    });

    if (!completion.ok) {
        const err = await completion.text();
        log(`Refill Groq error: ${err}`);
        return { ok: false, reason: 'groq_error', error: err };
    }

    const result = await completion.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: 'empty_response' };

    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        return { ok: false, reason: 'invalid_json' };
    }

    const titles = Array.isArray(parsed.topics) ? parsed.topics : [];
    if (titles.length === 0) return { ok: false, reason: 'no_titles' };

    // Clean & dedupe within the batch
    const seen = new Set();
    const cleaned = [];
    for (const raw of titles) {
        if (typeof raw !== 'string') continue;
        const t = raw.trim().replace(/^["'\-\d\.\)\s]+/, '').replace(/["']$/, '').trim();
        if (t.length < 20 || t.length > 140) continue;
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleaned.push(t);
    }

    if (cleaned.length === 0) return { ok: false, reason: 'all_filtered' };

    // Drop titles that already exist in blog_topics or blog_posts
    const { data: existingTopics } = await supabase
        .from('blog_topics')
        .select('topic');
    const { data: existingPosts } = await supabase
        .from('blog_posts')
        .select('title');

    const existing = new Set([
        ...(existingTopics || []).map(r => r.topic.toLowerCase()),
        ...(existingPosts || []).map(r => r.title.toLowerCase())
    ]);

    const fresh = cleaned.filter(t => !existing.has(t.toLowerCase()));
    if (fresh.length === 0) return { ok: false, reason: 'all_duplicates' };

    log(`Refill: inserting ${fresh.length} new topics`);

    const rows = fresh.map(topic => ({ topic, status: 'pending' }));
    const { data: inserted, error: insertError } = await supabase
        .from('blog_topics')
        .insert(rows)
        .select('id');

    if (insertError) {
        log(`Refill insert error: ${insertError.message}`);
        return { ok: false, reason: 'insert_error', error: insertError.message };
    }

    return { ok: true, inserted: inserted?.length || 0, attempted: fresh.length };
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
            // Queue is empty — burn this cycle on a refill instead of a blog post.
            // Next cron tick will pick up the freshly inserted topics.
            const refill = await refillTopicQueue(log);
            return NextResponse.json({
                success: refill.ok,
                generated: false,
                refilled: refill.ok,
                ...refill,
                message: refill.ok
                    ? `Queue was empty — refilled with ${refill.inserted} new topics. Next run will publish.`
                    : `Queue was empty and refill failed: ${refill.reason}`
            });
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
