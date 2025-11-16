import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './src/lib/auth/jwt';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/home', '/', '/topics', '/p', '/t', '/search', '/trending'];
// API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
  '/api/posts',
  '/api/topics',
  '/api/ai/generate-post', // Allow AI generation (can be restricted later)
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/') && publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for access token in cookies
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    // Redirect to login if no token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    verifyAccessToken(accessToken);
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

