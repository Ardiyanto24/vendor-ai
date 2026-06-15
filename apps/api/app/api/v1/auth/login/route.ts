import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  limit.count++;
  return limit.count <= 5;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  // 1. Rate Limit Check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        },
      },
      {
        status: 429,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    );
  }

  // 2. Parse and Validate Body
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input tidak valid',
            details: result.error.format(),
          },
        },
        {
          status: 400,
          headers: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
          },
        }
      );
    }

    const { email, password } = result.data;

    // 3. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau password salah',
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

    const { session, user } = authData;

    // 4. Fetch User Details from public.user table
    const { data: dbUser, error: dbError } = await supabase
      .from('user')
      .select('id, nama, email, role, avatar_url')
      .eq('id', user.id)
      .is('deleted_at', null) // filter soft deletes if any
      .single();

    if (dbError || !dbUser) {
      console.error('User profile not found in public.user:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Profil pengguna tidak ditemukan di database.',
          },
        },
        {
          status: 404,
          headers: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
          },
        }
      );
    }

    // 5. Build Response & Set Cookies
    const responseBody = {
      success: true,
      data: {
        accessToken: session.access_token,
        user: {
          id: dbUser.id,
          nama: dbUser.nama,
          email: dbUser.email,
          role: dbUser.role,
          avatarUrl: dbUser.avatar_url,
        },
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

    // Set cookie tokens
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
    console.error('Unhandled login error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Terjadi kesalahan internal pada server',
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
