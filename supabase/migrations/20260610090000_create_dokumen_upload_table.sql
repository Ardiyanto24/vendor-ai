-- Migration: create dokumen_file_type, status_ekstraksi, indexing_rag_status enums; dokumen_upload table with indexes and RLS; vendor-documents storage bucket and policies
-- Rollback:
--   DROP POLICY IF EXISTS vendor_documents_select ON storage.objects;
--   DROP POLICY IF EXISTS vendor_documents_upload ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'vendor-documents';
--   DROP TABLE IF EXISTS public.dokumen_upload;
--   DROP TYPE IF EXISTS indexing_rag_status;
--   DROP TYPE IF EXISTS status_ekstraksi;
--   DROP TYPE IF EXISTS dokumen_file_type;

-- 1. Create dokumen_file_type enum
CREATE TYPE dokumen_file_type AS ENUM ('pdf', 'excel');

-- 2. Create status_ekstraksi enum
CREATE TYPE status_ekstraksi AS ENUM ('pending', 'processing', 'done', 'done_partial', 'failed');

-- 3. Create indexing_rag_status enum
CREATE TYPE indexing_rag_status AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped_no_text');

-- 4. Create dokumen_upload table
CREATE TABLE public.dokumen_upload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL REFERENCES public.evaluasi(id),
    vendor_id UUID REFERENCES public.vendor(id),
    file_url TEXT NOT NULL,
    file_type dokumen_file_type NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    status_ekstraksi status_ekstraksi NOT NULL DEFAULT 'pending',
    hasil_ekstraksi JSONB,
    confidence_score NUMERIC CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    nama_vendor_hint TEXT,
    indexing_rag_status indexing_rag_status,
    chunk_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. B-tree index pada evaluasi_id — query semua dokumen dalam satu evaluasi
CREATE INDEX idx_dokumen_upload_evaluasi_id ON public.dokumen_upload (evaluasi_id) WHERE deleted_at IS NULL;

-- 6. Auto-update updated_at
CREATE TRIGGER dokumen_upload_set_updated_at
    BEFORE UPDATE ON public.dokumen_upload
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Enable RLS
ALTER TABLE public.dokumen_upload ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies — akses mengikuti evaluasi induknya

-- SELECT: staff hanya bisa melihat dokumen dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY dokumen_upload_select ON public.dokumen_upload
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = dokumen_upload.evaluasi_id
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

-- INSERT: staff bisa mengupload dokumen ke evaluasi miliknya
CREATE POLICY dokumen_upload_insert ON public.dokumen_upload
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = dokumen_upload.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    );

-- UPDATE: staff bisa mengupdate dokumen dari evaluasi miliknya (misal mengisi vendor_id setelah konfirmasi ekstraksi)
CREATE POLICY dokumen_upload_update ON public.dokumen_upload
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = dokumen_upload.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = dokumen_upload.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    );

-- DELETE: tidak diizinkan — soft delete melalui UPDATE deleted_at
-- (tidak ada policy DELETE, sehingga operasi DELETE selalu ditolak oleh RLS)

-- 9. Buat bucket 'vendor-documents' sebagai private
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', false);

-- 10. Storage policies
-- Path format yang diharapkan: {evaluasi_id}/{filename}

-- Upload: staff hanya bisa upload ke folder evaluasi miliknya
CREATE POLICY vendor_documents_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'vendor-documents'
        AND EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = (storage.foldername(name))[1]::uuid
              AND public.evaluasi.created_by = auth.uid()
              AND public.evaluasi.deleted_at IS NULL
        )
    );

-- Download: staff hanya bisa mengakses file dari evaluasi miliknya; manager bisa mengakses semua
CREATE POLICY vendor_documents_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'vendor-documents'
        AND EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = (storage.foldername(name))[1]::uuid
              AND (
                  public.evaluasi.created_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public."user"
                      WHERE public."user".id = auth.uid()
                        AND public."user".role = 'manager'
                  )
              )
              AND public.evaluasi.deleted_at IS NULL
        )
    );

-- UPDATE dan DELETE pada storage objects: tidak diizinkan dari client
-- (tidak ada policy UPDATE/DELETE, FastAPI menggunakan service role key)
