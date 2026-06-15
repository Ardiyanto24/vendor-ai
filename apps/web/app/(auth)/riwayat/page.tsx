'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, History, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EvaluasiStatus, KategoriPengadaan } from 'types';
import { getEvaluasiList } from '@/lib/api/evaluasi';
import EvaluasiRow from '@/components/composite/EvaluasiRow';

const STATUS_OPTIONS: { value: EvaluasiStatus; label: string }[] = [
  { value: 'draft',             label: 'Draft' },
  { value: 'processing',        label: 'Diproses AI' },
  { value: 'selesai',           label: 'Selesai' },
  { value: 'menunggu_approval', label: 'Menunggu Approval' },
  { value: 'approved',          label: 'Disetujui' },
  { value: 'butuh_revisi',      label: 'Butuh Revisi' },
];

const KATEGORI_OPTIONS: { value: KategoriPengadaan; label: string }[] = [
  { value: 'it_hardware',       label: 'IT Hardware' },
  { value: 'it_software',       label: 'IT Software' },
  { value: 'jasa_it',           label: 'Jasa IT' },
  { value: 'jasa_konsultasi',   label: 'Jasa Konsultasi' },
  { value: 'alat_tulis_kantor', label: 'Alat Tulis Kantor' },
];

const SELECT_CLASS =
  'px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 ' +
  'text-sm text-white focus:outline-none focus:border-blue-500/60 cursor-pointer';

function getEvaluasiRoute(id: string, status: EvaluasiStatus): string {
  if (status === 'processing') return `/evaluasi/${id}/proses`;
  if (status === 'draft')      return `/evaluasi/baru`;
  return `/evaluasi/${id}/hasil`;
}

export default function RiwayatPage() {
  const router = useRouter();

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status,          setStatus]          = useState<EvaluasiStatus | ''>('');
  const [kategori,        setKategori]        = useState<KategoriPengadaan | ''>('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');
  const [page,            setPage]            = useState(1);

  // Debounce search — 300ms, reset page on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const resetPage = () => setPage(1);

  const hasActiveFilter = !!(status || kategori || debouncedSearch || dateFrom || dateTo);

  const filters = {
    status:   status   || undefined,
    kategori: kategori || undefined,
    search:   debouncedSearch || undefined,
    dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
    dateTo:   dateTo   ? `${dateTo}T23:59:59.999Z`   : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey:  ['evaluasi', 'list', filters],
    queryFn:   () => getEvaluasiList(filters),
    staleTime: 60_000,
  });

  const items      = data?.items      ?? [];
  const total      = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setKategori('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Riwayat Evaluasi</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Semua evaluasi yang pernah dibuat
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama evaluasi..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10
              text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as EvaluasiStatus | ''); resetPage(); }}
          className={SELECT_CLASS}
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Kategori */}
        <select
          value={kategori}
          onChange={(e) => { setKategori(e.target.value as KategoriPengadaan | ''); resetPage(); }}
          className={SELECT_CLASS}
        >
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
            className={SELECT_CLASS}
          />
          <span className="text-xs text-gray-500">s/d</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
            className={SELECT_CLASS}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between min-h-[20px]">
        <p className="text-xs text-gray-500">
          {isFetching && !isLoading
            ? 'Memperbarui...'
            : `${total} evaluasi ditemukan`}
        </p>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
          <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
          Memuat data...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <History className="w-8 h-8 text-gray-600 mb-2" />
          <p className="text-sm text-gray-500">Tidak ada evaluasi yang ditemukan.</p>
          {hasActiveFilter && (
            <p className="text-xs text-gray-600 mt-1">Coba ubah atau hapus filter pencarian.</p>
          )}
        </div>
      )}

      {/* List */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2" role="rowgroup">
          {items.map((ev) => (
            <EvaluasiRow
              key={ev.id}
              evaluasi={{
                id:        ev.id,
                judul:     ev.judul,
                kategori:  ev.kategori,
                status:    ev.status,
                createdAt: ev.created_at,
              }}
              onClick={() => router.push(getEvaluasiRoute(ev.id, ev.status))}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 tabular-nums">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
