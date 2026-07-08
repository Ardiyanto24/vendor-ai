import { http, HttpResponse } from 'msw';
import type { HasilEvaluasi } from 'types';

const KRITERIA = [
  { key: 'harga_tco',             label: 'Harga & TCO',             bobot: 30, threshold_min: 60 },
  { key: 'kualitas_track_record', label: 'Kualitas & Track Record', bobot: 25, threshold_min: 60 },
  { key: 'kemampuan_delivery',    label: 'Kemampuan Delivery',      bobot: 20, threshold_min: 60 },
  { key: 'risiko_legalitas',      label: 'Risiko & Legalitas',      bobot: 15, threshold_min: 60 },
  { key: 'support_aftersales',    label: 'Support & Aftersales',    bobot: 10, threshold_min: 60 },
];

// Fixture 1: eval-selesai-001 — ranking jelas, tanpa preferensi (preferensi_perusahaan: null)
const HASIL_SELESAI_001: HasilEvaluasi = {
  id: 'hasil-eval-selesai-001',
  evaluasi_id: 'eval-selesai-001',
  metodologi: 'TOPSIS',
  vendor_rekomendasi_id: 'vendor-atk-1',
  vendor_rekomendasi_nama: 'PT Sumber Makmur Sejahtera',
  reasoning_utama: 'PT Sumber Makmur Sejahtera unggul di harga dan kualitas dengan skor TOPSIS tertinggi (88.5), 9% di bawah rata-rata pasar dengan track record baik di tiga pengadaan sebelumnya.',
  kelemahan_utama: 'Kapasitas delivery sedikit lebih rendah dibanding pesaing terdekat untuk pesanan dalam jumlah besar di atas 500 unit.',
  rekomendasi_negosiasi: 'Negosiasikan lead time untuk pesanan besar dan minta klausul penalti keterlambatan di kontrak.',
  summary_komparatif_kualitatif: null,
  preference_matching_result: null,
  conflict_callout: null,
  ada_data_tidak_lengkap: false,
  agent_gagal: null,
  calculated_at: '2026-06-13T14:00:00Z',
  kriteria: KRITERIA,
  vendors: [
    {
      id: 'hasil-vendor-atk-1',
      hasil_evaluasi_id: 'hasil-eval-selesai-001',
      vendor_id: 'vendor-atk-1',
      vendor_nama: 'PT Sumber Makmur Sejahtera',
      rank: 1,
      skor_total: 88.5,
      skor_per_kriteria: {
        harga_tco: 92,
        kualitas_track_record: 88,
        kemampuan_delivery: 78,
        risiko_legalitas: 90,
        support_aftersales: 85,
      },
      catatan_per_kriteria: {
        harga_tco: 'Harga 9% di bawah rata-rata pasar',
        kualitas_track_record: 'Track record baik di 3 pengadaan sebelumnya',
      },
      lolos_threshold: true,
      unique_offerings: null,
      profil_kualitatif: null,
      tingkat_kesesuaian_preferensi: null,
    },
    {
      id: 'hasil-vendor-atk-2',
      hasil_evaluasi_id: 'hasil-eval-selesai-001',
      vendor_id: 'vendor-atk-2',
      vendor_nama: 'CV Alat Tulis Nusantara',
      rank: 2,
      skor_total: 74.2,
      skor_per_kriteria: {
        harga_tco: 70,
        kualitas_track_record: 75,
        kemampuan_delivery: 88,
        risiko_legalitas: 72,
        support_aftersales: 68,
      },
      catatan_per_kriteria: {
        kemampuan_delivery: 'Kapasitas delivery terbesar di antara kandidat',
      },
      lolos_threshold: true,
      unique_offerings: null,
      profil_kualitatif: null,
      tingkat_kesesuaian_preferensi: null,
    },
    {
      id: 'hasil-vendor-atk-3',
      hasil_evaluasi_id: 'hasil-eval-selesai-001',
      vendor_id: 'vendor-atk-3',
      vendor_nama: 'Toko Jaya Stationery',
      rank: 3,
      skor_total: 52.1,
      skor_per_kriteria: {
        harga_tco: 55,
        kualitas_track_record: 48,
        kemampuan_delivery: 50,
        risiko_legalitas: 58,
        support_aftersales: 45,
      },
      catatan_per_kriteria: null,
      lolos_threshold: false,
      unique_offerings: null,
      profil_kualitatif: null,
      tingkat_kesesuaian_preferensi: null,
    },
  ],
};

