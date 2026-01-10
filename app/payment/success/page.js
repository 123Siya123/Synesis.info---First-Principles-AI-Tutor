'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');
    const plan = searchParams.get('plan');
    const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'

    useEffect(() => {
        if (!sessionId || !plan) {
            setStatus('error');
            return;
        }

        const finalizeSubscription = async () => {
            // In a real app, strict verification of the session via API is needed here.
            // But for MVP, we trust the flow and update the profile.
            // SECURITY WARNING: A user could manually navigate here.
            // Ideally, use a webhook to handle this securely.

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({
                        subscription_tier: plan,
                        subscription_status: 'active'
                    }).eq('id', user.id);
                    setStatus('success');

                    // Auto-redirect after a few seconds
                    setTimeout(() => router.push('/'), 3000);
                } else {
                    setStatus('error'); // User not logged in?
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };

        finalizeSubscription();
    }, [sessionId, plan, router]);

    return (
        <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
        }}>
            {status === 'processing' && (
                <>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Confirming...</h2>
                    <div className="spinner"></div>
                </>
            )}

            {status === 'success' && (
                <>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                    <h2 style={{ color: '#16a34a', marginBottom: '1rem' }}>Upgrade Successful!</h2>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem' }}>
                        You are now on the <strong>{plan.toUpperCase()}</strong> plan.
                        Redirecting you back to learning...
                    </p>
                    <Link href="/" style={{
                        background: '#16a34a',
                        color: 'white',
                        padding: '1rem 2rem',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: 'bold'
                    }}>
                        Go Home Now
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <h2 style={{ color: '#dc2626' }}>Something went wrong.</h2>
                    <p>Please contact support or try again.</p>
                    <Link href="/">Back to Home</Link>
                </>
            )}
        </div>
    );
}

export default function PaymentSuccess() {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8f9fa',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <Suspense fallback={<div>Loading payment details...</div>}>
                <PaymentSuccessContent />
            </Suspense>
            <style jsx global>{`
                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
