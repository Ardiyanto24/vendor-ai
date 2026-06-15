import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// GET /api/v1/evaluasi/:id
// ---------------------------------------------------------------------------
export async function GET(
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

    const { id } = params;

    // Use service role so we can distinguish 404 (not found) from 403 (forbidden)
    const { data: evaluasi, error } = await supabase
      .from('evaluasi')
      .select('id, judul, kategori, deskripsi, status, budget_min, budget_max, deadline, prioritas_kriteria, lampiran_url, preferensi_perusahaan, created_by, created_at, updated_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !evaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Resource-level auth: return 403 (not 404) when staff accesses someone else's evaluasi
    if (evaluasi.created_by !== userId && role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke evaluasi ini.' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // Fetch active vendors for this evaluasi
    const { data: vendors, error: vendorError } = await supabase
      .from('vendor')
      .select('id, evaluasi_id, nama_perusahaan, kontak_atau_website, harga_penawaran, catatan, sumber_input, created_at, updated_at')
      .eq('evaluasi_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (vendorError) {
      console.error('Error fetching vendors:', vendorError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil data vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: { ...evaluasi, vendors: vendors ?? [] } },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in GET /evaluasi/:id:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
