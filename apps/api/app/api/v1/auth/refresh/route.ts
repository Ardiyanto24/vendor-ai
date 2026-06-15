import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 1. Read refresh token from cookie
    const cookiesHeader = request.headers.get('cookie') || '';
    let refreshToken = '';
    const match = cookiesHeader.match(/sb-refresh-token=([^;]+)/);
    if (match) {
      refreshToken = match[1];
    }

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token tidak ditemukan',
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
      );
    }

    // 2. Call Supabase Auth to refresh session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (refreshError || !refreshData.session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token tidak valid atau kedaluwarsa',
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
      );
    }

    const { session } = refreshData;

    // 3. Build response and update cookies
    const responseBody = {
      success: true,
      data: {
        accessToken: session.access_token,
      },
    };

    const response = NextResponse.json(responseBody, {
      status: 200,
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
      },
    });

    // Set updated cookie tokens
    response.cookies.set('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600, // 1 hour
    });

    response.cookies.set('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 3600, // 7 days
    });

    return response;

  } catch (err) {
    console.error('Refresh token error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Terjadi kesalahan internal saat refresh token',
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
