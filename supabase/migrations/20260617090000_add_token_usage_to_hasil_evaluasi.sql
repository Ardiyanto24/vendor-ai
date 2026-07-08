-- Migration: add token_usage column to hasil_evaluasi
-- Rollback: ALTER TABLE public.hasil_evaluasi DROP COLUMN token_usage;

-- Mencatat biaya token LLM per evaluasi (SH-04 section 12.5) — diisi oleh
-- FastAPI (vendor-ai-agent) saat scoring engine menulis hasil_evaluasi.
ALTER TABLE public.hasil_evaluasi
  ADD COLUMN token_usage JSONB;
