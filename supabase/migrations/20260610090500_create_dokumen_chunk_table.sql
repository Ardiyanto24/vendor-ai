-- Migration: create tipe_konten enum and dokumen_chunk table with self-referential FK, basic B-tree indexes, and RLS
-- Rollback:
--   DROP TABLE IF EXISTS public.dokumen_chunk;
--   DROP TYPE IF EXISTS tipe_konten;
-- Note: index HNSW dan GIN dibuat di migration terpisah (20260610091000)

-- 1. Create tipe_konten enum
CREATE TYPE tipe_konten AS ENUM ('paragraf', 'tabel', 'list', 'header');

-- 2. Buat tabel tanpa self-referential FK terlebih dahulu
CREATE TABLE public.dokumen_chunk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL REFERENCES public.evaluasi(id),
    vendor_id UUID NOT NULL REFERENCES public.vendor(id),
    dokumen_upload_id UUID NOT NULL REFERENCES public.dokumen_upload(id),
    is_parent BOOLEAN NOT NULL,
    parent_chunk_id UUID,  -- FK self-referential ditambahkan via ALTER TABLE di bawah
    teks_chunk TEXT NOT NULL,
    embedding vector(768),          -- null untuk parent chunk — parent tidak di-embed
    teks_search TSVECTOR,           -- null untuk parent chunk
    halaman INTEGER NOT NULL,
    tipe_konten tipe_konten NOT NULL,
    posisi_section TEXT,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ          -- tidak ada updated_at: dokumen_chunk adalah write-once
);

-- 3. Tambahkan self-referential FK setelah tabel terbuat
ALTER TABLE public.dokumen_chunk
    ADD CONSTRAINT fk_parent_chunk
    FOREIGN KEY (parent_chunk_id)
    REFERENCES public.dokumen_chunk(id);

-- 4. B-tree indexes dasar (HNSW dan GIN di migration 20260610091000)

-- evaluasi_id — filter wajib di setiap query RAG retrieval (hot path)
CREATE INDEX idx_dokumen_chunk_evaluasi_id ON public.dokumen_chunk (evaluasi_id) WHERE deleted_at IS NULL;

-- vendor_id — filter per vendor saat retrieval
CREATE INDEX idx_dokumen_chunk_vendor_id ON public.dokumen_chunk (vendor_id) WHERE deleted_at IS NULL;

-- parent_chunk_id — lookup parent setelah child chunk ditemukan via similarity search
CREATE INDEX idx_dokumen_chunk_parent_chunk_id ON public.dokumen_chunk (parent_chunk_id)
    WHERE parent_chunk_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE public.dokumen_chunk ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — akses mengikuti evaluasi induknya
-- Setiap query ke tabel ini wajib menyertakan filter evaluasi_id (ditegakkan di level aplikasi, AI-05)

-- SELECT: staff hanya bisa membaca chunk dari evaluasi miliknya; manager bisa membaca semua
CREATE POLICY dokumen_chunk_select ON public.dokumen_chunk
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = dokumen_chunk.evaluasi_id
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

-- INSERT: FastAPI menggunakan service role key yang melewati RLS
-- UPDATE: FastAPI menggunakan service role key yang melewati RLS
-- DELETE: tidak diizinkan
-- (tidak ada policy INSERT/UPDATE/DELETE untuk authenticated role)
