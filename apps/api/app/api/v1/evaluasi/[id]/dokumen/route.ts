import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

function resolveFileType(mimeType: string, fileName: string): 'pdf' | 'excel' | null {
  const ext = fileName.toLowerCase().split('.').pop();
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) return 'excel';
  return null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

// Fire-and-forget to FastAPI extraction service.
async function triggerEkstraksi(
  uploadId: string,
  evaluasiId: string,
  storagePath: string,
  fileType: string,
  fileName: string,
): Promise<void> {
  const fastApiUrl = process.env.FASTAPI_BASE_URL;
  const serviceToken = process.env.SERVICE_TO_SERVICE_TOKEN;
  if (!fastApiUrl) return;

  try {
    await fetch(`${fastApiUrl}/v1/agent/ekstrak-dokumen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(serviceToken ? { 'X-Service-Token': serviceToken } : {}),
      },
      body: JSON.stringify({ uploadId, evaluasiId, storagePath, fileType, fileName }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    console.warn(`[dokumen] FastAPI tidak dapat dijangkau untuk upload ${uploadId} — ekstraksi akan dilakukan saat service tersedia`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/evaluasi/:id/dokumen
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role   = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    const { id: evaluasiId } = params;

    // Verify evaluasi ownership and status
    const { data: evaluasi, error: evalError } = await supabase
      .from('evaluasi')
      .select('id, created_by, status')
      .eq('id', evaluasiId)
      .is('deleted_at', null)
      .single();

    if (evalError || !evaluasi) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_FOUND', message: 'Evaluasi tidak ditemukan' } },
        { status: 404, headers: SECURITY_HEADERS },
      );
    }

    if (evaluasi.created_by !== userId && role !== 'manager') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke evaluasi ini.' } },
        { status: 403, headers: SECURITY_HEADERS },
      );
    }

    if (evaluasi.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUASI_NOT_EDITABLE', message: 'Dokumen hanya dapat diunggah ke evaluasi berstatus draft' } },
        { status: 409, headers: SECURITY_HEADERS },
      );
    }

    // Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Request harus berformat multipart/form-data' } },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Field "file" wajib diisi' } },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'Ukuran file melebihi batas maksimum 10MB' } },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    // File type validation — check both MIME type and extension
    const isAllowedMime = ALLOWED_MIME_TYPES.has(file.type);
    const fileType = resolveFileType(file.type, file.name);

    if (!isAllowedMime || !fileType) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Format file tidak didukung. Hanya PDF dan Excel (.xlsx, .xls) yang diizinkan' } },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    // Generate upload ID and build storage path
    const uploadId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${evaluasiId}/${uploadId}_${safeFileName}`;

    // Upload file to Supabase Storage — service role bypasses storage policies
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabase.storage
      .from('vendor-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error('Error uploading to storage:', storageError);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengunggah file ke storage' } },
        { status: 500, headers: SECURITY_HEADERS },
      );
    }

    // Create dokumen_upload row with pending status
    const { data: dokumen, error: insertError } = await supabase
      .from('dokumen_upload')
      .insert({
        id:                  uploadId,
        evaluasi_id:         evaluasiId,
        file_url:            storagePath,
        file_type:           fileType,
        file_size_bytes:     file.size,
        status_ekstraksi:    'pending',
        indexing_rag_status: 'pending',
      })
      .select('id, evaluasi_id, file_url, file_type, file_size_bytes, status_ekstraksi, indexing_rag_status, created_at')
      .single();

    if (insertError || !dokumen) {
      console.error('Error inserting dokumen_upload:', insertError);
      // Attempt to clean up the uploaded file to avoid orphaned storage objects
      await supabase.storage.from('vendor-documents').remove([storagePath]);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menyimpan metadata dokumen' } },
        { status: 500, headers: SECURITY_HEADERS },
      );
    }

    // Fire-and-forget extraction — do not await
    void triggerEkstraksi(uploadId, evaluasiId, storagePath, fileType, file.name);

    return NextResponse.json(
      {
        success: true,
        data: {
          uploadId:         dokumen.id,
          evaluasiId:       dokumen.evaluasi_id,
          fileType:         dokumen.file_type,
          fileSizeBytes:    dokumen.file_size_bytes,
          statusEkstraksi:  dokumen.status_ekstraksi,
          createdAt:        dokumen.created_at,
        },
      },
      { status: 202, headers: SECURITY_HEADERS },
    );

  } catch (err) {
    console.error('Error in POST /evaluasi/:id/dokumen:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS },
    );
  }
}