// Fixture 2: eval-approval-001 — ada preferensi + konflik antara rekomendasi TOPSIS dan preferensi
const HASIL_APPROVAL_001: HasilEvaluasi = {
  id: 'hasil-eval-approval-001',
  evaluasi_id: 'eval-approval-001',
  metodologi: 'TOPSIS',
  vendor_rekomendasi_id: 'vendor-sec-1',
  vendor_rekomendasi_nama: 'PT Cyber Shield Indonesia',
  reasoning_utama: 'PT Cyber Shield Indonesia memiliki skor TOPSIS tertinggi (91.0) berkat kombinasi kepatuhan legalitas dan kualitas layanan audit yang konsisten.',
  kelemahan_utama: 'Biaya lebih tinggi 12% dibanding rata-rata pasar untuk lingkup audit yang sama.',
  rekomendasi_negosiasi: 'Minta diskon volume jika kontrak diperpanjang menjadi dua tahun.',
  summary_komparatif_kualitatif: null,
  preference_matching_result: {
    mode: 'opinionated',
    narasi_pengantar: 'Berdasarkan preferensi vendor bersertifikat ISO 27001, PT Aman Sentosa Digital paling sesuai konteks bisnis Anda.',
  },
  conflict_callout: {
    vendor_terbaik_topsis_id: 'vendor-sec-1',
    vendor_terbaik_preferensi_id: 'vendor-sec-2',
    catatan_konflik: 'Vendor terbaik berdasarkan TOPSIS (PT Cyber Shield Indonesia) berbeda dari vendor yang paling sesuai preferensi ISO 27001 (PT Aman Sentosa Digital).',
  },
  ada_data_tidak_lengkap: false,
  agent_gagal: null,
  calculated_at: '2026-06-14T15:00:00Z',
  kriteria: KRITERIA,
  vendors: [
    {
      id: 'hasil-vendor-sec-1',
      hasil_evaluasi_id: 'hasil-eval-approval-001',
      vendor_id: 'vendor-sec-1',
      vendor_nama: 'PT Cyber Shield Indonesia',
      rank: 1,
      skor_total: 91.0,
      skor_per_kriteria: {
        harga_tco: 78,
        kualitas_track_record: 95,
        kemampuan_delivery: 90,
        risiko_legalitas: 96,
        support_aftersales: 88,
      },
      catatan_per_kriteria: null,
      lolos_threshold: true,
      unique_offerings: null,
      profil_kualitatif: null,
      tingkat_kesesuaian_preferensi: 'sedang',
    },
    {
      id: 'hasil-vendor-sec-2',
      hasil_evaluasi_id: 'hasil-eval-approval-001',
      vendor_id: 'vendor-sec-2',
      vendor_nama: 'PT Aman Sentosa Digital',
      rank: 2,
      skor_total: 85.4,
      skor_per_kriteria: {
        harga_tco: 82,
        kualitas_track_record: 86,
        kemampuan_delivery: 80,
        risiko_legalitas: 92,
        support_aftersales: 90,
      },
      catatan_per_kriteria: null,
      lolos_threshold: true,
      unique_offerings: null,
      profil_kualitatif: null,
      tingkat_kesesuaian_preferensi: 'tinggi',
    },
  ],
};

const HASIL_BY_EVALUASI_ID: Record<string, HasilEvaluasi> = {
  'eval-selesai-001':  HASIL_SELESAI_001,
  'eval-approval-001': HASIL_APPROVAL_001,
};

export const handlers = [
  // GET /api/v1/evaluasi/:id/hasil
  http.get('http://localhost:3001/api/v1/evaluasi/:id/hasil', ({ params }) => {
    const id = params.id as string;
    const hasil = HASIL_BY_EVALUASI_ID[id];

    if (!hasil) {
      return HttpResponse.json(
        { success: false, error: { code: 'HASIL_NOT_FOUND', message: 'Hasil evaluasi belum tersedia. Proses AI mungkin belum selesai.' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: hasil });
  }),
];
