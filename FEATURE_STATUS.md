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
| F-01 Auth & Login | ✅ | ✅ | ✅ | — | Diverifikasi ulang live di sesi ini (login staff demo sungguhan → 200, real Supabase Auth). Sekalian ditemukan & diperbaiki bug: `middleware.ts` tidak mengecualikan `/mockServiceWorker.js` dari matcher, sehingga di halaman belum-login file itu ikut di-redirect ke `/login` — service worker menolak register dari response redirect, menyebabkan MSW retry berulang dan menguras resource browser. Sudah ditambahkan ke exclude list |
| F-02 Layout & AppShell | — | — | ✅ | — | FE only |
| F-03 Konfigurasi Kriteria | ✅ | ✅ | ✅ | — | |
| F-04 Dashboard | ✅ | ✅ | ✅ | — | Diverifikasi live di sesi ini: `GET /evaluasi/summary` dan `GET /evaluasi` sungguhan mengembalikan 200 dengan data ter-filter RLS yang benar (staff demo tanpa evaluasi tampil kosong) |
| F-05 Riwayat Evaluasi | ✅ | ✅ | ✅ | — | Endpoint `GET /evaluasi` sama dengan F-04, sudah diverifikasi live |
| F-06 Buat Evaluasi | ✅ | ✅ | ✅ | — | Diverifikasi live end-to-end via form P-03 sungguhan di browser: `POST /evaluasi` → 201, `POST /evaluasi/:id/vendor` x2 → 201, data terkonfirmasi tersimpan benar via `GET /evaluasi/:id` |
| F-07 Upload & Ekstraksi | ✅ | ✅ | ✅ | ✅ | FE di-switch dari MSW ke API nyata: `apps/web/test/browser.ts` sekarang `setupWorker()` tanpa handler sama sekali (bukan lagi reuse `test/handlers` yang dipakai Vitest), jadi semua request di dev browser bypass ke network asli — Vitest tetap pakai mock penuh, tidak terpengaruh. `POST /evaluasi/:id/dokumen` diverifikasi live → 202, file tersimpan di Supabase Storage nyata, row `dokumen_upload` dibuat dengan `status_ekstraksi: 'pending'`. Ekstraksi tetap `pending` selamanya karena tidak ada FastAPI nyata (`vendor-ai-agent` belum ada) — ini perilaku yang diharapkan, bukan bug |
| F-08 Form Preferensi | ✅ | ✅ | ✅ | — | Diverifikasi live end-to-end: field preferensi diisi lewat form P-03 sungguhan di browser, dikonfirmasi tersimpan benar via `GET /evaluasi/:id` → `preferensi_perusahaan` berisi teks yang diisi |
| F-09 Submit & Approval | ✅ | 🔄 | 🔄 | — | DB selesai (lihat riwayat commit sebelumnya — migration ledger direkonsiliasi, `approval_log` benar-benar dibuat & diverifikasi). BE (`PATCH .../status`, `POST .../approval`) sudah diimplementasi & lulus typecheck, tapi belum bisa dites end-to-end: alur approval butuh evaluasi berstatus `selesai`/`menunggu_approval`, yang hanya bisa dicapai lewat pipeline AI yang belum ada (`vendor-ai-agent`). FE sudah di-switch dari MSW ke API nyata tapi belum bisa diverifikasi di browser untuk alasan yang sama |
| F-10 AI Processing | ✅ | ✅ | 🔄 | ❌ | DB selesai (agent_progress live, RLS aktif, storage bucket private — dikonfirmasi sesi sebelumnya). BE **diverifikasi live** di sesi ini: `POST /evaluasi/:id/submit` sungguhan mengembalikan 503 `AGENT_SERVICE_ERROR` dan evaluasi ter-rollback benar ke `draft` (bukan macet di `processing`) — sesuai kontrak karena FastAPI memang belum ada. Sekalian ditemukan & diperbaiki bug: kode BE membaca `process.env.FASTAPI_BASE_URL` tapi semua file `.env`/`.env.example` memakai nama `FASTAPI_URL` — akibatnya FastAPI call selalu gagal walau endpoint-nya nanti sudah hidup. Sudah diseragamkan ke `FASTAPI_BASE_URL` (sesuai CLAUDE.md) di keempat file env. FE: `AgentProgressPanel`/`useAgentProgress`/halaman P-04 sudah di-switch dari MSW ke API nyata (Realtime langsung ke Supabase, seperti sebelumnya), tapi belum bisa diverifikasi lewat klik browser — dua kendala terpisah: (1) bug session-restore pre-existing (`Failed to restore session`, `task_eca96223`, belum ter-fix di branch ini), dan (2) mesin sempat kehabisan memori saat sesi ini (`RangeError: Failed to allocate memory` di Next.js webpack compiler) sehingga dev server sempat macet di tengah compile — ini kendala environment, bukan bug aplikasi. AI: task LangGraph/7-agent berada di repo `vendor-ai-agent` — tidak dikerjakan di sesi ini |
| F-11 Hasil TOPSIS | ✅ | — | — | — | DB prasyarat untuk AI Engineer: kolom `token_usage` (JSONB) ditambahkan ke `hasil_evaluasi` via migration `20260617090000` — SH-04 section 12.5 mensyaratkan pencatatan biaya token per evaluasi (input/output token per agent, biaya Tavily, timestamp) tapi kolom ini belum ada di skema (DB-01 tidak mendefinisikannya, dan dikonfirmasi juga tidak ada di live DB via query langsung) sehingga menghambat progress F-11 AI Engineer. Sudah di-`db push` dan diverifikasi live (kolom terbaca via service role, tetap terblokir RLS untuk anon). BE/FE: Koordinasi AI Engineer, belum dikerjakan |
| F-12 Profil Kualitatif | — | — | — | — | Koordinasi AI Engineer |
| F-13 Rekomendasi Preferensi | — | — | — | — | Koordinasi AI Engineer |
| F-14 AI Chat + RAG | — | — | — | — | Koordinasi AI Engineer |