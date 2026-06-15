import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const token = request.headers.get('x-user-token');

    if (!userId || !token) {
      return NextResponse.json(
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
      );
    }

    // Create user-scoped client to enforce RLS at DB level
    const userClient = createSupabaseUserClient(token);

    const { data: dbUser, error: dbError } = await userClient
      .from('user')
      .select('id, nama, email, role, avatar_url')
      .eq('id', userId)
      .single();

    if (dbError || !dbUser) {
      console.error('Error fetching user profile via RLS:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Profil pengguna tidak ditemukan atau akses ditolak',
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

    return NextResponse.json(
      {
        success: true,
        data: {
          id: dbUser.id,
          nama: dbUser.nama,
          email: dbUser.email,
          role: dbUser.role,
          avatarUrl: dbUser.avatar_url,
        },
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

  } catch (err) {
    console.error('Error in GET /users/me:', err);
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
