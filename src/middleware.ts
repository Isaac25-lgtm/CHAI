import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

// Use Edge-safe config (no db/bcrypt imports)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth-related routes without authentication
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protect dashboard routes - redirect to login if not authenticated
  if (!req.auth) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/overview/:path*',
    '/live-submissions/:path*',
    '/assessment-analytics/:path*',
    '/facilities/:path*',
    '/visits/:path*',
    '/assessments/:path*',
    '/actions/:path*',
    '/users/:path*',
    '/names-registry/:path*',
    '/payments/:path*',
    '/data-quality/:path*',
    '/downloads/:path*',
    '/audit-logs/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
};
