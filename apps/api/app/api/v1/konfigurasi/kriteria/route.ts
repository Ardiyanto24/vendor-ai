import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { supabase, createSupabaseUserClient } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const VALID_KATEGORI = [
  'it_hardware',
  'it_software',
  'jasa_it',
  'jasa_konsultasi',
  'alat_tulis_kantor',
] as const;

type KategoriPengadaan = (typeof VALID_KATEGORI)[number];

const kriteriaItemSchema = z.object({
  key:           z.string().min(1),
  label:         z.string().min(1),
  bobot:         z.number().int().min(0).max(100),
  threshold_min: z.number().int().min(0).max(100),
});

const putBodySchema = z.object({
  kategori: z.enum(VALID_KATEGORI),
  kriteria: z.array(kriteriaItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// Cached DB fetch — keyed and tagged per kategori, TTL 10 menit
// ---------------------------------------------------------------------------
function fetchKonfigurasi(kategori: KategoriPengadaan, token: string) {
  return unstable_cache(
    async () => {
      const client = createSupabaseUserClient(token);
      const { data, error } = await client
        .from('konfigurasi_kriteria')
        .select('id, kategori, kriteria, updated_by, updated_at')
        .eq('kategori', kategori)
        .is('deleted_at', null)
        .single();

      if (error || !data) return null;
      return data;
    },
    [`konfigurasi-kriteria-${kategori}`],
    {
      tags:       [`konfigurasi-kriteria-${kategori}`],
      revalidate: 600, // 10 menit
    }
  )();
}

// ---------------------------------------------------------------------------
// GET /api/v1/konfigurasi/kriteria?kategori=X
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

    const { searchParams } = new URL(request.url);
    const rawKategori = searchParams.get('kategori');

    if (!rawKategori || !(VALID_KATEGORI as readonly string[]).includes(rawKategori)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: `Parameter 'kategori' wajib diisi dengan salah satu nilai: ${VALID_KATEGORI.join(', ')}`,
          },
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const kategori = rawKategori as KategoriPengadaan;
    const data = await fetchKonfigurasi(kategori, token);

    if (!data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Konfigurasi kriteria tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in GET /konfigurasi/kriteria:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/v1/konfigurasi/kriteria  (Manager only)
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const role   = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // Defense-in-depth: re-check role in handler, not only in middleware
    if (role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Perlu hak akses manager.' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    const body   = await request.json();
    const parsed = putBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: 'Input tidak valid',
            details: parsed.error.format(),
          },
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { kategori, kriteria } = parsed.data;

    // Validate total bobot = 100
    const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);
    if (totalBobot !== 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'INVALID_WEIGHT_TOTAL',
            message: `Total bobot harus tepat 100. Saat ini: ${totalBobot}`,
          },
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Use service role client for UPSERT — RLS only has UPDATE policy (no INSERT).
    // Role is verified above; service role is used only to allow UPSERT safely.
    const { data, error } = await supabase
      .from('konfigurasi_kriteria')
      .upsert(
        {
          kategori,
          kriteria,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'kategori' }
      )
      .select('id, kategori, kriteria, updated_by, updated_at')
      .single();

    if (error || !data) {
      console.error('Error upserting konfigurasi_kriteria:', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menyimpan konfigurasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // Invalidate cache for this kategori so next GET hits the DB
    revalidateTag(`konfigurasi-kriteria-${kategori}`);

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in PUT /konfigurasi/kriteria:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
