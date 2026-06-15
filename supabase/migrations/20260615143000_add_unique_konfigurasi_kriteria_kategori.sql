-- Migration: add UNIQUE constraint on konfigurasi_kriteria.kategori
-- Rollback: ALTER TABLE public.konfigurasi_kriteria DROP CONSTRAINT uq_konfigurasi_kriteria_kategori;

-- One active config per procurement category. The design never truly deletes
-- these rows (only UPDATEs them), so a simple UNIQUE on kategori is correct.
ALTER TABLE public.konfigurasi_kriteria
  ADD CONSTRAINT uq_konfigurasi_kriteria_kategori UNIQUE (kategori);
