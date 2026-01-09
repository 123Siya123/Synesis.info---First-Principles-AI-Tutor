import './globals.css'

export const metadata = {
    title: 'Learning App - Deep Understanding Through First Principles',
    description: 'A minimalist learning application focused on deep first-principles understanding',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
