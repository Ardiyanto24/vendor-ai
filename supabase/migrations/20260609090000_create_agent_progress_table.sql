-- Migration: create agent_key enum, agent_status enum, and agent_progress table with indexes and RLS
-- Rollback: DROP TABLE IF EXISTS public.agent_progress; DROP TYPE IF EXISTS agent_key; DROP TYPE IF EXISTS agent_status;

-- 1. Create agent_key enum (7 agents per AI-01)
CREATE TYPE agent_key AS ENUM (
    'data_collector',
    'financial_analyzer',
    'risk_assessor',
    'performance_scorer',
    'negotiation_assistant',
    'qualitative_analyzer',
    'preference_matcher'
);

-- 2. Create agent_status enum
CREATE TYPE agent_status AS ENUM ('idle', 'running', 'done', 'error');

-- 3. Create agent_progress table
CREATE TABLE public.agent_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluasi_id UUID NOT NULL REFERENCES public.evaluasi(id),
    agent_key agent_key NOT NULL,
    status agent_status NOT NULL DEFAULT 'idle',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    pesan_terakhir TEXT,
    error_detail TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT agent_progress_evaluasi_agent_unique UNIQUE (evaluasi_id, agent_key)
);

-- 4. B-tree index pada evaluasi_id — query agent selalu difilter berdasarkan evaluasi
CREATE INDEX idx_agent_progress_evaluasi_id ON public.agent_progress (evaluasi_id) WHERE deleted_at IS NULL;

-- 5. Auto-update updated_at (reuse function dari migration evaluasi)
CREATE TRIGGER agent_progress_set_updated_at
    BEFORE UPDATE ON public.agent_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Aktifkan tabel ini di Supabase Realtime — frontend P-04 subscribe perubahan status agent
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_progress;

-- 7. Enable RLS
ALTER TABLE public.agent_progress ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies — akses mengikuti evaluasi induknya

-- SELECT: staff hanya bisa melihat agent_progress dari evaluasi miliknya; manager bisa melihat semua
CREATE POLICY agent_progress_select ON public.agent_progress
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = agent_progress.evaluasi_id
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

-- INSERT: BFF (Next.js API) menginisialisasi 7 row saat evaluasi di-submit; staff hanya bisa insert untuk evaluasi miliknya
CREATE POLICY agent_progress_insert ON public.agent_progress
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluasi
            WHERE public.evaluasi.id = agent_progress.evaluasi_id
              AND public.evaluasi.created_by = auth.uid()
        )
    );

-- UPDATE: FastAPI service menggunakan service role key yang melewati RLS — tidak ada policy UPDATE untuk authenticated
-- (tidak ada policy UPDATE, sehingga UPDATE dari client selalu ditolak oleh RLS)

-- DELETE: tidak diizinkan — soft delete melalui UPDATE deleted_at
-- (tidak ada policy DELETE, sehingga operasi DELETE selalu ditolak oleh RLS)
