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

interface MockVendor {
  id: string;
  evaluasi_id: string;
  nama_perusahaan: string;
  kontak_atau_website: string | null;
  harga_penawaran: number;
  catatan: string | null;
  sumber_input: 'manual' | 'extracted';
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

// ---------------------------------------------------------------------------
// Mutable state for F-06 scenarios (POST/GET detail/vendor operations)
// ---------------------------------------------------------------------------
let _evalCounter = 0;
let _vendorCounter = 0;
const _newEvaluasiMap = new Map<string, MockEvaluasi>();
const _vendorsByEvaluasi = new Map<string, MockVendor[]>();
const _statusOverrides = new Map<string, EvaluasiStatus>();

export function resetMockEvaluasiState() {
  _evalCounter = 0;
  _vendorCounter = 0;
  _newEvaluasiMap.clear();
  _vendorsByEvaluasi.clear();
  _statusOverrides.clear();
}

function getAllEvaluasi(): MockEvaluasi[] {
  return [...MOCK_EVALUASI, ...Array.from(_newEvaluasiMap.values())].map((e) =>
    _statusOverrides.has(e.id) ? { ...e, status: _statusOverrides.get(e.id)! } : e
  );
}

function getVendors(evaluasiId: string): MockVendor[] {
  return _vendorsByEvaluasi.get(evaluasiId) ?? [];
}

// ---------------------------------------------------------------------------

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

    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo   = url.searchParams.get('dateTo');

    let filtered = getAllEvaluasi();
    if (status)   filtered = filtered.filter(e => e.status === status);
    if (kategori) filtered = filtered.filter(e => e.kategori === kategori);
    if (search)   filtered = filtered.filter(e =>
      e.judul.toLowerCase().includes(search.toLowerCase())
    );
    if (dateFrom) filtered = filtered.filter(e => e.created_at >= dateFrom);
    if (dateTo)   filtered = filtered.filter(e => e.created_at <= dateTo);

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

  // GET /api/v1/evaluasi/summary — summary MUST come before :id handler
  http.get('http://localhost:3001/api/v1/evaluasi/summary', () => {
    const counts: StatusCount = {
      draft:             0,
      processing:        0,
      selesai:           0,
      menunggu_approval: 0,
      approved:          0,
      butuh_revisi:      0,
    };

    getAllEvaluasi().forEach(e => { counts[e.status]++; });

    return HttpResponse.json({ success: true, data: counts });
  }),

  // POST /api/v1/evaluasi — buat evaluasi baru dengan status draft
  http.post('http://localhost:3001/api/v1/evaluasi', async ({ request }) => {
    const body = await request.json() as {
      judul: string;
      kategori: string;
      deskripsi: string;
      budgetMin?: number | null;
      budgetMax: number;
      deadline: string;
      prioritasKriteria?: string[] | null;
      lampiranUrl?: string | null;
      preferensiPerusahaan?: string | null;
    };

    const id = `new-eval-${++_evalCounter}`;
    const now = new Date().toISOString();

    const newEval: MockEvaluasi = {
      id,
      judul:                body.judul,
      kategori:             body.kategori,
      deskripsi:            body.deskripsi,
      status:               'draft',
      budget_min:           body.budgetMin ?? null,
      budget_max:           body.budgetMax,
      deadline:             body.deadline,
      prioritas_kriteria:   body.prioritasKriteria ?? null,
      lampiran_url:         body.lampiranUrl ?? null,
      created_by:           'user-staff-001',
      preferensi_perusahaan: body.preferensiPerusahaan ?? null,
      created_at:           now,
      updated_at:           now,
      deleted_at:           null,
    };

    _newEvaluasiMap.set(id, newEval);
    _vendorsByEvaluasi.set(id, []);

    return HttpResponse.json({ success: true, data: newEval }, { status: 201 });
  }),

  // GET /api/v1/evaluasi/:id — detail + vendors
  http.get('http://localhost:3001/api/v1/evaluasi/:id', ({ params }) => {
    const id = params.id as string;
    const allEval = getAllEvaluasi();
    const evaluasi = allEval.find(e => e.id === id);

    if (!evaluasi) {
      return HttpResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404 }
      );
    }

