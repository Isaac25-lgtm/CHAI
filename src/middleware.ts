import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth-related routes without authentication
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protect all matched routes - redirect to login if not authenticated
  if (!req.auth) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = req.auth.user?.role;

  // Role-based routing: assessors hitting admin-only pages get redirected to field home
  const adminOnlyPaths = [
    '/overview',
    '/live-submissions',
    '/assessment-analytics',
    '/users',
    '/data-quality',
    '/downloads',
    '/audit-logs',
    '/settings',
  ];

  if (role === 'FIELD_ASSESSOR' && adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/field', req.nextUrl.origin));
  }

  // Superusers hitting /field get redirected to admin overview
  if (
    (role === 'SUPER_ADMIN' || role === 'NATIONAL_ADMIN') &&
    pathname.startsWith('/field')
  ) {
    return NextResponse.redirect(new URL('/overview', req.nextUrl.origin));
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
    '/field/:path*',
    '/auth/:path*',
  ],
};
