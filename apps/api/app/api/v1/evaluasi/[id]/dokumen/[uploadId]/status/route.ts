import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// GET /api/v1/evaluasi/:id/dokumen/:uploadId/status
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { id: string; uploadId: string } },
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role   = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    const { id: evaluasiId, uploadId } = params;

    // Verify evaluasi ownership
    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, created_by')
      .eq('id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (evalError || !evaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS },
      );
    }

    if (evaluasi.created_by !== userId && role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke evaluasi ini.' } },
        { status: 403, headers: SECURITY_HEADERS },
      );
    }

    // Fetch dokumen_upload status — written by FastAPI via service role key
    const { data: dokumen, error: dokumenError } = await supabase
      .from('dokumen_upload')
      .select('id, status_ekstraksi, hasil_ekstraksi, confidence_score, indexing_rag_status, chunk_count, updated_at')
      .eq('id', uploadId)
      .eq('evaluasi_id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (dokumenError || !dokumen) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dokumen tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          uploadId:           dokumen.id,
          status:             dokumen.status_ekstraksi,
          hasilEkstraksi:     dokumen.hasil_ekstraksi ?? null,
          confidenceScore:    dokumen.confidence_score ?? null,
          indexingRagStatus:  dokumen.indexing_rag_status ?? null,
          chunkCount:         dokumen.chunk_count ?? null,
          updatedAt:          dokumen.updated_at,
        },
      },
      { status: 200, headers: SECURITY_HEADERS },
    );

  } catch (err) {
    console.error('Error in GET /evaluasi/:id/dokumen/:uploadId/status:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS },
    );
  }
}
