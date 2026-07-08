-- Migration: create evaluasi_status enum and evaluasi table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.evaluasi; DROP TYPE IF EXISTS evaluasi_status;

-- 1. Create evaluasi_status enum (lifecycle: draft → processing → selesai → menunggu_approval → approved | butuh_revisi)
CREATE TYPE evaluasi_status AS ENUM (
    'draft',
    'processing',
    'selesai',
    'menunggu_approval',
    'approved',
    'butuh_revisi'
);

-- 2. Create evaluasi table
CREATE TABLE public.evaluasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    kategori kategori_pengadaan NOT NULL,
    deskripsi TEXT NOT NULL,
    status evaluasi_status NOT NULL DEFAULT 'draft',
    budget_min BIGINT,
    budget_max BIGINT NOT NULL,
    deadline DATE NOT NULL,
    prioritas_kriteria TEXT[],
    lampiran_url TEXT,
    created_by UUID NOT NULL REFERENCES public."user"(id),
    preferensi_perusahaan TEXT CHECK (char_length(preferensi_perusahaan) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Composite B-tree index — hot path untuk query daftar evaluasi staff
CREATE INDEX idx_evaluasi_created_by_status_deleted ON public.evaluasi (created_by, status, deleted_at);

-- 4. Partial index — semua query default memfilter soft delete
CREATE INDEX idx_evaluasi_active ON public.evaluasi (created_by, status) WHERE deleted_at IS NULL;

-- 5. Additional indexes per DB-01 section 9
CREATE INDEX idx_evaluasi_status ON public.evaluasi (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_evaluasi_kategori ON public.evaluasi (kategori) WHERE deleted_at IS NULL;

-- 6. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluasi_set_updated_at
    BEFORE UPDATE ON public.evaluasi
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Enable RLS
ALTER TABLE public.evaluasi ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies

-- SELECT: staff hanya bisa melihat evaluasi miliknya; manager bisa melihat semua
CREATE POLICY evaluasi_select ON public.evaluasi
    FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    );

-- INSERT: user authenticated bisa membuat evaluasi baru; created_by harus auth.uid()
CREATE POLICY evaluasi_insert ON public.evaluasi
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: staff hanya bisa mengupdate evaluasi miliknya; manager bisa mengupdate status untuk approval
CREATE POLICY evaluasi_update ON public.evaluasi
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    );

-- DELETE: tidak diizinkan — semua "hapus" harus soft delete melalui UPDATE deleted_at
-- (tidak ada policy DELETE, sehingga operasi DELETE selalu ditolak oleh RLS)
