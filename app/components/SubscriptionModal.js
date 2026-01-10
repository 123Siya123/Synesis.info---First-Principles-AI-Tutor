'use client';

import { useState } from 'react';
import styles from './SubscriptionModal.module.css';

export default function SubscriptionModal({ isOpen, onClose, currentTier = 'free', onUpgrade }) {
    const [loadingTier, setLoadingTier] = useState(null);

    if (!isOpen) return null;

    const handleSubscribe = async (tier) => {
        setLoadingTier(tier);
        try {
            // Get user ID (assuming parent passes it or we have context, wait parent passes 'user' object? No.
            // We usually need the user ID. Let's assume onUpgrade can handle it OR we assume global user context is not here.
            // Actually, we should probably fetch the session on the API side or pass user ID as prop.
            // Let's use the onUpgrade prop as a proxy if it was setup, BUT we want Real Payment now.
            // We will fetch OUR API. We need the current user ID. 
            // Since we are in a client component, success depends on Auth.

            // Simpler: Trigger the API route directly here.
            // Mapping Plans to Product IDs (provided by user)
            const PRODUCTS = {
                'free': 'prod_TlY4CXlbc8Y17Z',
                'premium': 'prod_TlY6cXhNYaQUes',
                'pro': 'prod_TlY8yT0bZWyK7x'
            };

            const productId = PRODUCTS[tier];
            // We need the User ID. The component doesn't have it explicitly in props unless we add it.
            // However, Supabase auth is client side too.
            // BETTER: pass handleUpgrade from parent page.js which has 'user'.

            if (onUpgrade) {
                await onUpgrade(tier, productId);
            }

        } catch (error) {
            console.error(error);
            alert("Payment initialization failed.");
            setLoadingTier(null);
        }
    };

    return (
        <div className={`${styles.overlay} ${isOpen ? styles.open : ''}`} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>×</button>

                <header className={styles.header}>
                    <h2 className={styles.title}>Unlock Your Learning Potential</h2>
                    <p className={styles.subtitle}>Choose the plan that fits your learning journey.</p>
                </header>

                <div className={styles.plansContainer}>
                    {/* Free Plan */}
                    <div className={styles.planCard}>
                        <h3 className={styles.planName}>Free</h3>
                        <div className={styles.planPrice}>$0<span className={styles.period}>/mo</span></div>
                        <ul className={styles.featuresList}>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> 1 Mind Map
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> 5 Articles in Map Mode
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> Standard Study Access
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.cross}>×</span> Unlimited Deep Exploration
                            </li>
                        </ul>
                        <button
                            className={`${styles.ctaBtn} ${styles.outlineBtn}`}
                            disabled={currentTier === 'free'}
                        >
                            {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
                        </button>
                    </div>

                    {/* Premium Plan */}
                    <div className={`${styles.planCard} ${styles.featured}`}>
                        <div className={styles.badge}>Most Popular</div>
                        <h3 className={styles.planName}>Premium</h3>
                        <div className={styles.planPrice}>$7.99<span className={styles.period}>/mo</span></div>
                        <ul className={styles.featuresList}>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> <strong>20 Mind Maps</strong>
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> <strong>100 AI articles / mo</strong>
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> Full Interactive Expansion
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> Priority Generation
                            </li>
                        </ul>
                        <button
                            className={`${styles.ctaBtn} ${styles.accentBtn}`}
                            onClick={() => handleSubscribe('premium')}
                            disabled={currentTier === 'premium' || loadingTier}
                        >
                            {loadingTier === 'premium' ? 'Processing...' : currentTier === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className={styles.planCard}>
                        <h3 className={styles.planName}>Pro</h3>
                        <div className={styles.planPrice}>$19.99<span className={styles.period}>/mo</span></div>
                        <ul className={styles.featuresList}>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> <strong>Unlimited Mind Maps</strong>
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> <strong>1000 AI articles / mo</strong>
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> Advanced SRS Scheduling (Early Access)
                            </li>
                            <li className={styles.featureItem}>
                                <span className={styles.check}>✓</span> Calendar Integration
                            </li>
                        </ul>
                        <button
                            className={`${styles.ctaBtn} ${styles.primaryBtn}`}
                            onClick={() => handleSubscribe('pro')}
                            disabled={currentTier === 'pro' || loadingTier}
                        >
                            {loadingTier === 'pro' ? 'Processing...' : currentTier === 'pro' ? 'Current Plan' : 'Get Pro'}
                        </button>
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '1rem' }}>
                    Secure payments via Stripe. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
