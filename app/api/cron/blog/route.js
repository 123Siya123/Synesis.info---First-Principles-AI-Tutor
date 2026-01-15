import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client with service role (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

const BLOG_PROMPT_TEMPLATE = `You are writing a high-conversion blog post for Synesis (synesis.info), an AI-powered 
deep learning platform. Your job: educate readers about why they need deeper learning, 
then position Synesis as the solution.

MOST IMPORTANT:
Generate blog post for the topic: [INSERT_TOPIC_TITLE_HERE]


CRITICAL: Write as Siyamthanda Kuhlmann, in my style - direct, confident, authoritative,  experienced, and 
urgently pushing readers toward action. Use "you" constantly. Vary sentence length. 
Sound like a smart student who gets STEM students' pain points.

═══════════════════════════════════════════════════════════════════════════════════

## SYNESIS PLATFORM: THE SHORT VERSION

Synesis is an AI-powered learning platform built on the Feynman Method. Instead of 
memorizing, students learn through:

1. INPUT: Enter a topic (Quick Study for specific concepts, Plan Mode for complex ones)
2. RECURSIVE QUESTIONING: Ask about things you don't understand until you reach 
   the foundation (drilling down the knowledge tree)
3. INGRAIN & VALIDATE (The Feynman Method):
   - Brain dump everything you think you know
   - Teach an AI student (explain simply and logically)
   - Identify gaps (what you struggled explaining)
   - Test yourself (AI quizzes reveal weak spots)
   - Fill those gaps with targeted study
4. TRUE UNDERSTANDING emerges—not memorization

Core Philosophy: "If you can't explain it simply, you don't truly understand it." 
(Richard Feynman)

KEY FEATURES TO MENTION:
- Recursive questioning that exposes knowledge gaps
- Feynman Method built-in
- AI that teaches you by making you teach it
- Progress tracking and gap identification
- Free 7-day trial available

═══════════════════════════════════════════════════════════════════════════════════

## TONE & VOICE 

✓ Confident, experienced, slightly urgent
✓ Talk to ONE ambitious student/learner who's short on time but serious about results
✓ Use "you" constantly—make it personal and direct
✓ Highlight RISK of inaction ("Miss this shift in how you learn, and you'll be stuck")
✓ Highlight REWARD of action ("Master understanding, and you'll outpace your peers")
✓ Short punchy sentences mixed with longer ones
✓ Use contractions: you'll, don't, it's, can't, won't
✓ Rhetorical questions and direct challenges: "Ready to actually understand this?"
✓ Sound experienced, not theoretical: "I've seen this happen a thousand times..."
✓ Avoid jargon without explanation. If you use "metacognition" or "E-E-A-T", explain it
✓ Inject personality: mild optimism, pragmatism, a hint of "I've been there" wisdom
✓ Never robotic. Never repetitive. Never filler.

═══════════════════════════════════════════════════════════════════════════════════

## STRUCTURE TO FOLLOW (EXACTLY)

### 1. TITLE
Format: "How to [Outcome] Instead of [Old Way]" or "Why [Pain Point] (And How to Fix It)"
Examples:
- "How to Understand Calculus Instead of Memorizing Formulas"
- "Why Engineering Students Can't Explain Circuits (And How to Fix It)"
- "How to Learn Physics: The Feynman Technique Explained"

Make it keyword-rich and benefit-focused.

### 2. OPENING LINES (150-200 words)
Start with a broad, relatable truth about learning or education changing.
Immediately pivot to the specific shift and its consequences (risk + opportunity).
End with a clear winner/loser framing: "Students who master understanding will dominate. 
Those stuck in memorization will fall behind."

Don't mention Synesis yet. Just set up the problem and the stakes.

Example opening:
"Your school taught you to memorize. Your teachers made you drill formulas until they 
stuck. You passed exams. But here's the uncomfortable truth: you forgot everything 
within weeks. And when you hit upper-level courses, the real problem showed up—you 
couldn't actually explain what you knew. The game has changed. Employers, universities, 
and real engineering don't reward memorization. They reward understanding. And that 
requires a completely different approach to learning."

### 3. SOFT CTA + AUTHOR CREDIT (50-75 words)
Line 1: "I hope you enjoy reading this post. If you want a deep learning tool 
to accelerate your understanding, check out Synesis."
Then: "By [Your Name], [Your Credentials/Affiliation]. Published [Date]."

### 4. KEY TAKEAWAYS SECTION (6 bullet points, 1 line each)
Each bullet is a complete, benefit-driven sentence that previews a major point.
Acts as an executive summary for skimmers.

Examples:
- Understanding actually takes LESS time than memorization—you just remember more
- Rote learning creates a "false illusion" that you know something you don't
- The Feynman Method exposes exactly what you don't understand
- Most engineering students fail upper-level courses because they never learned to understand
- Deep learning compounds: understanding one concept makes the next one easier
- Synesis automates the hardest part: finding your knowledge gaps

### 5. MAIN PROMOTIONAL BANNER (Mid-post, after first section)
Style: Highlighted box or section break
Headline: example: "Master Deep Understanding With Synesis"
Sub-text: example: "Stop memorizing. Start understanding."
3-4 benefit bullets:examples:
  • AI-powered Feynman Method built-in
  • Recursive questioning reveals exactly what you don't know
  • Learn faster by understanding deeper
  • 7-day free trial—no credit card

CTA Button: "Try Synesis Free"
Link: synesis.info

### 6. MAIN CONTENT SECTIONS (750-1200 words total)
Use benefit-oriented subheadings. Start with "Why", "How", "What", or "[Topic]: Ways To…"
Break content into logical flow: Problem → Root Cause → Why It Matters → The Solution → How Synesis Helps

SUB-SUBHEADINGS: Break sections into 3-5 smaller points for scannability.

INSIDE SECTIONS:
- Use bold phrases and short lists
- Short paragraphs (1-4 sentences max)
- Real STEM examples (circuits, calculus, programming, physics, etc.)
- Reference research/studies where relevant
- Validate reader frustration ("You're not stupid. The system is broken.")

SECTION TEMPLATES:

**"The Problem" Section (150-200 words):**
State what's broken in traditional learning. Use real examples. Reference research. 
Validate frustration.
Sub-points:
  - What students struggle with (explain formulas but not concepts)
  - Why it happens (schools teach procedures, not understanding)
  - The consequence (upper-level courses expose the gap)

**"Why This Happens" Section (100-150 words):**
Explain the root cause. Reference cognitive science. Keep it simple.
Sub-points:
  - How memorization tricks the brain into thinking you know
  - Why the education system teaches this way (systemic, not your fault)
  - The hidden cost (poor transfer of knowledge)

**"The Solution" Section (150-200 words):**
Introduce deep learning and the Feynman Method. Use real example.
Sub-points:
  - What the Feynman Method is
  - How questioning reveals gaps
  - Why explaining forces understanding
  - Example: "You memorize Ohm's law. But can you explain WHY it exists? 
    That 'why' is where real understanding lives."

**"How Synesis Helps" Section (100-150 words):**
Position the app as the tool that makes this automatic.
Sub-points:
  - Recursive questioning feature (finds gaps automatically)
  - Ingrain & Validate method (Feynman automated)
  - Progress tracking (shows what you actually understand)
  - Time savings (understand faster than memorization)

Soft-sell language:
"If you want a shortcut to this process, Synesis automates the recursive questioning 
and gap-finding. Most students spend weeks doing this manually. Synesis does it in hours."

### 7. OPTIONAL: 1-2 TOOL/FEATURE CALLOUTS (50-100 words each)
Weave in naturally. Soft-sell tone. Format: Small box with benefit bullets.
Example:
"The Recursive Questioning Feature
Instead of guessing what you don't know, Synesis asks. It finds gaps automatically, 
saving you weeks of frustration. Try it free."

### 8. FAQs SECTION (3-5 questions, 50-100 words per answer)
Phrase naturally as reader questions.
Answer directly. Reinforce main points. Don't sell, just help.

Example Questions:
- "Does understanding really take less time than memorization?"
- "How do I know if I actually understand something?"
- "Can I use the Feynman Method on any subject?"
- "Why do most students fail upper-level courses?"

### 9. CONCLUSION (100-150 words)
Recap the transformation. Encourage small starting steps.
End with Synesis as the next logical step.

Example:
"The education system isn't changing. But you can. Start by asking 'why' more. 
Ask yourself what you can't explain. That's your knowledge gap. If you want to 
automate this process and stop guessing about what you know, Synesis is built 
exactly for this. Try it free for 7 days. See for yourself."

CTA: "Ready to truly understand? Try Synesis free at synesis.info"

### 10. ABOUT THE AUTHOR (50-75 words)
Fixed bio at the end. Include credentials, any media mentions, authority signals.

Example:
"[Your Name] is a learning strategist and educator. He's written about STEM learning 
on [Publication], and has helped [X] students shift from memorization to real understanding. 
He's obsessed with the Feynman Method and how to teach it at scale."

═══════════════════════════════════════════════════════════════════════════════════

## FORMATTING & READABILITY RULES

✓ Short paragraphs (1-4 sentences max)
✓ Frequent bold subheadings (every 100-150 words)
✓ Bullet and numbered lists throughout
✓ Em dashes for conversational asides—like this—to feel natural
✓ No walls of text. Every section scannable.
✓ White space matters. Use it.

═══════════════════════════════════════════════════════════════════════════════════

## CRITICAL TALKING POINTS (Include 3-4 Naturally Throughout)

Required to hit:
□ "If you can't explain it simply, you don't truly understand it" (Feynman quote)
□ Why engineering students can explain formulas but not concepts
□ How rote memorization creates "false illusions of understanding"
□ The gap between passing exams and solving real problems
□ Why traditional textbooks teach procedures, not comprehension
□ Students forget 80% of rote-learned material (research fact)
□ Understanding actually FASTER than memorization (counter-intuitive)
□ Questions reveal more than answers

═══════════════════════════════════════════════════════════════════════════════════

## DO's AND DON'Ts

DO:
✓ Sound like you've experienced this problem
✓ Use specific STEM examples (circuits, calculus, physics, programming)
✓ Challenge traditional education naturally (not preachy)
✓ Make the reader feel validated ("You're not stupid")
✓ Use urgency subtly ("Students who adapt will dominate")
✓ Mention research/studies for credibility
✓ Position Synesis as a shortcut, not a miracle cure
✓ Include 1-2 rhetorical questions
✓ End every section with a sense of clarity or action

DON'T:
✗ Use salesy language ("revolutionary," "game-changer," "never seen before")
✗ Make unsubstantiated claims
✗ Ignore other tools/methods (acknowledge them, position Synesis as better)
✗ Be academic or formal (this isn't a textbook)
✗ Repeat the same point multiple ways
✗ Forget to actually teach something valuable (reader should learn)
✗ Hard-sell Synesis (soft integration only)
✗ Use passive voice when active is stronger
✗ Make paragraphs longer than 4 sentences

═══════════════════════════════════════════════════════════════════════════════════

## EXECUTION CHECKLIST

For each post you generate:
1. Replace [INSERT_TOPIC_TITLE_HERE] with specific blog title
2. Generate ONE blog post (750-1200 words)
3. Follow structure above exactly
4. Include 3-4 key talking points naturally
5. Make reader learn something valuable in the post itself
6. Ensure 3-5 sub-subheadings per main section
7. Include real STEM examples
8. Reference 1-2 studies/research points
9. Include the mid-post promotional banner
10. End with clear CTA: "Ready to truly understand [topic]? Try Synesis free at synesis.info"
11. Include author bio
`;

// Helper function to generate a unique slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')         // Spaces to hyphens
        .replace(/-+/g, '-')          // Multiple hyphens to single
        .substring(0, 80);            // Limit length
}

