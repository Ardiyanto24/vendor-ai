// User types
export type UserRole = 'staff' | 'manager';

export interface User {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// API Response wrapper
export interface APIResponseSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface APIResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type APIResponse<T> = APIResponseSuccess<T> | APIResponseError;

// Evaluasi status enum
export type EvaluasiStatus = 
  | 'draft' 
  | 'processing' 
  | 'selesai' 
  | 'menunggu_approval' 
  | 'approved' 
  | 'butuh_revisi';

// Evaluasi entity
export interface Evaluasi {
  id: string;
  judul: string;
  kategori: string;
  deskripsi?: string | null;
  status: EvaluasiStatus;
  budget_min?: number | null;
  budget_max: number;
  deadline: string;
  prioritas_kriteria?: string[] | null;
  lampiran_url?: string | null;
  created_by: string;
  preferensi_perusahaan?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Vendor entity
export interface Vendor {
  id: string;
  evaluasi_id: string;
  nama_perusahaan: string;
  kontak_atau_website?: string | null;
  harga_penawaran: number;
  catatan?: string | null;
  sumber_input: 'manual' | 'extracted';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Konfigurasi Kriteria
export type KategoriPengadaan =
  | 'it_hardware'
  | 'it_software'
  | 'jasa_it'
  | 'jasa_konsultasi'
  | 'alat_tulis_kantor';

export interface KategoriPengadaanOption {
  value: KategoriPengadaan;
  label: string;
}

export interface KriteriaItem {
  key: string;
  label: string;
  bobot: number;
  threshold_min: number;
}

export interface KonfigurasiKriteria {
  id: string;
  kategori: KategoriPengadaan;
  kriteria: KriteriaItem[];
  updated_by: string;
  updated_at: string;
}

export interface EvaluasiDetail extends Evaluasi {
  vendors: Vendor[];
}

export interface CreateEvaluasiPayload {
  judul: string;
  kategori: string;
  deskripsi: string;
  budgetMin?: number;
  budgetMax: number;
  deadline: string;
  prioritasKriteria?: string[];
  lampiranUrl?: string;
  preferensiPerusahaan?: string;
}

export interface AddVendorPayload {
  namaPerusahaan: string;
  kontakAtauWebsite?: string;
  hargaPenawaran: number;
  catatan?: string;
  sumberInput: 'manual' | 'extracted';
}

// Approval workflow (F-09)
export type ApprovalKeputusan = 'approved' | 'rejected';

export interface ApprovalLog {
  id: string;
  evaluasi_id: string;
  manager_id: string;
  keputusan: ApprovalKeputusan;
  komentar?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SubmitApprovalPayload {
  keputusan: ApprovalKeputusan;
  komentar?: string;
}

// Dokumen upload & ekstraksi (F-07)
export type StatusEkstraksi = 'pending' | 'processing' | 'done' | 'done_partial' | 'failed';

export type IndexingRagStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped_no_text';

export interface EkstraksiField<T> {
  nilai: T | null;
  confidence: number;
}

// Struktur JSON hasil ekstraksi AI — lihat AI-02 section 7.2
export interface HasilEkstraksi {
  nama_perusahaan: EkstraksiField<string>;
  harga_penawaran: EkstraksiField<number> & { mata_uang?: string };
  kontak: EkstraksiField<string>;
  spesifikasi_ditawarkan: EkstraksiField<string[]>;
  masa_garansi: EkstraksiField<string>;
  payment_terms: EkstraksiField<string>;
  catatan_ekstraksi?: string | null;
  confidence_overall: number;
}

export interface UploadDokumenResponse {
  uploadId: string;
  evaluasiId: string;
  fileType: 'pdf' | 'excel';
  fileSizeBytes: number;
  statusEkstraksi: StatusEkstraksi;
  createdAt: string;
}

export interface DokumenStatusResponse {
  uploadId: string;
  status: StatusEkstraksi;
  hasilEkstraksi: HasilEkstraksi | null;
  confidenceScore: number | null;
  indexingRagStatus: IndexingRagStatus | null;
  chunkCount: number | null;
  updatedAt: string;
}
