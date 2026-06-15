-- Migration: create vendor_sumber_input enum and vendor table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.vendor; DROP TYPE IF EXISTS vendor_sumber_input;

-- 1. Create vendor_sumber_input enum
CREATE TYPE vendor_sumber_input AS ENUM ('manual', 'extracted');

-- 2. Create vendor table
CREATE TABLE public.vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL REFERENCES public.evaluasi(id),
    nama_perusahaan TEXT NOT NULL,
    kontak_atau_website TEXT,
    harga_penawaran BIGINT NOT NULL,
    catatan TEXT,
    sumber_input vendor_sumber_input NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. B-tree index pada evaluasi_id — semua query vendor selalu difilter berdasarkan evaluasi
CREATE INDEX idx_vendor_evaluasi_id ON public.vendor (evaluasi_id) WHERE deleted_at IS NULL;

-- 4. Auto-update updated_at (reuse function dari migration evaluasi)
CREATE TRIGGER vendor_set_updated_at
    BEFORE UPDATE ON public.vendor
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable RLS
ALTER TABLE public.vendor ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — akses mengikuti evaluasi induknya

-- SELECT: staff hanya bisa melihat vendor dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY vendor_select ON public.vendor
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = vendor.evaluasi_id
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

-- INSERT: staff bisa menambah vendor ke evaluasi miliknya
CREATE POLICY vendor_insert ON public.vendor
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = vendor.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    );

-- UPDATE: staff bisa mengupdate vendor dari evaluasi miliknya
CREATE POLICY vendor_update ON public.vendor
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = vendor.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = vendor.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    );

-- DELETE: tidak diizinkan — soft delete melalui UPDATE deleted_at
-- (tidak ada policy DELETE, sehingga operasi DELETE selalu ditolak oleh RLS)
