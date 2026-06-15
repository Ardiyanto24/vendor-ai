import { NextResponse } from 'next/server';
import { supabase, createSupabaseUserClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 1. Get access token from Authorization header or cookie to perform a scoped signOut
    let token = request.headers.get('x-user-token');
    
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      // Fallback: try cookies
      const cookiesHeader = request.headers.get('cookie') || '';
      const match = cookiesHeader.match(/sb-access-token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (token) {
      const userClient = createSupabaseUserClient(token);
      await userClient.auth.signOut();
    } else {
      await supabase.auth.signOut();
    }

    // 2. Build response and clear cookies
    const response = NextResponse.json(
      {
        success: true,
        data: null,
      },
      {
        status: 200,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': "default-src 'self'",
        },
      }
    );

    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;

  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Terjadi kesalahan internal saat logout',
        },
      },
      {
        status: 500,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    );
  }
}
