import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// GET /api/v1/evaluasi/:id/hasil
//
// F-11: hasil_evaluasi dan hasil_vendor ditulis langsung ke Supabase oleh
// FastAPI scoring engine (service role, sama seperti pola agent_progress di
// F-10) — bukan dibaca ulang lewat panggilan live ke FastAPI setiap request.
// Endpoint ini query Supabase langsung, konsisten dengan endpoint lain di BFF
// ini (GET /evaluasi/:id, dst).
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

    const { id: evaluasiId } = params;

    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, created_by')
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

    const { data: hasilEvaluasi, error: hasilError } = await supabase
      .from('hasil_evaluasi')
      .select(
        'id, evaluasi_id, metodologi, vendor_rekomendasi_id, reasoning_utama, kelemahan_utama, rekomendasi_negosiasi, summary_komparatif_kualitatif, preference_matching_result, conflict_callout, konfigurasi_snapshot, ada_data_tidak_lengkap, agent_gagal, calculated_at'
      )
      .eq('evaluasi_id', evaluasiId)
      .is('deleted_at', null)
      .maybeSingle();

    if (hasilError) {
      console.error('Error fetching hasil_evaluasi:', hasilError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil hasil evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    if (!hasilEvaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'HASIL_NOT_FOUND', message: 'Hasil evaluasi belum tersedia. Proses AI mungkin belum selesai.' } },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const { data: hasilVendorRows, error: hasilVendorError } = await supabase
      .from('hasil_vendor')
      .select(
        'id, hasil_evaluasi_id, vendor_id, rank, skor_total, skor_per_kriteria, catatan_per_kriteria, lolos_threshold, unique_offerings, profil_kualitatif, tingkat_kesesuaian_preferensi'
      )
      .eq('hasil_evaluasi_id', hasilEvaluasi.id)
      .is('deleted_at', null)
      .order('rank', { ascending: true });

    if (hasilVendorError) {
      console.error('Error fetching hasil_vendor:', hasilVendorError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil skor vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // Ambil nama vendor secara terpisah (bukan embedded join) — konsisten dengan
    // gaya query lain di BFF ini yang menghindari sintaks embedding PostgREST.
    const vendorIds = Array.from(
      new Set([hasilEvaluasi.vendor_rekomendasi_id, ...(hasilVendorRows ?? []).map(v => v.vendor_id)])
    );

    const { data: vendorRows, error: vendorError } = await supabase
      .from('vendor')
      .select('id, nama_perusahaan')
      .in('id', vendorIds);

    if (vendorError) {
      console.error('Error fetching vendor names for hasil:', vendorError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil data vendor' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const vendorNameById = new Map((vendorRows ?? []).map(v => [v.id, v.nama_perusahaan]));
    const konfigurasiSnapshot = hasilEvaluasi.konfigurasi_snapshot as { kriteria?: unknown } | null;

    const data = {
      id:                              hasilEvaluasi.id,
      evaluasi_id:                     hasilEvaluasi.evaluasi_id,
      metodologi:                      hasilEvaluasi.metodologi,
      vendor_rekomendasi_id:           hasilEvaluasi.vendor_rekomendasi_id,
      vendor_rekomendasi_nama:         vendorNameById.get(hasilEvaluasi.vendor_rekomendasi_id) ?? '—',
      reasoning_utama:                 hasilEvaluasi.reasoning_utama,
      kelemahan_utama:                 hasilEvaluasi.kelemahan_utama,
      rekomendasi_negosiasi:           hasilEvaluasi.rekomendasi_negosiasi,
      summary_komparatif_kualitatif:   hasilEvaluasi.summary_komparatif_kualitatif,
      preference_matching_result:      hasilEvaluasi.preference_matching_result,
      conflict_callout:                hasilEvaluasi.conflict_callout,
      ada_data_tidak_lengkap:          hasilEvaluasi.ada_data_tidak_lengkap,
      agent_gagal:                     hasilEvaluasi.agent_gagal,
      calculated_at:                   hasilEvaluasi.calculated_at,
      kriteria:                        konfigurasiSnapshot?.kriteria ?? [],
      vendors: (hasilVendorRows ?? []).map(v => ({
        id:                             v.id,
        hasil_evaluasi_id:              v.hasil_evaluasi_id,
        vendor_id:                      v.vendor_id,
        vendor_nama:                    vendorNameById.get(v.vendor_id) ?? '—',
        rank:                           v.rank,
        skor_total:                     v.skor_total,
        skor_per_kriteria:              v.skor_per_kriteria,
        catatan_per_kriteria:           v.catatan_per_kriteria,
        lolos_threshold:                v.lolos_threshold,
        unique_offerings:               v.unique_offerings,
        profil_kualitatif:              v.profil_kualitatif,
        tingkat_kesesuaian_preferensi:  v.tingkat_kesesuaian_preferensi,
      })),
    };

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in GET /evaluasi/:id/hasil:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
