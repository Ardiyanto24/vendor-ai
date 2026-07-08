import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const MAX_VENDORS = 10;

const postBodySchema = z.object({
  namaPerusahaan:    z.string().min(1).max(255),
  kontakAtauWebsite: z.string().optional().nullable(),
  hargaPenawaran:    z.number().int().positive(),
  catatan:           z.string().optional().nullable(),
  sumberInput:       z.enum(['manual', 'extracted']),
});

// ---------------------------------------------------------------------------
// POST /api/v1/evaluasi/:id/vendor
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role   = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    const { id: evaluasiId } = params;

    // Fetch evaluasi — use service role to distinguish 404 vs 403
    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, created_by, status')
      .eq('id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (evalError || !evaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    if (evaluasi.created_by !== userId && role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke evaluasi ini.' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    if (evaluasi.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_EDITABLE', message: 'Evaluasi tidak dapat diedit karena statusnya bukan draft' } },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }

    // Count active vendors
    const { count, error: countError } = await supabase
      .from('vendor')
      .select('*', { count: 'exact', head: true })
      .eq('evaluasi_id', evaluasiId)
      .is('deleted_at', null);

    if (countError) {
      console.error('Error counting vendors:', countError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menghitung jumlah vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    if ((count ?? 0) >= MAX_VENDORS) {
      return NextResponse.json(
        { success: false, error: { code: 'VENDOR_LIMIT_EXCEEDED', message: `Evaluasi sudah mencapai batas maksimum ${MAX_VENDORS} vendor` } },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const body   = await request.json();
    const parsed = postBodySchema.safeParse(body);

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

    const { namaPerusahaan, kontakAtauWebsite, hargaPenawaran, catatan, sumberInput } = parsed.data;

    const { data: vendor, error: insertError } = await supabase
      .from('vendor')
      .insert({
        evaluasi_id:        evaluasiId,
        nama_perusahaan:    namaPerusahaan,
        kontak_atau_website: kontakAtauWebsite ?? null,
        harga_penawaran:    hargaPenawaran,
        catatan:            catatan ?? null,
        sumber_input:       sumberInput,
      })
      .select('id, evaluasi_id, nama_perusahaan, kontak_atau_website, harga_penawaran, catatan, sumber_input, created_at, updated_at')
      .single();

    if (insertError || !vendor) {
      console.error('Error inserting vendor:', insertError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menambahkan vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: vendor },
      { status: 201, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in POST /evaluasi/:id/vendor:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
