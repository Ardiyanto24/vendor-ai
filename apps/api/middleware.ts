import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function corsResponse(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const origin = request.headers.get('origin') || 'http://localhost:3000';

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role, x-user-token',
      },
    });
  }

  // 1. Exclude public and auth endpoints
  if (
    path.startsWith('/api/health') ||
    path.startsWith('/api/v1/auth')
  ) {
    return corsResponse(NextResponse.next(), origin);
  }

  // 2. Read token from cookie or Authorization header
  let token = request.cookies.get('sb-access-token')?.value;
  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return corsResponse(NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autentikasi diperlukan',
        },
      },
      {
        status: 401,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    ), origin);
  }

  // 3. Verify token with Supabase Auth
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return corsResponse(NextResponse.json(
      {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token tidak valid atau kedaluwarsa',
        },
      },
      {
        status: 401,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    ), origin);
  }

  const role = user.user_metadata?.role || 'staff';

  // 4. Guard manager-only routes
  const isManagerOnlyRoute =
    (path.startsWith('/api/v1/konfigurasi') && request.method !== 'GET') ||
    path.endsWith('/approval');

  if (isManagerOnlyRoute && role !== 'manager') {
    return corsResponse(NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Perlu hak akses manager.',
        },
      },
      {
        status: 403,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    ), origin);
  }

  // 5. Forward user info in request headers to API handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-user-token', token); // Also forward the token so handler can construct createSupabaseUserClient

  return corsResponse(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }), origin);
}

export const config = {
  matcher: ['/api/v1/:path*'],
};

