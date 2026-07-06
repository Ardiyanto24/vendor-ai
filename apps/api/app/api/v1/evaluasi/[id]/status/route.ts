import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// PATCH /api/v1/evaluasi/:id/status
//
// Satu-satunya transisi yang didukung: 'selesai' -> 'menunggu_approval',
// dipicu staff via tombol "Kirim ke Manager" di P-05. Manager tidak
// menggunakan endpoint ini — keputusan manager lewat POST .../approval.
// ---------------------------------------------------------------------------
export async function PATCH(
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

    // Aksi ini staff-only — manager mengambil keputusan lewat endpoint approval terpisah
    if (role === 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Manager tidak dapat mengirim evaluasi ke approval' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    const { id: evaluasiId } = params;

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

    if (evaluasi.created_by !== userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke evaluasi ini.' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    if (evaluasi.status !== 'selesai') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_PENDING_APPROVAL', message: 'Evaluasi hanya bisa dikirim ke approval setelah statusnya selesai' } },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('evaluasi')
      .update({ status: 'menunggu_approval' })
      .eq('id', evaluasiId)
      .select('id, judul, kategori, deskripsi, status, budget_min, budget_max, deadline, prioritas_kriteria, lampiran_url, preferensi_perusahaan, created_by, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      console.error('Error updating evaluasi status:', updateError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengubah status evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in PATCH /evaluasi/:id/status:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
