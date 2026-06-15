import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  const path = request.nextUrl.pathname;

  // 1. If not authenticated, redirect to /login
  if (!token) {
    if (path !== '/login') {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2. If authenticated and attempting to visit /login or /, redirect to /dashboard
  if (path === '/login' || path === '/') {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  // 3. Decode token to check role-based permissions
  const payload = decodeJwt(token);
  const role = payload?.user_metadata?.role || 'staff';

  // Role-based protection:
  // If staff accesses manager-restricted routes, redirect to /dashboard
  const isManagerOnly = path.startsWith('/approval') || path.startsWith('/settings');
  if (isManagerOnly && role !== 'manager') {
    const url = new URL('/dashboard', request.url);
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
