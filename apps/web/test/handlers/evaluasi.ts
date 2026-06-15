import { http, HttpResponse } from 'msw';
import type { EvaluasiStatus } from 'types';

interface MockEvaluasi {
  id: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  status: EvaluasiStatus;
  budget_min: number | null;
  budget_max: number;
  deadline: string;
  prioritas_kriteria: string[] | null;
  lampiran_url: string | null;
  created_by: string;
  preferensi_perusahaan: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const MOCK_EVALUASI: MockEvaluasi[] = [
  {
    id: 'eval-draft-001',
    judul: 'Pengadaan Laptop Kantor 2026',
    kategori: 'it_hardware',
    deskripsi: 'Pengadaan laptop untuk kebutuhan operasional',
    status: 'draft',
    budget_min: 50000000,
    budget_max: 100000000,
    deadline: '2026-08-01',
    prioritas_kriteria: ['harga_tco', 'kualitas_track_record'],
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: null,
    created_at: '2026-06-10T08:00:00Z',
    updated_at: '2026-06-10T08:00:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-draft-002',
    judul: 'Pembelian Software Akuntansi',
    kategori: 'it_software',
    deskripsi: 'Software akuntansi untuk departemen keuangan',
    status: 'draft',
    budget_min: null,
    budget_max: 80000000,
    deadline: '2026-09-15',
    prioritas_kriteria: null,
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: null,
    created_at: '2026-06-11T09:00:00Z',
    updated_at: '2026-06-11T09:00:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-processing-001',
    judul: 'Jasa Konsultansi IT Infrastructure',
    kategori: 'jasa_it',
    deskripsi: 'Layanan konsultasi untuk peningkatan infrastruktur IT',
    status: 'processing',
    budget_min: 200000000,
    budget_max: 500000000,
    deadline: '2026-07-20',
    prioritas_kriteria: ['kemampuan_delivery', 'kualitas_track_record'],
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: 'Preferensi vendor lokal dengan pengalaman minimal 5 tahun.',
    created_at: '2026-06-12T10:00:00Z',
    updated_at: '2026-06-12T10:30:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-selesai-001',
    judul: 'Pengadaan ATK Semester II',
    kategori: 'alat_tulis_kantor',
    deskripsi: 'Alat tulis kantor untuk semester kedua 2026',
    status: 'selesai',
    budget_min: null,
    budget_max: 30000000,
    deadline: '2026-07-01',
    prioritas_kriteria: ['harga_tco'],
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: null,
    created_at: '2026-06-05T08:00:00Z',
    updated_at: '2026-06-13T14:00:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-selesai-002',
    judul: 'Jasa Konsultansi Manajemen',
    kategori: 'jasa_konsultasi',
    deskripsi: 'Konsultansi untuk transformasi digital',
    status: 'selesai',
    budget_min: 100000000,
    budget_max: 300000000,
    deadline: '2026-07-10',
    prioritas_kriteria: ['kualitas_track_record'],
    lampiran_url: null,
    created_by: 'user-staff-002',
    preferensi_perusahaan: null,
    created_at: '2026-06-03T09:00:00Z',
    updated_at: '2026-06-13T16:00:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-selesai-003',
    judul: 'Pengadaan Server Data Center',
    kategori: 'it_hardware',
    deskripsi: 'Server untuk data center baru',
    status: 'selesai',
    budget_min: 500000000,
    budget_max: 1000000000,
    deadline: '2026-08-31',
    prioritas_kriteria: ['kualitas_track_record', 'support_aftersales'],
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: null,
    created_at: '2026-06-01T08:00:00Z',
    updated_at: '2026-06-14T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'eval-approval-001',
    judul: 'Pengadaan Jasa Security Audit',
    kategori: 'jasa_it',
    deskripsi: 'Audit keamanan sistem informasi tahunan',
    status: 'menunggu_approval',
    budget_min: 50000000,
    budget_max: 150000000,
    deadline: '2026-07-31',
    prioritas_kriteria: ['risiko_legalitas', 'kualitas_track_record'],
    lampiran_url: null,
    created_by: 'user-staff-001',
    preferensi_perusahaan: 'Vendor bersertifikat ISO 27001',
    created_at: '2026-06-08T08:00:00Z',
    updated_at: '2026-06-14T15:00:00Z',
    deleted_at: null,
  },
];

type StatusCount = Record<EvaluasiStatus, number>;

export const handlers = [
  // GET /api/v1/evaluasi — daftar dengan filter dan pagination
  http.get('http://localhost:3001/api/v1/evaluasi', ({ request }) => {
    const url      = new URL(request.url);
    const status   = url.searchParams.get('status') as EvaluasiStatus | null;
    const kategori = url.searchParams.get('kategori');
    const search   = url.searchParams.get('search');
    const page     = parseInt(url.searchParams.get('page')  ?? '1',  10);
    const limit    = parseInt(url.searchParams.get('limit') ?? '20', 10);

    let filtered = [...MOCK_EVALUASI];
    if (status)   filtered = filtered.filter(e => e.status === status);
    if (kategori) filtered = filtered.filter(e => e.kategori === kategori);
    if (search)   filtered = filtered.filter(e =>
      e.judul.toLowerCase().includes(search.toLowerCase())
    );

    const total      = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const items      = filtered.slice((page - 1) * limit, page * limit);

    return HttpResponse.json({
      success: true,
      data: {
        items,
        meta: { page, limit, total, totalPages },
      },
    });
  }),

  // GET /api/v1/evaluasi/summary — agregat per status
  http.get('http://localhost:3001/api/v1/evaluasi/summary', () => {
    const counts: StatusCount = {
      draft:             0,
      processing:        0,
      selesai:           0,
      menunggu_approval: 0,
      approved:          0,
      butuh_revisi:      0,
    };

    MOCK_EVALUASI.forEach(e => { counts[e.status]++; });

    return HttpResponse.json({ success: true, data: counts });
  }),
];
