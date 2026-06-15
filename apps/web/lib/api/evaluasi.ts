import { apiFetch } from './client';
import type { Evaluasi, EvaluasiStatus } from 'types';

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
