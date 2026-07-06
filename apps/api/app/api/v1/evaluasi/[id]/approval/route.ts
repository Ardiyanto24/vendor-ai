import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const bodySchema = z.object({
  keputusan: z.enum(['approved', 'rejected']),
  komentar:  z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// POST /api/v1/evaluasi/:id/approval
//
// Manager only — middleware.ts sudah memblokir role bukan manager untuk path
// yang berakhiran '/approval'; role dicek ulang di sini sebagai defense in
// depth (BE-03 section 5.2).
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

    if (role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Perlu hak akses manager.' } },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    const body   = await request.json();
    const parsed = bodySchema.safeParse(body);

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

    const { keputusan, komentar } = parsed.data;

    if (keputusan === 'rejected' && (!komentar || komentar.trim() === '')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Komentar wajib diisi saat menolak evaluasi' } },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { id: evaluasiId } = params;

    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, status')
      .eq('id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (evalError || !evaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    if (evaluasi.status !== 'menunggu_approval') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_PENDING_APPROVAL', message: 'Evaluasi tidak dalam status menunggu approval' } },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }

    // 1. Catat keputusan di approval_log (riwayat immutable)
    const { data: logRow, error: logError } = await supabase
      .from('approval_log')
      .insert({
        evaluasi_id: evaluasiId,
        manager_id:  userId,
        keputusan,
        komentar:    komentar ?? null,
      })
      .select('id')
      .single();

    if (logError || !logRow) {
      console.error('Error creating approval_log:', logError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mencatat keputusan approval' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // 2. Update status evaluasi sesuai keputusan
    const newStatus = keputusan === 'approved' ? 'approved' : 'butuh_revisi';

    const { data: updated, error: updateError } = await supabase
      .from('evaluasi')
      .update({ status: newStatus })
      .eq('id', evaluasiId)
      .select('id, judul, kategori, deskripsi, status, budget_min, budget_max, deadline, prioritas_kriteria, lampiran_url, preferensi_perusahaan, created_by, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      console.error('Error updating evaluasi status after approval:', updateError);
      // Rollback approval_log agar tidak ada jejak keputusan tanpa efek status
      await supabase.from('approval_log').delete().eq('id', logRow.id);

      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal memperbarui status evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in POST /evaluasi/:id/approval:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
