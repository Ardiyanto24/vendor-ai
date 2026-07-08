-- Migration: create tingkat_kesesuaian_preferensi enum and hasil_vendor table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.hasil_vendor; DROP TYPE IF EXISTS tingkat_kesesuaian_preferensi;

-- 1. Create tingkat_kesesuaian_preferensi enum
CREATE TYPE tingkat_kesesuaian_preferensi AS ENUM ('tinggi', 'sedang', 'rendah', 'tidak_relevan');

-- 2. Create hasil_vendor table
CREATE TABLE public.hasil_vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hasil_evaluasi_id UUID NOT NULL REFERENCES public.hasil_evaluasi(id),
    vendor_id UUID NOT NULL REFERENCES public.vendor(id),
    rank INTEGER NOT NULL,
    skor_total NUMERIC NOT NULL,
    skor_per_kriteria JSONB NOT NULL,
    catatan_per_kriteria JSONB,
    lolos_threshold BOOLEAN NOT NULL,
    unique_offerings JSONB,
    profil_kualitatif TEXT,
    tingkat_kesesuaian_preferensi tingkat_kesesuaian_preferensi,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. B-tree index pada hasil_evaluasi_id — query semua skor vendor dalam satu hasil evaluasi
CREATE INDEX idx_hasil_vendor_hasil_evaluasi_id ON public.hasil_vendor (hasil_evaluasi_id) WHERE deleted_at IS NULL;

-- 4. Auto-update updated_at (reuse function dari migration evaluasi)
CREATE TRIGGER hasil_vendor_set_updated_at
    BEFORE UPDATE ON public.hasil_vendor
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable RLS
ALTER TABLE public.hasil_vendor ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — akses mengikuti evaluasi induknya via hasil_evaluasi

-- SELECT: staff hanya bisa melihat hasil vendor dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY hasil_vendor_select ON public.hasil_vendor
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hasil_evaluasi he
            JOIN public.evaluasi e ON e.id = he.evaluasi_id
            WHERE he.id = hasil_vendor.hasil_evaluasi_id
              AND (
                  e.created_by = auth.uid()
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
