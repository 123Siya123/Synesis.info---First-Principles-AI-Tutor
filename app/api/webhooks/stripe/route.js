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
        console.log(`🔔 Event received: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                const plan = session.metadata?.plan;
                const customerId = session.customer;

                if (userId && plan) {
                    console.log(`✅ Payment successful for user ${userId}. Upgrading to ${plan}.`);
                    // Use upsert to create profile if it doesn't exist (e.g. legacy users)
                    const { data, error } = await supabase
                        .from('profiles')
                        .upsert({
                            id: userId,
                            subscription_tier: plan,
                            subscription_status: 'active',
                            stripe_customer_id: customerId,
                            monthly_article_count: 0, // Reset usage on new subscription
                            monthly_mind_map_count: 0,
                            updated_at: new Date().toISOString()
                        })
                        .select(); // Select to confirm the update happened

                    if (error) {
                        console.error('Failed to update profile:', error);
                    } else {
                        console.log('Profile updated successfully:', data);
                    }
                } else {
                    console.warn('⚠️ Webhook received but missing metadata:', session.metadata);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customerId = invoice.customer;

                // Only handle subscription invoices
                if (invoice.subscription) {
                    console.log(`💸 Payment succeeded for customer ${customerId}. Renewing usage.`);
                    // Find user by stripe_customer_id and reset usage
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            subscription_status: 'active',
                            monthly_article_count: 0,
                            monthly_mind_map_count: 0,
                            last_reset_date: new Date().toISOString()
                        })
                        .eq('stripe_customer_id', customerId);

                    if (error) console.error('Failed to update profile on renewal:', error);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;

                if (invoice.subscription) {
                    console.warn(`❌ Payment failed for customer ${customerId}.`);
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            subscription_status: 'past_due' // or 'unpaid' relying on stripe settings
                        })
                        .eq('stripe_customer_id', customerId);

                    if (error) console.error('Failed to update profile on payment failure:', error);
                }
                break;
            }

            case 'customer.subscription.updated': {
                // Check if status changed explicitly (e.g. paused, resumed)
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const status = subscription.status;

                console.log(`🔄 Subscription updated for customer ${customerId}. Status: ${status}`);

                // Map Stripe status to DB status
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        subscription_status: status
                    })
                    .eq('stripe_customer_id', customerId);

                if (error) console.error('Failed to update profile on sub update:', error);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;

                console.log(`🚫 Subscription deleted/canceled for customer ${customerId}.`);
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: 'free',
                        subscription_status: 'canceled'
                    })
                    .eq('stripe_customer_id', customerId);

                if (error) console.error('Failed to update profile on cancel:', error);
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
