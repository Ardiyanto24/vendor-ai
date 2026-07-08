import { apiFetch } from './client';
import { KategoriPengadaan, KategoriPengadaanOption, KonfigurasiKriteria, KriteriaItem } from 'types';

export async function getKategoriPengadaan(): Promise<KategoriPengadaanOption[]> {
  return apiFetch<KategoriPengadaanOption[]>('/api/v1/kategori-pengadaan');
}

export async function getKonfigurasiKriteria(kategori: KategoriPengadaan): Promise<KonfigurasiKriteria> {
  return apiFetch<KonfigurasiKriteria>(`/api/v1/konfigurasi/kriteria?kategori=${kategori}`);
}

export async function updateKonfigurasiKriteria(
  kategori: KategoriPengadaan,
  kriteria: KriteriaItem[]
): Promise<KonfigurasiKriteria> {
  return apiFetch<KonfigurasiKriteria>('/api/v1/konfigurasi/kriteria', {
    method: 'PUT',
    body: JSON.stringify({ kategori, kriteria }),
  });
}
