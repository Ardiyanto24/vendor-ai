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
export interface Kriteria {
  nama: string;
  bobot: number;
  deskripsi?: string;
}

export interface KonfigurasiKriteria {
  id: string;
  kategori: string;
  kriteria: Kriteria[];
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
