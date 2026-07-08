-- Migration: add text search and sort indexes on evaluasi for F-05 query patterns
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_evaluasi_judul_trgm;
--   DROP INDEX IF EXISTS public.idx_evaluasi_updated_at;

-- 1. Enable pg_trgm for ILIKE/GIN trigram text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN trigram index on judul — supports ILIKE '%keyword%' without Seq Scan (F-05 search filter)
CREATE INDEX idx_evaluasi_judul_trgm
    ON public.evaluasi USING GIN (judul gin_trgm_ops)
    WHERE deleted_at IS NULL;

-- 3. B-tree index on updated_at — required by DB-03 section 5.1 for ORDER BY updated_at DESC
--    (was missing from F-04 migration)
CREATE INDEX idx_evaluasi_updated_at
    ON public.evaluasi (updated_at DESC)
    WHERE deleted_at IS NULL;
