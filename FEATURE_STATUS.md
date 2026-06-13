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
| F-00 Environment Setup | ✅ | - | - | - | |
| F-01 Auth & Login | — | — | — | — | |
| F-02 Layout & AppShell | — | — | — | — | FE only |
| F-03 Konfigurasi Kriteria | — | — | — | — | |
| F-04 Dashboard | — | — | — | — | |
| F-05 Riwayat Evaluasi | — | — | — | — | |
| F-06 Buat Evaluasi | — | — | — | — | |
| F-07 Upload & Ekstraksi | — | — | — | — | Koordinasi AI Engineer |
| F-08 Form Preferensi | — | — | — | — | |
| F-09 Submit & Approval | — | — | — | — | |
| F-10 AI Processing | — | — | — | — | Koordinasi AI Engineer |
| F-11 Hasil TOPSIS | — | — | — | — | Koordinasi AI Engineer |
| F-12 Profil Kualitatif | — | — | — | — | Koordinasi AI Engineer |
| F-13 Rekomendasi Preferensi | — | — | — | — | Koordinasi AI Engineer |
| F-14 AI Chat + RAG | — | — | — | — | Koordinasi AI Engineer |