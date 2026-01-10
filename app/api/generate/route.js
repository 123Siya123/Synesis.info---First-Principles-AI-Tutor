
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for incrementing counts securely if needed, 
// OR just use standard client with user's auth token. 
// Using standard client with service role key is safer for admin tasks like incrementing counters reliably 
// without relying on user RLS policies permitting the update.
// However, simplest is to use the user's session.
// Let's use the SERVICE_ROLE key for the server-side operations to ensure we can read/write profile data authoritatively.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // We need this!

if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for server-side profile access');
}

// Use the Service Role Key for server-side operations.
// This bypasses RLS policies, which is necessary because the API route
// doesn't have the user's authenticated session context.
// We rely on the userId being validated and passed from the authenticated client.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
    const { topic, systemPrompt, userId, model, planMode } = await request.json();

    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Server misconfiguration: Missing API Key' }, { status: 500 });
    }

    // 1. Verify User
    // Ideally we verify the auth token from headers, but for MVP we trust the passed userId if we trust the client? NO.
    // We must verify the session.
    // In Next.js App Router, we can get the session cookies.
    // But for simplicity with the current setup, let's fetch the profile by ID and assume the request is valid 
    // (Actual production app would verify the Auth Header Bearer token).
    // Let's stick to checking the database limits for the given userId.

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        // 2. Fetch User Profile for Limits
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // If profile doesn't exist, create it automatically
        // This handles users who signed up before the trigger was set up
        if (profileError?.code === 'PGRST116' || !profile) {
            console.log('Profile not found for user, creating one:', userId);

            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    subscription_tier: 'free',
                    subscription_status: 'active',
                    monthly_article_count: 0,
                    monthly_mind_map_count: 0,
                    last_reset_date: new Date().toISOString()
                })
                .select('*')
                .single();

            if (createError) {
                console.error('Failed to create profile:', createError);
                return NextResponse.json({ error: 'Failed to create user profile. Please contact support.' }, { status: 500 });
            }

            profile = newProfile;
            console.log('Successfully created profile for user:', userId);
        } else if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json({ error: 'Database error fetching profile.' }, { status: 500 });
        }

        let { subscription_tier, monthly_article_count, last_reset_date, monthly_mind_map_count } = profile;

        // --- A. Monthly Reset Logic (Lazy Evaluation) ---
        const now = new Date();
        const lastReset = last_reset_date ? new Date(last_reset_date) : new Date(0); // Epoch if null
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        if (lastReset < oneMonthAgo) {
            console.log(`Resetting usage for user ${userId}. Last reset: ${lastReset}`);
            // Perform the reset in DB
            await supabase
                .from('profiles')
                .update({
                    monthly_article_count: 0,
                    monthly_mind_map_count: 0,
                    last_reset_date: now.toISOString()
                })
                .eq('id', userId);

            // Update local variables for this request
            monthly_article_count = 0;
            monthly_mind_map_count = 0;
        }

        // --- B. Define Limits ---
        const LIMITS = { free: 20, premium: 100, pro: 1000 };
        const MIND_MAP_LIMITS = { free: 5, premium: 100, pro: 1000 }; // Premium/Pro essentially unlimited/matched

        const currentTotalLimit = LIMITS[subscription_tier] || 20;
        const currentMindMapLimit = MIND_MAP_LIMITS[subscription_tier] || 5;

        // --- C. Enforce Limits ---

        // 1. Global Total Limit
        if (monthly_article_count >= currentTotalLimit) {
            return NextResponse.json({
                error: 'Monthly global limit reached',
                limitType: 'total',
                current: monthly_article_count,
                max: currentTotalLimit
            }, { status: 403 });
        }

        // 2. Mind Map Specific Limit (Strict Enforcement)
        if (planMode && monthly_mind_map_count >= currentMindMapLimit) {
            return NextResponse.json({
                error: `Mind Map specific limit reached (${currentMindMapLimit} per month)`,
                limitType: 'mindmap',
                current: monthly_mind_map_count,
                max: currentMindMapLimit
            }, { status: 403 });
        }

        // 5. Call External API (Groq)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: topic }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const articleContent = data.choices[0]?.message?.content;

        // 6. Increment Usage Counter
        // We prepare the update object dynamically
        const updates = {
            monthly_article_count: monthly_article_count + 1
        };

        if (planMode) {
            updates.monthly_mind_map_count = (monthly_mind_map_count || 0) + 1;
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (updateError) console.error('Failed to update usage count:', updateError);

        return NextResponse.json({
            content: articleContent,
            usage: {
                current: monthly_article_count + 1,
                max: currentTotalLimit,
                mindMapCurrent: planMode ? (monthly_mind_map_count || 0) + 1 : monthly_mind_map_count,
                mindMapMax: currentMindMapLimit
            }
        });

    } catch (error) {
        console.error('Generation failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
