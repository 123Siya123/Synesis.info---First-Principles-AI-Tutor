
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, returnUrl } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (!profile?.stripe_customer_id) {
            return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: returnUrl || 'http://localhost:3000/', // Fallback, client should send exact origin
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Portal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
