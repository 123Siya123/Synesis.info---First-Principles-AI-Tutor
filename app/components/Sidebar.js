
import { useRef } from 'react';
import styles from './Sidebar.module.css';
import { BookOpen, Clock, LogOut, User, Trash2, Sparkles, History } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, user, studies, onSelect, onLogout, onDelete, subscriptionTier, onOpenSubscription, onViewHistory }) {
    const sidebarRef = useRef(null);

    // Close on click outside (already handled by overlay in CSS structure generally, but here checking explicitly if needed)
    // Actually the parent handles overlay click usually, but here I'm putting overlay inside component?
    // In CSS I had .overlay and .sidebar.
    // I'll structure it so the overlay is part of this component.

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                onClick={onClose}
            />
            <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Library</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <ul className={styles.list}>
                    {studies && studies.length > 0 ? (
                        studies.map((study) => (
                            <li key={study.id} className={styles.listItem}>
                                <button
                                    className={styles.itemBtn}
                                    onClick={() => {
                                        onSelect(study);
                                        onClose();
                                    }}
                                >
                                    <span className={styles.topicName}>
                                        <BookOpen size={16} className={styles.itemIcon} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                                        {study.topic}
                                    </span>
                                    <span className={styles.topicDate}>
                                        <Clock size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                                        {formatDate(study.updated_at)}
                                    </span>
                                    {onDelete && (
                                        <div className={styles.itemActions}>
                                            {onViewHistory && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewHistory(study);
                                                    }}
                                                    className={styles.actionIcon}
                                                    title="View History"
                                                >
                                                    <History size={16} />
                                                </div>
                                            )}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Delete this study?')) onDelete(study.id);
                                                }}
                                                className={styles.actionIcon}
                                                style={{ color: '#ef4444' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            </li>
                        ))
                    ) : (
                        <li style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                            {user ? 'No studies yet. Start learning!' : 'Log in to save your progress.'}
                        </li>
                    )}
                </ul>

                <div className={styles.footer}>
                    {user ? (
                        <>
                            {subscriptionTier === 'free' && (
                                <button
                                    onClick={onOpenSubscription}
                                    style={{
                                        width: '100%',
                                        marginBottom: '1rem',
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                    }}
                                >
                                    <Sparkles size={18} /> Upgrade Plan
                                </button>
                            )}
                            <div className={styles.userInfo}>
                                <div className={styles.avatar}>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <span className={styles.userEmail} title={user.email}>{user.email}</span>
                            </div>
                            <div className={styles.actions}>
                                <button onClick={onLogout} className={`${styles.actionBtn} ${styles.logoutBtn}`}>
                                    <LogOut size={16} /> Log Out
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={onLogout} className={`${styles.actionBtn} ${styles.loginBtn}`}>
                            <User size={16} /> Log In / Sign Up
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
