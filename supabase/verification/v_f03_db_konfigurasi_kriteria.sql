-- =============================================================================
-- Verification: F-03 [DB] — Konfigurasi Kriteria
-- Fitur: Settings P-08
-- Jalankan di: Supabase SQL Editor (atau psql)
--
-- PENTING — cara menjalankan blok RLS:
--   Blok 1, 2, 4: jalankan sebagai postgres/service_role (default SQL Editor)
--   Blok 3a      : jalankan sebagai staff  → expected ERROR
--   Blok 3b      : jalankan sebagai manager → expected 1 row affected
--
--   Untuk simulasi role di SQL Editor Supabase:
--   SET LOCAL role = authenticated;
--   SET LOCAL request.jwt.claims = '{"sub": "<user_uuid>", "role": "authenticated"}';
--   (lalu pastikan row di tabel user memiliki role 'staff' atau 'manager')
-- =============================================================================


-- =============================================================================
-- BLOK 1: Index — verifikasi struktur index ada di katalog
-- Expected: 1 row dengan indexname = 'idx_konfigurasi_kriteria_kategori'
--           dan indexdef mengandung 'WHERE (deleted_at IS NULL)'
-- =============================================================================

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename  = 'konfigurasi_kriteria'
  AND schemaname = 'public';

-- Catatan performa:
-- Dengan 5 seed rows, EXPLAIN ANALYZE mungkin memilih Seq Scan (lebih murah
-- untuk tabel sangat kecil) — ini normal. Index akan dipakai planner saat
-- jumlah row bertambah. Query di bawah untuk konfirmasi eksekusi plan saat ini:

EXPLAIN ANALYZE
SELECT *
FROM public.konfigurasi_kriteria
WHERE kategori   = 'it_hardware'
  AND deleted_at IS NULL;


-- =============================================================================
-- BLOK 2: RLS SELECT — semua authenticated user bisa membaca
-- Jalankan sebagai: staff ATAU manager (keduanya harus berhasil)
-- Expected: rows kembali tanpa error
-- =============================================================================

SELECT
    id,
    kategori,
    jsonb_array_length(kriteria) AS jumlah_kriteria,
    updated_at
FROM public.konfigurasi_kriteria
WHERE deleted_at IS NULL
ORDER BY kategori;


-- =============================================================================
-- BLOK 3a: RLS UPDATE — staff harus DIBLOKIR
-- Jalankan sebagai: user dengan role 'staff' di tabel public.user
-- Expected: ERROR: new row violates row-level security policy for table "konfigurasi_kriteria"
-- =============================================================================

-- Simulasi di SQL Editor (ganti <staff_uuid> dengan UUID akun staff):
-- SET LOCAL role = authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<staff_uuid>","role":"authenticated"}';

UPDATE public.konfigurasi_kriteria
SET updated_at = NOW()
WHERE kategori = 'it_hardware';

-- Jika tidak ada error → RLS UPDATE policy GAGAL (bug)
-- Jika muncul RLS error  → PASS ✓


-- =============================================================================
-- BLOK 3b: RLS UPDATE — manager harus BERHASIL
-- Jalankan sebagai: user dengan role 'manager' di tabel public.user
-- Expected: UPDATE 1 (tidak ada error)
-- Rollback setelah verifikasi agar data seed tidak berubah permanen.
-- =============================================================================

-- Simulasi di SQL Editor (ganti <manager_uuid> dengan UUID akun manager):
-- SET LOCAL role = authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<manager_uuid>","role":"authenticated"}';

BEGIN;

UPDATE public.konfigurasi_kriteria
SET updated_at = NOW()
WHERE kategori = 'it_hardware';

-- Verifikasi 1 row ter-update:
SELECT id, kategori, updated_at
FROM public.konfigurasi_kriteria
WHERE kategori = 'it_hardware' AND deleted_at IS NULL;

ROLLBACK; -- jangan commit — ini hanya tes


-- =============================================================================
-- BLOK 4: Seed data — 5 kategori, masing-masing total bobot = 100
-- Jalankan sebagai: service_role atau postgres
-- Expected: 5 rows, kolom total_bobot semua bernilai 100
-- =============================================================================

SELECT
    kategori,
    jsonb_array_length(kriteria)                                          AS jumlah_kriteria,
    (
        SELECT SUM((k->>'bobot')::int)
        FROM jsonb_array_elements(kriteria) AS k
    )                                                                     AS total_bobot,
    CASE
        WHEN (
            SELECT SUM((k->>'bobot')::int)
            FROM jsonb_array_elements(kriteria) AS k
        ) = 100 THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END                                                                   AS status_bobot
FROM public.konfigurasi_kriteria
WHERE deleted_at IS NULL
ORDER BY kategori;

-- Expected output:
-- kategori              | jumlah_kriteria | total_bobot | status_bobot
-- ----------------------+-----------------+-------------+-------------
-- alat_tulis_kantor     |               5 |         100 | PASS ✓
-- it_hardware           |               5 |         100 | PASS ✓
-- it_software           |               5 |         100 | PASS ✓
-- jasa_it               |               5 |         100 | PASS ✓
-- jasa_konsultasi       |               5 |         100 | PASS ✓
