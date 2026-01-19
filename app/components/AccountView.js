
import { useState, useEffect } from 'react';
import styles from './AccountView.module.css';
import { User, Trash2, Clock, BookOpen, AlertCircle, ChevronLeft, RefreshCw, Timer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AccountView({ user, studies, onBack, onDeleteStudy, onLogout, subscriptionTier, monthlyArticleCount, onOpenSubscription, onRefreshProfile }) {
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [newName, setNewName] = useState(user?.user_metadata?.full_name || '');
    const [stats, setStats] = useState({ totalTime: 0, topicCount: 0 });

    // Pomodoro local state
    const [pomoEnabled, setPomoEnabled] = useState(false);
    const [pomoFocus, setPomoFocus] = useState(25);
    const [pomoBreak, setPomoBreak] = useState(5);
    const [pomoReps, setPomoReps] = useState(4);
    const [isSavingPomo, setIsSavingPomo] = useState(false);

    useEffect(() => {
        const fetchPomoSettings = async () => {
            const { data } = await supabase.from('profiles').select('pomodoro_enabled, pomodoro_focus_duration, pomodoro_break_duration, pomodoro_repetitions').eq('id', user.id).single();
            if (data) {
                setPomoEnabled(data.pomodoro_enabled);
                setPomoFocus(data.pomodoro_focus_duration);
                setPomoBreak(data.pomodoro_break_duration);
                setPomoReps(data.pomodoro_repetitions);
            }
        };
        if (user) fetchPomoSettings();
    }, [user]);

    const handleSavePomo = async () => {
        setIsSavingPomo(true);
        try {
            const { error } = await supabase.from('profiles').update({
                pomodoro_enabled: pomoEnabled,
                pomodoro_focus_duration: pomoFocus,
                pomodoro_break_duration: pomoBreak,
                pomodoro_repetitions: pomoReps
            }).eq('id', user.id);
            if (error) throw error;
            if (onRefreshProfile) onRefreshProfile();
            alert('Settings saved!');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSavingPomo(false);
        }
    };

    useEffect(() => {
        // Also refresh on mount to be sure
        if (onRefreshProfile) onRefreshProfile();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefreshProfile) await onRefreshProfile();
        // Fake delay to show spinner interaction
        await new Promise(r => setTimeout(r, 500));
        setIsRefreshing(false);
    };

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

    const handleManageSubscription = async () => {
        try {
            const response = await fetch('/api/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, returnUrl: window.location.href })
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to redirect to billing portal.');
            }
        } catch (err) {
            console.error(err);
            alert('Error accessing billing settings.');
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm('ARE YOU ABSOLUTELY SURE? This will delete your account and all your progress permanently. This cannot be undone.')) {
            setIsDeletingAccount(true);
            try {
                // Call our protected API route
                const response = await fetch('/api/user/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to delete account');
                }

                await onLogout();
                alert('Account deleted successfully.');
            } catch (err) {
                console.error('Error deleting account:', err);
                alert(`Error: ${err.message}`);
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
                                    <button onClick={handleRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', padding: 0 }} title="Refresh Subscription Status">
                                        <RefreshCw size={14} className={isRefreshing ? styles.spin : ''} color="#64748b" />
                                    </button>
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
                            {subscriptionTier !== 'free' && (
                                <button
                                    onClick={handleManageSubscription}
                                    style={{
                                        background: '#fff',
                                        color: '#64748b',
                                        border: '1px solid #cbd5e1',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginLeft: '0.5rem'
                                    }}
                                >
                                    Manage
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

                {/* Pomodoro Settings */}
                <div className={styles.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Timer className={styles.iconBlue} />
                        <h2 className={styles.cardTitle} style={{ margin: 0 }}>Study Timer (Pomodoro)</h2>
                    </div>

                    <div className={styles.pomoSettings}>
                        <label className={styles.settingRow}>
                            <span>Enable Timer</span>
                            <div className={styles.toggle_switch}>
                                <input
                                    type="checkbox"
                                    checked={pomoEnabled}
                                    onChange={(e) => setPomoEnabled(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </div>
                        </label>

                        {pomoEnabled && (
                            <div className={styles.pomoInputs}>
                                <div className={styles.inputField}>
                                    <label>Focus (min)</label>
                                    <input
                                        type="number"
                                        value={pomoFocus}
                                        onChange={(e) => setPomoFocus(parseInt(e.target.value))}
                                        min="1" max="120"
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <label>Break (min)</label>
                                    <input
                                        type="number"
                                        value={pomoBreak}
                                        onChange={(e) => setPomoBreak(parseInt(e.target.value))}
                                        min="1" max="60"
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <label>Sessions</label>
                                    <input
                                        type="number"
                                        value={pomoReps}
                                        onChange={(e) => setPomoReps(parseInt(e.target.value))}
                                        min="1" max="20"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            className={styles.savePomoBtn}
                            onClick={handleSavePomo}
                            disabled={isSavingPomo}
                        >
                            {isSavingPomo ? 'Saving...' : 'Save Timer Settings'}
                        </button>
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
