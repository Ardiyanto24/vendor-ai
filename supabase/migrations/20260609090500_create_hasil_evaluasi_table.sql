-- Migration: create hasil_evaluasi table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.hasil_evaluasi;

-- 1. Create hasil_evaluasi table
CREATE TABLE public.hasil_evaluasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL UNIQUE REFERENCES public.evaluasi(id),
    metodologi TEXT NOT NULL DEFAULT 'TOPSIS',
    vendor_rekomendasi_id UUID NOT NULL REFERENCES public.vendor(id),
    reasoning_utama TEXT NOT NULL,
    kelemahan_utama TEXT NOT NULL,
    rekomendasi_negosiasi TEXT NOT NULL,
    summary_komparatif_kualitatif TEXT,
    preference_matching_result JSONB,
    conflict_callout JSONB,
    konfigurasi_snapshot JSONB NOT NULL,
    ada_data_tidak_lengkap BOOLEAN NOT NULL DEFAULT FALSE,
    agent_gagal TEXT[],
    calculated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Auto-update updated_at (reuse function dari migration evaluasi)
CREATE TRIGGER hasil_evaluasi_set_updated_at
    BEFORE UPDATE ON public.hasil_evaluasi
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable RLS
ALTER TABLE public.hasil_evaluasi ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — akses mengikuti evaluasi induknya

-- SELECT: staff hanya bisa melihat hasil dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY hasil_evaluasi_select ON public.hasil_evaluasi
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = hasil_evaluasi.evaluasi_id
              AND (
                  public.evaluasi.created_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public."user"
                      WHERE public."user".id = auth.uid()
                        AND public."user".role = 'manager'
                  )
              )
        )
    );

-- INSERT & UPDATE: FastAPI service menggunakan service role key yang melewati RLS
-- (tidak ada policy INSERT/UPDATE/DELETE, sehingga semua operasi tulis dari client ditolak oleh RLS)