// Helper function to get a Groq API key (supports rotation)
function getGroqApiKey() {
    const keys = [
        process.env.NEXT_PUBLIC_GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
    ].filter(Boolean);

    if (keys.length === 0) {
        throw new Error('No Groq API keys configured');
    }

    // Simple random rotation
    return keys[Math.floor(Math.random() * keys.length)];
}

export async function GET(request) {
    const logPrefix = `[Blog Cron ${new Date().toISOString()}]`;

    try {
        console.log(`${logPrefix} Starting blog generation...`);

        // Validate environment
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({
                error: 'Missing Supabase environment variables'
            }, { status: 500 });
        }

        // STEP 1: Get the next UNIQUE pending topic
        // We select topics that are 'pending' and order by created_at (FIFO)
        const { data: topicData, error: topicError } = await supabase
            .from('blog_topics')
            .select('id, topic, status, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (topicError) {
            console.error(`${logPrefix} Error fetching topic:`, topicError);
            return NextResponse.json({
                error: 'Database error fetching topic',
                details: topicError.message
            }, { status: 500 });
        }

        if (!topicData) {
            console.log(`${logPrefix} No pending topics found.`);
            return NextResponse.json({
                success: true,
                message: 'No pending topics found. Queue is empty.',
                generated: false
            }, { status: 200 });
        }

        console.log(`${logPrefix} Found topic: "${topicData.topic}" (ID: ${topicData.id})`);

        // STEP 2: Check if a blog post already exists with a similar title
        // This prevents regenerating the same topic if it was already published
        const { data: existingPost } = await supabase
            .from('blog_posts')
            .select('id, title, slug')
            .ilike('title', `%${topicData.topic.substring(0, 30)}%`)
            .limit(1)
            .maybeSingle();

        if (existingPost) {
            console.log(`${logPrefix} Topic already has a published post. Marking as published.`);

            // Mark this specific topic as published (by ID, not by topic string)
            await supabase
                .from('blog_topics')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', topicData.id);

            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Topic already has a published blog post',
                existingSlug: existingPost.slug,
                topicId: topicData.id
            });
        }

        // STEP 3: Generate Content via Groq
        const groqApiKey = getGroqApiKey();
        const filledSystemPrompt = BLOG_PROMPT_TEMPLATE.replace('[INSERT_TOPIC_TITLE_HERE]', topicData.topic);

        console.log(`${logPrefix} Calling Groq API...`);

        const completion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: filledSystemPrompt },
                    {
                        role: 'user',
                        content: `Generate a blog post for the topic: "${topicData.topic}"
                        
OUTPUT VALID JSON ONLY. The JSON object must have these exact keys:
{
    "title": "The exact title for this blog post",
    "slug": "url-friendly-slug-of-title",
    "excerpt": "A compelling 150-160 character meta description",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "content": "The full blog post content in Markdown format, following all structural rules from the system prompt."
}

Do not output any text other than the JSON object. Do not wrap in markdown code blocks.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            })
        });

        if (!completion.ok) {
            const errBody = await completion.text();
            console.error(`${logPrefix} Groq API Error:`, errBody);

            // Mark topic as failed so we can retry later
            await supabase
                .from('blog_topics')
                .update({ status: 'failed' })
                .eq('id', topicData.id);

            return NextResponse.json({
                error: 'Groq API Error',
                details: errBody
            }, { status: 500 });
        }

        const completionData = await completion.json();
        const contentJsonString = completionData.choices?.[0]?.message?.content;

        if (!contentJsonString) {
            console.error(`${logPrefix} Empty response from Groq`);
            return NextResponse.json({
                error: 'Empty response from AI'
            }, { status: 500 });
        }

        // STEP 4: Parse the generated content
        let generatedPost;
        try {
            generatedPost = JSON.parse(contentJsonString);
        } catch (e) {
            console.error(`${logPrefix} Failed to parse LLM JSON:`, contentJsonString.substring(0, 500));

            // Mark as failed
            await supabase
                .from('blog_topics')
                .update({ status: 'failed' })
                .eq('id', topicData.id);

            return NextResponse.json({
                error: 'Failed to parse generated content as JSON',
                raw: contentJsonString.substring(0, 200)
            }, { status: 500 });
        }

        // Validate required fields
        if (!generatedPost.title || !generatedPost.content) {
            console.error(`${logPrefix} Missing required fields in generated post`);
            return NextResponse.json({
                error: 'Generated post missing title or content'
            }, { status: 500 });
        }

        // STEP 5: Save to Database with unique slug handling
        let slug = generatedPost.slug || generateSlug(generatedPost.title);
        let insertedPost = null;
        let attempt = 0;

        while (!insertedPost && attempt < 5) {
            attempt++;
            const currentSlug = attempt === 1 ? slug : `${slug}-${Date.now()}`;

            const { data, error } = await supabase
                .from('blog_posts')
                .insert({
                    title: generatedPost.title,
                    slug: currentSlug,
                    content: generatedPost.content,
                    excerpt: generatedPost.excerpt || generatedPost.title,
                    seo_keywords: generatedPost.keywords || [],
                    published_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();

            if (error) {
                // Check for unique constraint violation (Postgres code 23505)
                if (error.code === '23505') {
                    console.warn(`${logPrefix} Slug collision: ${currentSlug}. Retrying...`);
                    continue;
                } else {
                    console.error(`${logPrefix} Error inserting post:`, error);
                    throw error;
                }
            }

            insertedPost = data;
        }

        if (!insertedPost) {
            console.error(`${logPrefix} Failed to insert post after ${attempt} attempts`);
            return NextResponse.json({
                error: 'Failed to insert post after multiple attempts'
            }, { status: 500 });
        }

        console.log(`${logPrefix} Post created: ${insertedPost.slug}`);

        // STEP 6: Mark THIS specific topic as published (by ID)
        const { error: updateError } = await supabase
            .from('blog_topics')
            .update({
                status: 'published',
                published_at: new Date().toISOString()
            })
            .eq('id', topicData.id);

        if (updateError) {
            console.error(`${logPrefix} Warning: Post created but failed to update topic status:`, updateError);
            // Don't fail the request - the post was created successfully
        }

        console.log(`${logPrefix} Success! Topic "${topicData.topic}" -> Post "${insertedPost.slug}"`);

        return NextResponse.json({
            success: true,
            generated: true,
            topic: topicData.topic,
            topicId: topicData.id,
            slug: insertedPost.slug,
            title: insertedPost.title
        });

    } catch (error) {
        console.error(`${logPrefix} Unexpected error:`, error);
        return NextResponse.json({
            error: error.message || 'Unknown error occurred',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
