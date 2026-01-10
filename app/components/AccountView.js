
import { useState, useEffect } from 'react';
import styles from './AccountView.module.css';
import { User, Trash2, Clock, BookOpen, AlertCircle, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AccountView({ user, studies, onBack, onDeleteStudy, onLogout, subscriptionTier, monthlyArticleCount, onOpenSubscription }) {
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user?.user_metadata?.full_name || '');
    const [stats, setStats] = useState({ totalTime: 0, topicCount: 0 });

    useEffect(() => {
        if (studies) {
            const total = studies.reduce((acc, study) => acc + (study.session_data?.studyTime || 0), 0);
            setStats({
                totalTime: total,
                topicCount: studies.length
            });
        }
    }, [studies]);

    const handleUpdateProfile = async () => {
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: newName }
            });
            if (error) throw error;
            setIsEditing(false);
            alert('Profile updated!');
        } catch (err) {
            alert(err.message);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const handleDeleteAccount = async () => {
        if (confirm('ARE YOU ABSOLUTELY SURE? This will delete your account and all your progress permanently. This cannot be undone.')) {
            setIsDeletingAccount(true);
            try {
                // In Supabase, deleting a user from the client side is not directly possible 
                // for the user themselves without a service role or a specific function.
                // Usually we call a database function or an edge function.
                // For now, we will sign out and maybe clear data if possible, 
                // but a real "delete account" needs a backend trigger.
                // We'll simulate it or use a RPC if available.

                // Let's assume we have a 'delete_user_data' function
                const { error } = await supabase.rpc('delete_own_account');

                if (error) {
                    console.error('Error deleting account:', error);
                    alert('Due to security restrictions, please contact support to fully delete your account, or we can just wipe your data.');

                    // Fallback: Delete all studies
                    for (const study of studies) {
                        await onDeleteStudy(study.id);
                    }
                    await onLogout();
                } else {
                    await onLogout();
                    alert('Account deleted successfully.');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsDeletingAccount(false);
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBack} className={styles.backBtn}>
                    <ChevronLeft size={20} /> Back to Learning
                </button>
                <h1 className={styles.title}>Account Settings</h1>
            </div>

            <div className={styles.grid}>
                {/* Profile Card */}
                <div className={styles.card}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatar}>
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" />
                            ) : (
                                <span>{user?.email?.[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className={styles.profileInfo}>
                            {isEditing ? (
                                <div className={styles.editGroup}>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className={styles.editInput}
                                        placeholder="Full Name"
                                        autoFocus
                                    />
                                    <div className={styles.editActions}>
                                        <button onClick={handleUpdateProfile} className={styles.saveBtn}>Save</button>
                                        <button onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.nameRow}>
                                        <h3>{user?.user_metadata?.full_name || 'Student'}</h3>
                                        <button onClick={() => setIsEditing(true)} className={styles.editBtn}>Edit</button>
                                    </div>
                                    <p>{user?.email}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Study Time</span>
                            <span className={styles.statValue}><Clock size={16} /> {formatTime(stats.totalTime)}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Topics Mastered</span>
                            <span className={styles.statValue}><BookOpen size={16} /> {stats.topicCount}</span>
                        </div>
                    </div>

                    {/* Subscription Section inside the card for better layout */}
                    <div className={styles.subscriptionSection} style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <span className={styles.statLabel}>Current Plan</span>
                                <h3 style={{ textTransform: 'capitalize', color: '#1e293b' }}>
                                    {subscriptionTier === 'pro' ? 'Pro 🚀' : subscriptionTier === 'premium' ? 'Premium 🌟' : 'Free 🌱'}
                                </h3>
                            </div>
                            {subscriptionTier !== 'pro' && (
                                <button
                                    onClick={onOpenSubscription}
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>

                        {/* Usage Bars */}
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Article Usage */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#64748b' }}>
                                    <span>Monthly Articles</span>
                                    <span>{monthlyArticleCount} / {subscriptionTier === 'free' ? 20 : subscriptionTier === 'premium' ? 100 : 1000}</span>
                                </div>
                                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${Math.min(100, (monthlyArticleCount / (subscriptionTier === 'free' ? 20 : subscriptionTier === 'premium' ? 100 : 1000)) * 100)}%`,
                                            background: subscriptionTier === 'free' ? '#10b981' : '#3b82f6',
                                            transition: 'width 0.5s ease'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Mind Map Usage */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#64748b' }}>
                                    <span>Mind Maps</span>
                                    <span>{studies ? studies.filter(s => s.session_data?.isPlanMode).length : 0} / {subscriptionTier === 'free' ? 1 : subscriptionTier === 'premium' ? 20 : '∞'}</span>
                                </div>
                                {subscriptionTier !== 'pro' && (
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${Math.min(100, ((studies ? studies.filter(s => s.session_data?.isPlanMode).length : 0) / (subscriptionTier === 'free' ? 1 : 20)) * 100)}%`,
                                                background: subscriptionTier === 'free' ? '#10b981' : '#3b82f6',
                                                transition: 'width 0.5s ease'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Topics Management */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Your Library</h2>
                    <div className={styles.studyList}>
                        {studies && studies.length > 0 ? (
                            studies.map((study) => (
                                <div key={study.id} className={styles.studyItem}>
                                    <div className={styles.studyInfo}>
                                        <span className={styles.studyTopic}>{study.topic}</span>
                                        <span className={styles.studyTime}>
                                            {formatTime(study.session_data?.studyTime || 0)} spent
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => confirm(`Delete "${study.topic}"?`) && onDeleteStudy(study.id)}
                                        className={styles.deleteBtn}
                                        title="Delete Topic"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className={styles.emptyText}>No topics in your library yet.</p>
                        )}
                    </div>
                </div>

                {/* Account Actions */}
                <div className={`${styles.card} ${styles.dangerCard}`}>
                    <h2 className={styles.cardTitle}>Danger Zone</h2>
                    <p className={styles.dangerDesc}>These actions are permanent and cannot be undone.</p>
                    <div className={styles.dangerActions}>
                        <button
                            className={styles.deleteAccountBtn}
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                        >
                            {isDeletingAccount ? 'Processing...' : <><Trash2 size={18} /> Delete Account</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
