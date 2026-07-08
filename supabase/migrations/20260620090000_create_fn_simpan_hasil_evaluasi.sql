-- Migration: create fn_simpan_hasil_evaluasi RPC for atomic scoring write
-- Rollback: DROP FUNCTION IF EXISTS public.fn_simpan_hasil_evaluasi(UUID, JSONB, JSONB);

-- Scoring Engine (vendor-ai-agent, F-11) menulis hasil_evaluasi + hasil_vendor + update
-- evaluasi.status dalam satu transaksi atomik (AI-03 section 13). PostgREST tidak
-- mendukung transaksi lintas tabel dari REST call biasa, jadi ini dibungkus sebagai satu
-- fungsi Postgres — jika ada statement yang gagal di tengah, seluruh fungsi otomatis
-- di-rollback tanpa perlu app-level rollback logic. Pengecualian terhadap larangan
-- stored procedure di DB-03 section 3.2 — didokumentasikan di SH-01 ADR-037: function
-- ini hanya mengoordinasikan penulisan, tidak melakukan kalkulasi atau keputusan bisnis.
CREATE OR REPLACE FUNCTION public.fn_simpan_hasil_evaluasi(
  p_evaluasi_id UUID,
  p_hasil_evaluasi JSONB,
  p_hasil_vendor JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hasil_evaluasi_id UUID;
BEGIN
  INSERT INTO public.hasil_evaluasi (
    evaluasi_id, metodologi, vendor_rekomendasi_id, reasoning_utama, kelemahan_utama,
    rekomendasi_negosiasi, summary_komparatif_kualitatif, preference_matching_result,
    conflict_callout, konfigurasi_snapshot, ada_data_tidak_lengkap, agent_gagal,
    token_usage, calculated_at
  )
  VALUES (
    p_evaluasi_id,
    p_hasil_evaluasi->>'metodologi',
    (p_hasil_evaluasi->>'vendor_rekomendasi_id')::UUID,
    p_hasil_evaluasi->>'reasoning_utama',
    p_hasil_evaluasi->>'kelemahan_utama',
    p_hasil_evaluasi->>'rekomendasi_negosiasi',
    p_hasil_evaluasi->>'summary_komparatif_kualitatif',
    p_hasil_evaluasi->'preference_matching_result',
    p_hasil_evaluasi->'conflict_callout',
    p_hasil_evaluasi->'konfigurasi_snapshot',
    (p_hasil_evaluasi->>'ada_data_tidak_lengkap')::BOOLEAN,
    CASE WHEN p_hasil_evaluasi->'agent_gagal' IS NULL OR p_hasil_evaluasi->'agent_gagal' = 'null'::JSONB
         THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(p_hasil_evaluasi->'agent_gagal'))
    END,
    p_hasil_evaluasi->'token_usage',
    COALESCE((p_hasil_evaluasi->>'calculated_at')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (evaluasi_id) DO UPDATE SET
    metodologi = EXCLUDED.metodologi,
    vendor_rekomendasi_id = EXCLUDED.vendor_rekomendasi_id,
    reasoning_utama = EXCLUDED.reasoning_utama,
    kelemahan_utama = EXCLUDED.kelemahan_utama,
    rekomendasi_negosiasi = EXCLUDED.rekomendasi_negosiasi,
    summary_komparatif_kualitatif = EXCLUDED.summary_komparatif_kualitatif,
    preference_matching_result = EXCLUDED.preference_matching_result,
    conflict_callout = EXCLUDED.conflict_callout,
    konfigurasi_snapshot = EXCLUDED.konfigurasi_snapshot,
    ada_data_tidak_lengkap = EXCLUDED.ada_data_tidak_lengkap,
    agent_gagal = EXCLUDED.agent_gagal,
    token_usage = EXCLUDED.token_usage,
    calculated_at = EXCLUDED.calculated_at
  RETURNING id INTO v_hasil_evaluasi_id;

  -- Soft-delete baris hasil_vendor lama (jika ini re-score) — bukan DELETE permanen,
  -- mengikuti aturan soft-delete di seluruh sistem (SH-01 ADR-019).
  UPDATE public.hasil_vendor
     SET deleted_at = NOW()
   WHERE hasil_evaluasi_id = v_hasil_evaluasi_id
     AND deleted_at IS NULL;

  INSERT INTO public.hasil_vendor (
    hasil_evaluasi_id, vendor_id, rank, skor_total, skor_per_kriteria,
    catatan_per_kriteria, lolos_threshold, unique_offerings, profil_kualitatif,
    tingkat_kesesuaian_preferensi
  )
  SELECT
    v_hasil_evaluasi_id,
    (elem->>'vendor_id')::UUID,
    (elem->>'rank')::INTEGER,
    (elem->>'skor_total')::NUMERIC,
    elem->'skor_per_kriteria',
    elem->'catatan_per_kriteria',
    (elem->>'lolos_threshold')::BOOLEAN,
    elem->'unique_offerings',
    elem->>'profil_kualitatif',
    NULLIF(elem->>'tingkat_kesesuaian_preferensi', '')::public.tingkat_kesesuaian_preferensi
  FROM jsonb_array_elements(p_hasil_vendor) AS elem;

  UPDATE public.evaluasi SET status = 'selesai' WHERE id = p_evaluasi_id;

  RETURN v_hasil_evaluasi_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_simpan_hasil_evaluasi(UUID, JSONB, JSONB) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fn_simpan_hasil_evaluasi(UUID, JSONB, JSONB) TO service_role;
