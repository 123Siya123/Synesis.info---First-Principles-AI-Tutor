
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY is missing');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const { plan, userId, productId } = body; // 'premium' or 'pro'

        console.log(`Creating Checkout Session for user ${userId}, plan ${plan} (Product: ${productId})`);

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // 1. Find the Price ID for the Product
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        });

        if (prices.data.length === 0) {
            return NextResponse.json({ error: `No active price found for product ${productId}` }, { status: 400 });
        }

        const priceId = prices.data[0].id;
        console.log(`Found Price ID: ${priceId}`);

        // 2. Check for existing Stripe Customer ID
        let customerId = null;
        if (userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', userId)
                .single();

            if (profile?.stripe_customer_id) {
                customerId = profile.stripe_customer_id;
                console.log(`Found existing Stripe Customer ID: ${customerId}`);
            }
        }

        // 3. Create Checkout Session
        const sessionPayload = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${request.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
            cancel_url: `${request.headers.get('origin')}/`,
            metadata: {
                userId: userId,
                plan: plan
            },
            client_reference_id: userId,
        };

        // Add customer if exists
        if (customerId) {
            sessionPayload.customer = customerId;
            // When providing a customer, 'customer_email' should not be set (Stripe rule).
            // We are not setting customer_email so this is fine.
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
