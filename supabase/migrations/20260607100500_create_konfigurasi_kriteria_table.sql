-- Migration: create konfigurasi_kriteria table, kategori_pengadaan type, index, and RLS policies
-- Rollback: DROP TABLE IF EXISTS public.konfigurasi_kriteria; DROP TYPE IF EXISTS kategori_pengadaan;

-- 1. Create kategori_pengadaan enum
CREATE TYPE kategori_pengadaan AS ENUM (
    'it_hardware',
    'it_software',
    'jasa_it',
    'jasa_konsultasi',
    'alat_tulis_kantor'
);

-- 2. Create konfigurasi_kriteria table
CREATE TABLE public.konfigurasi_kriteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori kategori_pengadaan NOT NULL,
    kriteria JSONB NOT NULL,
    updated_by UUID NOT NULL REFERENCES public."user"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Create B-tree index on kategori for active configurations
CREATE INDEX idx_konfigurasi_kriteria_kategori ON public.konfigurasi_kriteria (kategori) WHERE deleted_at IS NULL;

-- 4. Enable RLS
ALTER TABLE public.konfigurasi_kriteria ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
CREATE POLICY select_authenticated ON public.konfigurasi_kriteria
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY update_manager ON public.konfigurasi_kriteria
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    );
