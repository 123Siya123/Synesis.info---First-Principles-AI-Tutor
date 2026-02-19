import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRotatedGroqKey } from '../../lib/getApiKey';
import { robustFetch } from '../../lib/apiUtils';

// ... imports

// --- SECURE API ROUTE ---
// This route handles AI content generation while enforcing usage limits and permissions.
// It supports both authenticated users (with monthly allowances) and guests (limited trial).

export async function POST(request) {
    // Create Supabase client INSIDE the handler to ensure env vars are available at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Create Supabase admin client to bypass RLS for administrative checks (limits)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Extract parameters from the request body
    const { topic, systemPrompt, userId, guestId, model, planMode, previousContext } = await request.json();

    const apiKey = getRotatedGroqKey();

    if (!apiKey) {
        return NextResponse.json({ error: 'Server misconfiguration: Missing API Key' }, { status: 500 });
    }

    // --- GUEST HANDLING ---
    if (!userId) {
        if (!guestId) {
            return NextResponse.json({ error: 'User ID or Guest ID required' }, { status: 400 });
        }

        // 1. Block Mind Maps for Guests
        if (planMode) {
            return NextResponse.json({
                error: 'Guest limit reached',
                reason: 'mindmap_locked',
                message: 'Mind Maps are available for registered users only.'
            }, { status: 403 });
        }

        // 2. Check Guest Limits (1 article max)
        const { data: guestData, error: guestError } = await supabase
            .from('guest_tracking')
            .select('*')
            .eq('guest_id', guestId)
            .single();

        if (guestError && guestError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Guest tracking error:', guestError);
            return NextResponse.json({ error: 'Database error checking guest limits' }, { status: 500 });
        }

        const guestCount = guestData?.article_count || 0;

        if (guestCount >= 1) {
            return NextResponse.json({
                error: 'Guest limit reached',
                reason: 'article_limit',
                current: guestCount,
                max: 1
            }, { status: 403 });
        }

        // Proceed to Generate for Guest...
        try {
            // Call Groq with retry and timeout
            const response = await robustFetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model || 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: previousContext ? `Context from previous article:\n${previousContext}\n\nQuestion/Topic: ${topic}` : topic }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            }, { maxRetries: 3, timeoutMs: 30000 });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const articleContent = data.choices[0]?.message?.content;

            // Increment Guest Usage
            const { error: upsertError } = await supabase
                .from('guest_tracking')
                .upsert({
                    guest_id: guestId,
                    article_count: guestCount + 1,
                    updated_at: new Date().toISOString()
                });

            if (upsertError) console.error('Failed to update guest usage:', upsertError);

            return NextResponse.json({
                content: articleContent,
                usage: {
                    current: guestCount + 1,
                    max: 1,
                    isGuest: true
                }
            });

        } catch (error) {
            console.error('Guest Generation failure:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    // --- AUTHENTICATED USER HANDLING ---
    // (Existing logic below...)

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
                return NextResponse.json({
                    error: `Failed to create user profile: ${createError.message || createError.code}`,
                    details: createError
                }, { status: 500 });
            }

            profile = newProfile;
            console.log('Successfully created profile for user:', userId);
        } else if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json({ error: 'Database error fetching profile.', details: profileError }, { status: 500 });
        }

        // --- LIMIT ENFORCEMENT LOGIC ---
        // We fetch the user's profile to check their current usage against their plan limits.
        // If the profile doesn't exist (edge case), we create one.

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

        // 5. Call External API (Groq) with retry and timeout
        const response = await robustFetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: previousContext ? `Context from previous article:\n${previousContext}\n\nQuestion/Topic: ${topic}` : topic }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        }, { maxRetries: 3, timeoutMs: 30000 });

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

        // We DO NOT increment mind map count here anymore. 
        // Mind map count is for the creation of the map itself (in /api/generate-plan).

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
