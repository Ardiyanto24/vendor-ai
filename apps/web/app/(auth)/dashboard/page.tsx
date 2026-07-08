'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PlusCircle, LayoutDashboard, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { EvaluasiStatus } from 'types';
import { useAuthStore } from '@/stores/authStore';
import { getEvaluasiList, getEvaluasiSummary } from '@/lib/api/evaluasi';
import EvaluasiRow from '@/components/composite/EvaluasiRow';

function getEvaluasiRoute(id: string, status: EvaluasiStatus): string {
  if (status === 'processing') return `/evaluasi/${id}/proses`;
  if (status === 'draft')      return `/evaluasi/baru`;
  return `/evaluasi/${id}/hasil`;
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      className={clsx(
        'flex flex-col gap-1 px-4 py-4 rounded-xl border',
        highlight
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-white/10 bg-white/[0.02]'
      )}
    >
      <p className="text-xs text-gray-400">{label}</p>
      <p
        data-testid="stat-value"
        className={clsx(
          'text-2xl font-bold',
          highlight ? 'text-amber-400' : 'text-white'
        )}
      >
        {value}
      </p>
      {highlight && value > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <AlertCircle className="w-3 h-3" />
          Perlu perhatian
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const role   = useAuthStore((s) => s.role);

  const { data: summary } = useQuery({
    queryKey:        ['evaluasi', 'summary'],
    queryFn:         getEvaluasiSummary,
    refetchInterval: 30_000,
    staleTime:       60_000,
  });

  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey:  ['evaluasi', 'list', { page: 1, limit: 10 }],
    queryFn:   () => getEvaluasiList({ page: 1, limit: 10 }),
    staleTime: 60_000,
  });

  const handleRowClick = (id: string, status: EvaluasiStatus) => {
    router.push(getEvaluasiRoute(id, status));
  };

  const pendingApproval    = summary?.menunggu_approval ?? 0;
  const highlightApproval  = role === 'manager' && pendingApproval > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gambaran cepat semua evaluasi aktif
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/evaluasi/baru')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
            text-sm text-white font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Evaluasi Baru
        </button>
      </div>

      {/* Stat cards — auto-refreshed via refetchInterval */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Draft"            value={summary?.draft      ?? 0} />
        <StatCard label="Diproses AI"      value={summary?.processing ?? 0} />
        <StatCard label="Selesai"          value={summary?.selesai    ?? 0} />
        <StatCard
          label="Menunggu Approval"
          value={pendingApproval}
          highlight={highlightApproval}
        />
      </div>

      {/* Recent evaluasi list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Evaluasi Terbaru</h2>
          <button
            onClick={() => router.push('/riwayat')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Lihat semua
          </button>
        </div>

        {isLoadingList && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
            Memuat daftar evaluasi...
          </div>
        )}

        {!isLoadingList && !listData?.items.length && (
          <div className="flex flex-col items-center py-10 text-center">
            <Clock className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">Belum ada evaluasi.</p>
            <p className="text-xs text-gray-600 mt-1">
              Buat evaluasi pertama untuk memulai.
            </p>
          </div>
        )}

        {!isLoadingList && listData?.items.map((ev) => (
          <EvaluasiRow
            key={ev.id}
            evaluasi={{
              id:        ev.id,
              judul:     ev.judul,
              kategori:  ev.kategori,
              status:    ev.status,
              createdAt: ev.created_at,
            }}
            onClick={() => handleRowClick(ev.id, ev.status)}
          />
        ))}
      </div>
    </div>
  );
}
