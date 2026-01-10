import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    let event;

    try {
        if (!webhookSecret) {
            throw new Error("Missing STRIPE_WEBHOOK_SECRET");
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Extract metadata set during checkout creation
                const userId = session.metadata?.userId;
                const plan = session.metadata?.plan;

                if (userId && plan) {
                    console.log(`✅ Payment successful for user ${userId}. Upgrading to ${plan}.`);

                    // Update user profile
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            subscription_tier: plan,
                            subscription_status: 'active',
                            // Reset usage counters on upgrade? Optional, but good practice.
                            // monthly_article_count: 0  // Keep usage or reset? Usually keep usage until billing cycle.
                        })
                        .eq('id', userId);

                    if (error) console.error('Failed to update profile:', error);
                } else {
                    console.warn('⚠️ Webhook received but missing metadata:', session.metadata);
                }
                break;
            }

            case 'customer.subscription.updated': {
                // Handle renewals or downgrades
                const subscription = event.data.object;
                // Ideally we map stripe_customer_id to user_id in DB to handle this completely detached from metadata
                break;
            }

            case 'customer.subscription.deleted': {
                // Handle cancellations
                const subscription = event.data.object;
                // Find user by customer ID and downgrade to free
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err) {
        console.error('Error processing webhook:', err);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
