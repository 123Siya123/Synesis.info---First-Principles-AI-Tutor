'use client';

import React from 'react';

/**
 * React Error Boundary component
 * Catches JavaScript errors in the component tree and displays a fallback UI
 * instead of crashing the entire application
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console for debugging
        console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // You could also log to an error reporting service here
        // e.g., Sentry, LogRocket, etc.
    }

    handleReload = () => {
        // Clear the error state and reload the page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleRetry = () => {
        // Just clear the error state to retry rendering
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI when an error occurs
            return (
                <div style={styles.container}>
                    <div style={styles.content}>
                        <div style={styles.iconContainer}>
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={styles.icon}
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h1 style={styles.title}>Something went wrong</h1>
                        <p style={styles.message}>
                            Don't worry, your work is saved locally. Try refreshing the page.
                        </p>
                        <div style={styles.buttonGroup}>
                            <button onClick={this.handleRetry} style={styles.retryButton}>
                                Try Again
                            </button>
                            <button onClick={this.handleReload} style={styles.reloadButton}>
                                Refresh Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={styles.details}>
                                <summary style={styles.summary}>Error Details (Dev Only)</summary>
                                <pre style={styles.errorText}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Inline styles for the error boundary (no external CSS needed)
const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    content: {
        textAlign: 'center',
        maxWidth: '400px'
    },
    iconContainer: {
        marginBottom: '24px'
    },
    icon: {
        color: '#ef4444'
    },
    title: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '12px',
        margin: '0 0 12px 0'
    },
    message: {
        fontSize: '16px',
        color: '#64748b',
        marginBottom: '24px',
        lineHeight: '1.5'
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    retryButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#3b82f6',
        backgroundColor: 'white',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    reloadButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        color: 'white',
        backgroundColor: '#3b82f6',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    details: {
        marginTop: '24px',
        textAlign: 'left'
    },
    summary: {
        cursor: 'pointer',
        color: '#64748b',
        fontSize: '12px'
    },
    errorText: {
        marginTop: '8px',
        padding: '12px',
        backgroundColor: '#fee2e2',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#991b1b',
        overflow: 'auto',
        maxHeight: '200px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
    }
};

export default ErrorBoundary;
