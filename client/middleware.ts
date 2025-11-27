import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/register', '/verify-otp'];

    // Authentication routes - redirect to landing if already logged in
    const authRoutes = ['/login', '/register', '/verify-otp'];

    if (publicRoutes.includes(pathname)) {
        // Allow access to public routes
        if (authRoutes.includes(pathname) && token) {
            // If user is already authenticated, redirect to dashboard (not landing page to avoid loop)
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // All other routes require authentication
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
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
