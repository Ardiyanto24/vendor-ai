-- F-05 DB Verification: EXPLAIN ANALYZE untuk query daftar evaluasi
-- Jalankan script ini di Supabase SQL Editor (Dashboard) atau via psql setelah
-- migration 20260615160000_add_evaluasi_search_indexes.sql dijalankan.
--
-- Target performa (DB-03 section 10): < 100ms P95, tidak ada Seq Scan untuk query normal.
-- Ganti placeholder UUID dengan user ID yang ada di database untuk hasil akurat.

-- ============================================================
-- 1. Query daftar normal (staff) — harus pakai idx_evaluasi_active
--    Ekspektasi: Index Scan / Bitmap Index Scan, bukan Seq Scan
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE created_by = '00000000-0000-0000-0000-000000000001'  -- ganti dengan UUID staff nyata
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 2. Query dengan filter status (staff) — harus pakai idx_evaluasi_active
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE created_by = '00000000-0000-0000-0000-000000000001'  -- ganti dengan UUID staff nyata
  AND status = 'draft'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 3. Query dengan filter status + kategori (staff)
--    Ekspektasi: idx_evaluasi_active dipakai untuk created_by+status, kategori di-filter di heap
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE created_by = '00000000-0000-0000-0000-000000000001'  -- ganti dengan UUID staff nyata
  AND status = 'draft'
  AND kategori = 'it_hardware'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 4. Query dengan filter status + kategori + text search (staff)
--    Ekspektasi: idx_evaluasi_judul_trgm dipakai untuk ILIKE, bukan Seq Scan
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE created_by = '00000000-0000-0000-0000-000000000001'  -- ganti dengan UUID staff nyata
  AND status = 'draft'
  AND kategori = 'it_hardware'
  AND judul ILIKE '%vendor%'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 5. Query dengan semua filter termasuk date range (staff)
--    Ekspektasi: tetap menggunakan index, tidak Seq Scan
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE created_by = '00000000-0000-0000-0000-000000000001'  -- ganti dengan UUID staff nyata
  AND status = 'draft'
  AND kategori = 'it_hardware'
  AND judul ILIKE '%vendor%'
  AND created_at >= '2026-01-01'
  AND created_at <= '2026-12-31'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 6. Query daftar normal (manager) — tanpa filter created_by
--    Ekspektasi: idx_evaluasi_status atau idx_evaluasi_updated_at
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- 7. Query manager dengan filter status + kategori
--    Ekspektasi: Bitmap Index Scan kombinasi idx_evaluasi_status + idx_evaluasi_kategori
-- ============================================================
EXPLAIN ANALYZE
SELECT id, judul, kategori, status, updated_at, created_at
FROM public.evaluasi
WHERE status = 'menunggu_approval'
  AND kategori = 'jasa_it'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- ============================================================
-- Verifikasi daftar index yang terpasang di tabel evaluasi
-- ============================================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'evaluasi'
  AND schemaname = 'public'
ORDER BY indexname;
