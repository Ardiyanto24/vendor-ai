import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const AGENT_KEYS = [
  'data_collector',
  'financial_analyzer',
  'risk_assessor',
  'performance_scorer',
  'negotiation_assistant',
  'qualitative_analyzer',
  'preference_matcher',
] as const;

const MIN_VENDORS = 2;

// Fire-and-forget to FastAPI. F-06 stub — FastAPI not yet implemented (F-10).
async function triggerFastAPI(evaluasiId: string, payload: unknown): Promise<void> {
  const fastApiUrl = process.env.FASTAPI_BASE_URL;
  if (!fastApiUrl) return;

  try {
    await fetch(`${fastApiUrl}/v1/agent/evaluasi/${evaluasiId}/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000),
    });
  } catch {
    // Expected in F-06 since FastAPI is not yet deployed. Log and continue.
    console.warn(`[submit] FastAPI not reachable for evaluasi ${evaluasiId} — stub mode`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/evaluasi/:id/submit
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

    // Fetch evaluasi with full detail for payload + validation
    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, judul, deskripsi, kategori, status, budget_min, budget_max, deadline, prioritas_kriteria, lampiran_url, preferensi_perusahaan, created_by')
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

    if (evaluasi.status === 'processing') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_SUBMITTED', message: 'Evaluasi sudah pernah disubmit dan sedang diproses' } },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }

    if (evaluasi.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_EDITABLE', message: 'Evaluasi tidak dapat disubmit karena statusnya bukan draft' } },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }

    // Count active vendors
    const { data: vendors, count: vendorCount, error: vendorError } = await supabase
      .from('vendor')
      .select('id, nama_perusahaan, harga_penawaran, catatan, sumber_input', { count: 'exact' })
      .eq('evaluasi_id', evaluasiId)
      .is('deleted_at', null);

    if (vendorError) {
      console.error('Error fetching vendors for submit:', vendorError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal memverifikasi jumlah vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    if ((vendorCount ?? 0) < MIN_VENDORS) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_VENDORS', message: `Evaluasi membutuhkan minimal ${MIN_VENDORS} vendor untuk disubmit` } },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Snapshot konfigurasi kriteria at submit time — changes after submit don't affect this evaluation
    const { data: konfigurasi } = await supabase
      .from('konfigurasi_kriteria')
      .select('kriteria')
      .eq('kategori', evaluasi.kategori)
      .is('deleted_at', null)
      .single();

    // 1. Update evaluasi status to 'processing'
    const { error: updateError } = await supabase
      .from('evaluasi')
      .update({ status: 'processing' })
      .eq('id', evaluasiId);

    if (updateError) {
      console.error('Error updating evaluasi status:', updateError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal memulai proses evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // 2. Insert 7 agent_progress rows (one per agent, status = 'idle')
    const agentRows = AGENT_KEYS.map(key => ({
      evaluasi_id: evaluasiId,
      agent_key:   key,
      status:      'idle' as const,
      progress:    0,
    }));

    const { error: progressError } = await supabase
      .from('agent_progress')
      .insert(agentRows);

    if (progressError) {
      console.error('Error inserting agent_progress rows:', progressError);
      // Rollback evaluasi status to 'draft' to keep state consistent
      await supabase
        .from('evaluasi')
        .update({ status: 'draft' })
        .eq('id', evaluasiId);

      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menginisialisasi proses agent' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // 3. Fire-and-forget FastAPI call — do not await
    const fastApiPayload = {
      evaluasiId,
      judul:                 evaluasi.judul,
      deskripsi:             evaluasi.deskripsi,
      kategori:              evaluasi.kategori,
      budgetMin:             evaluasi.budget_min,
      budgetMax:             evaluasi.budget_max,
      deadline:              evaluasi.deadline,
      preferensiPerusahaan:  evaluasi.preferensi_perusahaan,
      vendors:               (vendors ?? []).map(v => ({
        id:              v.id,
        namaPerusahaan:  v.nama_perusahaan,
        hargaPenawaran:  v.harga_penawaran,
        catatan:         v.catatan,
        sumberInput:     v.sumber_input,
      })),
      konfigurasiKriteria: { kriteria: konfigurasi?.kriteria ?? [] },
    };

    void triggerFastAPI(evaluasiId, fastApiPayload);

    return NextResponse.json(
      {
        success: true,
        data:    { evaluasiId, message: 'Proses evaluasi AI telah dimulai' },
      },
      { status: 202, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in POST /evaluasi/:id/submit:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
