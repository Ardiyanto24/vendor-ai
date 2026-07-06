import { http, HttpResponse } from 'msw';
import type { HasilEkstraksi, StatusEkstraksi } from 'types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls'];

// Files whose name contains this marker resolve to a failed extraction —
// used by tests to exercise the error/fallback path without a real backend.
const FAILING_FILENAME_MARKER = 'gagal';

interface MockDokumen {
  uploadId: string;
  evaluasiId: string;
  fileName: string;
  pollCount: number;
  shouldFail: boolean;
}

const _dokumenById = new Map<string, MockDokumen>();
let _uploadCounter = 0;

export function resetMockDokumenState() {
  _dokumenById.clear();
  _uploadCounter = 0;
}

// Test-only helper — lets integration tests seed polling state directly when
// the upload POST itself is mocked out (jsdom's FormData doesn't interop
// cleanly with undici's fetch, so multipart uploads can't run through MSW
// in that environment).
export function seedMockDokumen(
  uploadId: string,
  evaluasiId: string,
  fileName: string,
  shouldFail = false
) {
  _dokumenById.set(uploadId, { uploadId, evaluasiId, fileName, pollCount: 0, shouldFail });
}

function buildHasilEkstraksi(lowConfidence: boolean): HasilEkstraksi {
  const confidence = lowConfidence ? 0.42 : 0.91;
  return {
    nama_perusahaan: { nilai: 'PT Ekstraksi Otomatis', confidence },
    harga_penawaran: { nilai: 87_500_000, confidence, mata_uang: 'IDR' },
    kontak: { nilai: 'kontak@ekstraksiotomatis.co.id', confidence },
    spesifikasi_ditawarkan: { nilai: ['Garansi 2 tahun', 'Instalasi gratis'], confidence },
    masa_garansi: { nilai: '24 bulan', confidence },
    payment_terms: { nilai: 'DP 30%, pelunasan setelah instalasi', confidence },
    catatan_ekstraksi: 'Ekstraksi otomatis dari dokumen penawaran',
    confidence_overall: confidence,
  };
}

export const handlers = [
  // POST /api/v1/evaluasi/:id/dokumen — upload dokumen penawaran
  http.post('http://localhost:3001/api/v1/evaluasi/:id/dokumen', async ({ params, request }) => {
    const evaluasiId = params.id as string;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Field "file" wajib diisi' } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return HttpResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'Ukuran file melebihi batas maksimum 10MB' } },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Format file tidak didukung. Hanya PDF dan Excel yang diizinkan' } },
        { status: 400 }
      );
    }

    const uploadId = `upload-${++_uploadCounter}`;
    _dokumenById.set(uploadId, {
      uploadId,
      evaluasiId,
      fileName: file.name,
      pollCount: 0,
      shouldFail: file.name.toLowerCase().includes(FAILING_FILENAME_MARKER),
    });

    return HttpResponse.json(
      {
        success: true,
        data: {
          uploadId,
          evaluasiId,
          fileType: ext === 'pdf' ? 'pdf' : 'excel',
          fileSizeBytes: file.size,
          statusEkstraksi: 'pending' as StatusEkstraksi,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 202 }
    );
  }),

  // GET /api/v1/evaluasi/:id/dokumen/:uploadId/status — polling ekstraksi
  http.get(
    'http://localhost:3001/api/v1/evaluasi/:id/dokumen/:uploadId/status',
    ({ params }) => {
      const uploadId = params.uploadId as string;
      const dokumen = _dokumenById.get(uploadId);

      if (!dokumen) {
        return HttpResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Dokumen tidak ditemukan' } },
          { status: 404 }
        );
      }

      dokumen.pollCount += 1;

      // First poll always reports "processing" so the FE loading state is exercised.
      if (dokumen.pollCount < 2) {
        return HttpResponse.json({
          success: true,
          data: {
            uploadId,
            status: 'processing' as StatusEkstraksi,
            hasilEkstraksi: null,
            confidenceScore: null,
            indexingRagStatus: null,
            chunkCount: null,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      if (dokumen.shouldFail) {
        return HttpResponse.json({
          success: true,
          data: {
            uploadId,
            status: 'failed' as StatusEkstraksi,
            hasilEkstraksi: null,
            confidenceScore: null,
            indexingRagStatus: null,
            chunkCount: null,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      const lowConfidence = dokumen.fileName.toLowerCase().includes('rendah');

      return HttpResponse.json({
        success: true,
        data: {
          uploadId,
          status: 'done' as StatusEkstraksi,
          hasilEkstraksi: buildHasilEkstraksi(lowConfidence),
          confidenceScore: lowConfidence ? 0.42 : 0.91,
          // RAG indexing lags one poll behind extraction completion.
          indexingRagStatus: dokumen.pollCount < 3 ? 'processing' : 'done',
          chunkCount: dokumen.pollCount < 3 ? null : 12,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  ),
];
