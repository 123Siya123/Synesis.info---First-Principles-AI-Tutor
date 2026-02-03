'use client';

import './globals.css'
import ErrorBoundary from './components/ErrorBoundary';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <title>Study less. Understand more. The method that actually works.</title>
                <meta name="description" content="A minimalist learning application focused on deep first-principles understanding" />
            </head>
            <body>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </body>
        </html>
    )
}
