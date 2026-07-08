import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const STATUSES = [
  'draft',
  'processing',
  'selesai',
  'menunggu_approval',
  'approved',
  'butuh_revisi',
] as const;

// ---------------------------------------------------------------------------
// GET /api/v1/evaluasi/summary
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const token  = request.headers.get('x-user-token');
    const userId = request.headers.get('x-user-id');

    if (!token || !userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // Use user-scoped client — RLS enforces staff only counts own evaluasi
    const userClient = createSupabaseUserClient(token);

    // Run parallel count queries for each status
    const results = await Promise.all(
      STATUSES.map(status =>
        userClient
          .from('evaluasi')
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
          .is('deleted_at', null)
      )
    );

    const hasError = results.some(r => r.error);
    if (hasError) {
      const firstError = results.find(r => r.error)?.error;
      console.error('Error fetching evaluasi summary:', firstError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil ringkasan evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const summary = Object.fromEntries(
      STATUSES.map((status, i) => [status, results[i].count ?? 0])
    ) as Record<typeof STATUSES[number], number>;

    return NextResponse.json(
      { success: true, data: summary },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in GET /evaluasi/summary:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
