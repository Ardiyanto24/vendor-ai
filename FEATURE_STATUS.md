# Feature Status — vendor-ai

Tracking status pengerjaan per fitur untuk track Fullstack (DB → BE → FE).  
Kolom `AI` diisi hanya untuk fitur yang menyentuh `vendor-ai-agent` — isi `—` jika tidak relevan.

**Kapan setiap kolom dinyatakan ✅:**
- **DB** — Migration sudah berjalan di staging, RLS dan index terverifikasi
- **BE** — Semua endpoint untuk fitur ini merespons dengan benar di staging
- **FE** — UI sudah connect ke API nyata (bukan MSW), fitur bisa digunakan end-to-end
- **AI** — FastAPI endpoint dan pipeline AI untuk fitur ini sudah berjalan di staging (dikonfirmasi dari `vendor-ai-agent/FEATURE_STATUS.md`)

**Status legend:** ✅ selesai · 🔄 in progress · ⏳ menunggu lapisan/track lain · ❌ blocked · — tidak terlibat

---

| Fitur | DB | BE | FE | AI | Notes |
|---|---|---|---|---|---|
| F-00 Environment Setup | ✅ | ✅ | ✅ | - | |
| F-01 Auth & Login | ✅ | ✅ | ✅ | — | |
| F-02 Layout & AppShell | — | — | ✅ | — | FE only |
| F-03 Konfigurasi Kriteria | ✅ | ✅ | ✅ | — | |
| F-04 Dashboard | ✅ | ✅ | ✅ | — | |
| F-05 Riwayat Evaluasi | ✅ | ✅ | ✅ | — | |
| F-06 Buat Evaluasi | ✅ | ✅ | ✅ | — | |
| F-07 Upload & Ekstraksi | ✅ | ✅ | 🔄 | ✅ | FE selesai & diverifikasi via MSW (unit + manual), belum di-switch ke staging API nyata |
| F-08 Form Preferensi | ✅ | ✅ | 🔄 | — | DB (kolom `preferensi_perusahaan`) & BE (validasi `PREFERENCE_TOO_LONG`) sudah ada sejak F-04/F-06; FE `PreferenceInput` baru ditambahkan, diverifikasi via unit test (MSW), belum di-switch ke staging API nyata |
| F-09 Submit & Approval | ✅ | 🔄 | 🔄 | — | DB selesai: project dev `ai-vendor-dev` sudah di-resume, migration ledger direkonsiliasi (`agent_progress`, `hasil_evaluasi`, `hasil_vendor`, `dokumen_upload`, `dokumen_chunk` dari F-06/F-07 ternyata sudah live sebelumnya tapi tidak tercatat di ledger CLI — direkonsiliasi via `migration repair` tanpa re-run DDL), dan `approval_log` benar-benar di-`db push` baru (percobaan sebelumnya sempat gagal — table sempat tidak muncul di PostgREST schema cache meski `NOTIFY pgrst, 'reload schema'` sudah dijalankan, ternyata table-nya sendiri belum pernah ter-commit; setelah migration ledger-nya di-set `reverted` dan di-`db push` ulang, table benar-benar dibuat). RLS diverifikasi read-only pakai anon key: `approval_log`, `agent_progress`, `hasil_evaluasi`, `hasil_vendor`, `dokumen_upload`, `dokumen_chunk`, `evaluasi`, `vendor` semua mengembalikan 0 row untuk anon (RLS aktif, bukan cuma enabled tanpa policy). BE (`PATCH .../status`, `POST .../approval`) sudah diimplementasi & lulus typecheck, tapi belum dites end-to-end melawan tabel live yang baru tersedia ini. FE (P-05 placeholder, P-07 tabs + ApprovalCard) selesai & diverifikasi via MSW (unit test), belum di-switch ke staging API nyata |
| F-10 AI Processing | ✅ | 🔄 | 🔄 | ❌ | DB selesai: enum `agent_key` (7 agent), index `evaluasi_id`, dan publikasi Realtime dari migration F-06 (`20260609090000_create_agent_progress_table.sql`) dikonfirmasi live setelah project dev di-resume — ada data nyata (evaluasi + 7 row agent_progress berstatus idle) yang membuktikan tabel ini memang sudah dipakai sebelumnya, dan anon key dikonfirmasi tidak bisa membacanya (RLS aktif). Storage bucket `vendor-documents` juga dikonfirmasi private. Realtime broadcast belum diuji langsung (percobaan smoke test update+revert satu row diblokir safety classifier karena mutasi data live tanpa izin eksplisit) — masih menunggu keputusan user, atau bisa diverifikasi manual via Dashboard → Database → Replication. BE: `POST /evaluasi/:id/submit` kini memanggil FastAPI `/v1/agent/evaluasi/:id/start` secara nyata (awaited, dengan `X-Service-Token`) — jika gagal/timeout/5xx, evaluasi di-rollback ke `draft` dan mengembalikan 503 `AGENT_SERVICE_ERROR`; belum bisa diverifikasi end-to-end karena endpoint FastAPI berada di repo `vendor-ai-agent` (di luar scope repo ini) dan belum tersedia. FE: `useAgentProgress` (Supabase Realtime subscription ke channel `evaluasi-progress-{evaluasiId}`, derive state `waiting` dari dependency graph DC/FA/RA→PS→NA+QA→PM) + `AgentProgressPanel` + halaman P-04 `/evaluasi/:id/proses` selesai, diverifikasi via unit test dengan Supabase client di-mock (17 test baru, termasuk skenario env belum dikonfigurasi → error graceful, bukan crash); jalur data ini tidak lewat MSW (langsung ke Supabase client). Percobaan verifikasi manual di preview browser (klik navigasi maupun hard navigate ke `/evaluasi/:id/proses`) masih terhalang bug session-restore pre-existing yang sama seperti di F-08/F-09 (`Failed to restore session`, lihat task `task_eca96223`) — route sudah dikonfirmasi compile & serve 200 di server log, tapi client bounce kembali ke `/dashboard` sebelum halaman sempat dirender. AI: task LangGraph/7-agent berada di repo `vendor-ai-agent` — tidak dikerjakan di sesi ini. |
| F-11 Hasil TOPSIS | ✅ | — | — | — | DB prasyarat untuk AI Engineer: kolom `token_usage` (JSONB) ditambahkan ke `hasil_evaluasi` via migration `20260617090000` — SH-04 section 12.5 mensyaratkan pencatatan biaya token per evaluasi (input/output token per agent, biaya Tavily, timestamp) tapi kolom ini belum ada di skema (DB-01 tidak mendefinisikannya, dan dikonfirmasi juga tidak ada di live DB via query langsung) sehingga menghambat progress F-11 AI Engineer. Sudah di-`db push` dan diverifikasi live (kolom terbaca via service role, tetap terblokir RLS untuk anon). BE/FE: Koordinasi AI Engineer, belum dikerjakan |
| F-12 Profil Kualitatif | — | — | — | — | Koordinasi AI Engineer |
| F-13 Rekomendasi Preferensi | — | — | — | — | Koordinasi AI Engineer |
| F-14 AI Chat + RAG | — | — | — | — | Koordinasi AI Engineer |