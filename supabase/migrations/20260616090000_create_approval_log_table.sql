-- Migration: create approval_keputusan enum and approval_log table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.approval_log; DROP TYPE IF EXISTS approval_keputusan;

-- 1. Create approval_keputusan enum
CREATE TYPE approval_keputusan AS ENUM ('approved', 'rejected');

-- 2. Create approval_log table
CREATE TABLE public.approval_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL REFERENCES public.evaluasi(id),
    manager_id UUID NOT NULL REFERENCES public."user"(id),
    keputusan approval_keputusan NOT NULL,
    komentar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. B-tree index pada evaluasi_id — query riwayat approval satu evaluasi
CREATE INDEX idx_approval_log_evaluasi_id ON public.approval_log (evaluasi_id) WHERE deleted_at IS NULL;

-- 4. Auto-update updated_at trigger (reuse function dari migration evaluasi)
CREATE TRIGGER approval_log_set_updated_at
    BEFORE UPDATE ON public.approval_log
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable RLS
ALTER TABLE public.approval_log ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies

-- SELECT: staff hanya bisa melihat approval_log dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY approval_log_select ON public.approval_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = approval_log.evaluasi_id
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

-- INSERT: hanya manager yang boleh membuat keputusan approval
CREATE POLICY approval_log_insert ON public.approval_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        manager_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public."user"
            WHERE public."user".id = auth.uid()
              AND public."user".role = 'manager'
        )
    );

-- UPDATE: tidak diizinkan — approval_log adalah riwayat immutable
-- (tidak ada policy UPDATE, sehingga UPDATE dari client selalu ditolak oleh RLS)

-- DELETE: tidak diizinkan
-- (tidak ada policy DELETE, sehingga operasi DELETE selalu ditolak oleh RLS)
