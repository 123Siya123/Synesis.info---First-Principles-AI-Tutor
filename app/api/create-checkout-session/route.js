
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const body = await request.json();
        const { plan, userId, productId } = body; // 'premium' or 'pro'

        console.log(`Creating Checkout Session for user ${userId}, plan ${plan} (Product: ${productId})`);

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // 1. Find the Price ID for the Product
        // Stripe Checkout requires a Price ID (not Product ID) to create a session
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

        // 2. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
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
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