    const vendors = getVendors(id);
    return HttpResponse.json({ success: true, data: { ...evaluasi, vendors } });
  }),

  // POST /api/v1/evaluasi/:id/vendor — tambah vendor (max 10)
  http.post('http://localhost:3001/api/v1/evaluasi/:id/vendor', async ({ params, request }) => {
    const evaluasiId = params.id as string;
    const allEval = getAllEvaluasi();
    const evaluasi = allEval.find(e => e.id === evaluasiId);

    if (!evaluasi) {
      return HttpResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404 }
      );
    }

    const vendors = getVendors(evaluasiId);

    if (vendors.length >= 10) {
      return HttpResponse.json(
        { success: false, error: { code: 'VENDOR_LIMIT_EXCEEDED', message: 'Evaluasi sudah mencapai batas maksimum 10 vendor' } },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      namaPerusahaan: string;
      kontakAtauWebsite?: string | null;
      hargaPenawaran: number;
      catatan?: string | null;
      sumberInput: 'manual' | 'extracted';
    };

    const now = new Date().toISOString();
    const newVendor: MockVendor = {
      id:                  `vendor-${++_vendorCounter}`,
      evaluasi_id:         evaluasiId,
      nama_perusahaan:     body.namaPerusahaan,
      kontak_atau_website: body.kontakAtauWebsite ?? null,
      harga_penawaran:     body.hargaPenawaran,
      catatan:             body.catatan ?? null,
      sumber_input:        body.sumberInput,
      created_at:          now,
      updated_at:          now,
      deleted_at:          null,
    };

    _vendorsByEvaluasi.set(evaluasiId, [...vendors, newVendor]);

    return HttpResponse.json({ success: true, data: newVendor }, { status: 201 });
  }),

  // DELETE /api/v1/evaluasi/:id/vendor/:vendorId — hapus vendor (soft delete)
  http.delete('http://localhost:3001/api/v1/evaluasi/:id/vendor/:vendorId', ({ params }) => {
    const { id: evaluasiId, vendorId } = params as { id: string; vendorId: string };
    const vendors = getVendors(evaluasiId);
    const exists = vendors.some(v => v.id === vendorId);

    if (!exists) {
      return HttpResponse.json(
        { success: false, error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor tidak ditemukan' } },
        { status: 404 }
      );
    }

    _vendorsByEvaluasi.set(evaluasiId, vendors.filter(v => v.id !== vendorId));

    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/evaluasi/:id/submit — validasi min 2 vendor, ubah status
  http.post('http://localhost:3001/api/v1/evaluasi/:id/submit', ({ params }) => {
    const evaluasiId = params.id as string;
    const allEval = getAllEvaluasi();
    const evaluasi = allEval.find(e => e.id === evaluasiId);

    if (!evaluasi) {
      return HttpResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404 }
      );
    }

    const vendors = getVendors(evaluasiId);

    if (vendors.length < 2) {
      return HttpResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_VENDORS', message: 'Evaluasi membutuhkan minimal 2 vendor untuk disubmit' } },
        { status: 400 }
      );
    }

    // Update status in mock state
    if (_newEvaluasiMap.has(evaluasiId)) {
      const updated = { ..._newEvaluasiMap.get(evaluasiId)!, status: 'processing' as EvaluasiStatus };
      _newEvaluasiMap.set(evaluasiId, updated);
    }

    return HttpResponse.json(
      { success: true, data: { evaluasiId, message: 'Proses evaluasi AI telah dimulai' } },
      { status: 202 }
    );
  }),

  // PATCH /api/v1/evaluasi/:id/status — staff kirim evaluasi 'selesai' ke approval
  http.patch('http://localhost:3001/api/v1/evaluasi/:id/status', ({ params }) => {
    const evaluasiId = params.id as string;
    const evaluasi = getAllEvaluasi().find(e => e.id === evaluasiId);

    if (!evaluasi) {
      return HttpResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404 }
      );
    }

    if (evaluasi.status !== 'selesai') {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_PENDING_APPROVAL', message: 'Evaluasi hanya bisa dikirim ke approval setelah statusnya selesai' } },
        { status: 409 }
      );
    }

    _statusOverrides.set(evaluasiId, 'menunggu_approval');

    return HttpResponse.json(
      { success: true, data: { ...evaluasi, status: 'menunggu_approval' } },
      { status: 200 }
    );
  }),

  // POST /api/v1/evaluasi/:id/approval — manager approve/reject
  http.post('http://localhost:3001/api/v1/evaluasi/:id/approval', async ({ params, request }) => {
    const evaluasiId = params.id as string;
    const evaluasi = getAllEvaluasi().find(e => e.id === evaluasiId);

    if (!evaluasi) {
      return HttpResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404 }
      );
    }

    if (evaluasi.status !== 'menunggu_approval') {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_PENDING_APPROVAL', message: 'Evaluasi tidak dalam status menunggu approval' } },
        { status: 409 }
      );
    }

    const body = await request.json() as { keputusan: 'approved' | 'rejected'; komentar?: string | null };

    if (body.keputusan === 'rejected' && (!body.komentar || body.komentar.trim() === '')) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Komentar wajib diisi saat menolak evaluasi' } },
        { status: 400 }
      );
    }

    const newStatus: EvaluasiStatus = body.keputusan === 'approved' ? 'approved' : 'butuh_revisi';
    _statusOverrides.set(evaluasiId, newStatus);

    return HttpResponse.json(
      { success: true, data: { ...evaluasi, status: newStatus } },
      { status: 200 }
    );
  }),
];
