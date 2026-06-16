-- Migration: create HNSW vector index and GIN full-text index on dokumen_chunk
-- Rollback:
--   DROP INDEX IF EXISTS idx_dokumen_chunk_embedding;
--   DROP INDEX IF EXISTS idx_dokumen_chunk_teks_search;
-- Note: dibuat di migration terpisah dari tabel untuk kemudahan rollback per index type

-- 1. Index HNSW untuk approximate nearest neighbor search (vector similarity)
-- Embedding: Google Gemini text-embedding-004, 768 dimensi (DB-01 v3.0.0)
-- Operator class: vector_cosine_ops — cosine similarity adalah standard untuk Gemini embedding
-- Parameter m=16, ef_construction=64: default pgvector, cukup untuk skala MVP
CREATE INDEX idx_dokumen_chunk_embedding
    ON public.dokumen_chunk
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 2. Index GIN untuk full-text search (BM25 hybrid search via tsvector column)
-- teks_search di-populate oleh FastAPI menggunakan to_tsvector('indonesian', teks_chunk)
CREATE INDEX idx_dokumen_chunk_teks_search
    ON public.dokumen_chunk
    USING GIN (teks_search);
