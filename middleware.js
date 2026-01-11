
import { NextResponse } from 'next/server';

export function middleware(request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    // The domain you want to force users to use
    // Set this in your Render Environment Variables, e.g., "www.example.com"
    const allowedDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN;

    // Check if we need to redirect
    if (allowedDomain && host !== allowedDomain && !host.includes('localhost')) {
        const url = request.nextUrl.clone();
        url.host = allowedDomain;
        url.protocol = 'https'; // Force HTTPS on custom domain
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
