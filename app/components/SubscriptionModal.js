'use client';

import { useState, useEffect } from 'react';
import styles from './SubscriptionModal.module.css';

export default function SubscriptionModal({ isOpen, onClose, currentTier = 'free', onUpgrade }) {
    const [loadingTier, setLoadingTier] = useState(null);
    const [currency, setCurrency] = useState('USD');

    // Static rates for estimation (User requested ZAR specifically)
    // Real billing is USD.
    const RATES = {
        'USD': { rate: 1, symbol: '$' },
        'EUR': { rate: 0.92, symbol: '€' },
        'GBP': { rate: 0.79, symbol: '£' },
        'ZAR': { rate: 18.5, symbol: 'R' },
        'INR': { rate: 83.5, symbol: '₹' },
        'CAD': { rate: 1.36, symbol: 'CA$' },
        'AUD': { rate: 1.52, symbol: 'A$' },
        'JPY': { rate: 151, symbol: '¥' },
        'BRL': { rate: 5.1, symbol: 'R$' },
    };

    useEffect(() => {
        // Attempt to detect user's currency based on locale
        const userLocale = navigator.language; // e.g., "en-US", "en-GB", "fr-FR"
        let detectedCurrency = 'USD'; // Default

        if (userLocale.includes('en-GB')) detectedCurrency = 'GBP';
        else if (userLocale.includes('en-ZA')) detectedCurrency = 'ZAR';
        else if (userLocale.includes('en-IN')) detectedCurrency = 'INR';
        else if (userLocale.includes('en-CA')) detectedCurrency = 'CAD';
        else if (userLocale.includes('en-AU')) detectedCurrency = 'AUD';
        else if (userLocale.includes('ja-JP')) detectedCurrency = 'JPY';
        else if (userLocale.includes('fr-FR') || userLocale.includes('de-DE') || userLocale.includes('es-ES') || userLocale.includes('it-IT')) detectedCurrency = 'EUR';
        else if (userLocale.includes('pt-BR')) detectedCurrency = 'BRL';

        // Ensure the detected currency is one we support
        if (RATES[detectedCurrency]) {
            setCurrency(detectedCurrency);
        }
    }, []);

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
                'free': process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_FREE || 'prod_TlY4CXlbc8Y17Z',
                'premium': process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_PREMIUM || 'prod_TlY6cXhNYaQUes',
                'pro': process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_PRO || 'prod_TlY8yT0bZWyK7x'
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

    const formatPrice = (usdPrice) => {
        if (usdPrice === 0) return 'Free';
        const { rate, symbol } = RATES[currency] || RATES['USD'];
        const converted = usdPrice * rate;

        // Format differently based on currency magnitude
        const formatted = currency === 'JPY' ? Math.round(converted) : converted.toFixed(2);
        return `${symbol}${formatted}`;
    };

    return (
        <div className={`${styles.overlay} ${isOpen ? styles.open : ''}`} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>×</button>

                <header className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Unlock Your Learning Potential</h2>
                        <p className={styles.subtitle}>Choose the plan that fits your learning journey.</p>
                    </div>
                    <div className={styles.currencySelector}>
                        <label htmlFor="currency">Currency:</label>
                        <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className={styles.currencySelect}
                        >
                            {Object.keys(RATES).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </header>

                <div className={styles.plansContainer}>
                    {/* Free Plan */}
                    <div className={styles.planCard}>
                        <h3 className={styles.planName}>Free</h3>
                        <div className={styles.planPrice}>{formatPrice(0)}</div>
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
                        <div className={styles.planPrice}>{formatPrice(7.99)}<span className={styles.period}>/mo</span></div>
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
                        <div className={styles.planPrice}>{formatPrice(19.99)}<span className={styles.period}>/mo</span></div>
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
                    * Prices are approximate conversions. Billed in USD. Secure payments via Stripe. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
