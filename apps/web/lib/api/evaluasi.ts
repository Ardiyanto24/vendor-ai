import { apiFetch } from './client';
import type {
  Evaluasi,
  EvaluasiDetail,
  EvaluasiStatus,
  CreateEvaluasiPayload,
  AddVendorPayload,
  Vendor,
  UploadDokumenResponse,
  DokumenStatusResponse,
} from 'types';

export interface EvaluasiListFilters {
  status?: EvaluasiStatus;
  kategori?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EvaluasiListData {
  items: Evaluasi[];
  meta: PaginationMeta;
}

export interface EvaluasiSummary {
  draft: number;
  processing: number;
  selesai: number;
  menunggu_approval: number;
  approved: number;
  butuh_revisi: number;
}

export async function getEvaluasiList(filters: EvaluasiListFilters = {}): Promise<EvaluasiListData> {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.kategori) params.set('kategori', filters.kategori);
  if (filters.search)   params.set('search',   filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo)   params.set('dateTo',   filters.dateTo);
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.limit)    params.set('limit',    String(filters.limit));

  const query = params.toString();
  return apiFetch<EvaluasiListData>(`/api/v1/evaluasi${query ? `?${query}` : ''}`);
}

export async function getEvaluasiSummary(): Promise<EvaluasiSummary> {
  return apiFetch<EvaluasiSummary>('/api/v1/evaluasi/summary');
}

export async function createEvaluasi(payload: CreateEvaluasiPayload): Promise<Evaluasi> {
  return apiFetch<Evaluasi>('/api/v1/evaluasi', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEvaluasiDetail(id: string): Promise<EvaluasiDetail> {
  return apiFetch<EvaluasiDetail>(`/api/v1/evaluasi/${id}`);
}

export async function addVendor(evaluasiId: string, payload: AddVendorPayload): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/v1/evaluasi/${evaluasiId}/vendor`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeVendor(evaluasiId: string, vendorId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/evaluasi/${evaluasiId}/vendor/${vendorId}`, {
    method: 'DELETE',
  });
}

export async function submitEvaluasi(evaluasiId: string): Promise<{ evaluasiId: string; message: string }> {
  return apiFetch<{ evaluasiId: string; message: string }>(
    `/api/v1/evaluasi/${evaluasiId}/submit`,
    { method: 'POST' }
  );
}

export async function uploadDokumen(
  evaluasiId: string,
  file: File,
  namaVendorHint?: string
): Promise<UploadDokumenResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (namaVendorHint) formData.append('namaVendorHint', namaVendorHint);

  return apiFetch<UploadDokumenResponse>(`/api/v1/evaluasi/${evaluasiId}/dokumen`, {
    method: 'POST',
    body: formData,
  });
}

export async function getDokumenStatus(
  evaluasiId: string,
  uploadId: string
): Promise<DokumenStatusResponse> {
  return apiFetch<DokumenStatusResponse>(
    `/api/v1/evaluasi/${evaluasiId}/dokumen/${uploadId}/status`
  );
}
