import { apiFetch } from './client';
import type { HasilEvaluasi } from 'types';

export async function getHasilEvaluasi(evaluasiId: string): Promise<HasilEvaluasi> {
  return apiFetch<HasilEvaluasi>(`/api/v1/evaluasi/${evaluasiId}/hasil`);
}
