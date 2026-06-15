import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// DELETE /api/v1/evaluasi/:id/vendor/:vendorId  (soft delete)
// ---------------------------------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; vendorId: string } }
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

    const { id: evaluasiId, vendorId } = params;

    // Verify evaluasi exists and is accessible
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

    // Verify vendor belongs to this evaluasi
    const { data: vendor, error: vendorError } = await supabase
      .from('vendor')
      .select('id, evaluasi_id')
      .eq('id', vendorId)
      .eq('evaluasi_id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { success: false, error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('vendor')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', vendorId);

    if (deleteError) {
      console.error('Error soft-deleting vendor:', deleteError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menghapus vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });

  } catch (err) {
    console.error('Error in DELETE /evaluasi/:id/vendor/:vendorId:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
