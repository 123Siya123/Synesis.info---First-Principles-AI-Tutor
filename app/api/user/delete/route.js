
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        // 1. Get user profile to find Stripe Customer ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (profile?.stripe_customer_id) {
            // 2. Cancel Subscription in Stripe
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: profile.stripe_customer_id,
                    status: 'active'
                });

                for (const sub of subscriptions.data) {
                    await stripe.subscriptions.cancel(sub.id);
                }

                // Optionally delete customer object in Stripe:
                // await stripe.customers.del(profile.stripe_customer_id);
            } catch (stripeError) {
                // If the customer exists in Test mode but we have Live keys (or vice versa), this will fail.
                // We should log it but NOT stop the account deletion process.
                console.warn('Stripe cleanup failed (continuing with DB deletion):', stripeError.message);
            }
        }

        // 3. Manually Delete Public Data (Foreign Key References)
        // Since we don't have ON DELETE CASCADE setup on the DB, we must manually clean up.

        // A. Delete Generated Articles
        const { error: articlesError } = await supabase
            .from('generated_articles')
            .delete()
            .eq('user_id', userId);
        if (articlesError) console.warn('Error cleaning articles:', articlesError);

        // B. Delete Studies
        const { error: studiesError } = await supabase
            .from('studies')
            .delete()
            .eq('user_id', userId);
        if (studiesError) console.warn('Error cleaning studies:', studiesError);

        // C. Delete Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (profileError) console.warn('Error cleaning profile:', profileError);

        // 4. Delete User from Supabase Auth
        // This usually cascades to public tables if foreign keys are set up with ON DELETE CASCADE
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
