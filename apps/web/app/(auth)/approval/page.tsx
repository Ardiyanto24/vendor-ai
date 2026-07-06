'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { clsx } from 'clsx';
import type { ApprovalKeputusan } from 'types';
import { getEvaluasiList, submitApproval } from '@/lib/api/evaluasi';
import ApprovalCard from '@/components/composite/ApprovalCard';
import EvaluasiRow from '@/components/composite/EvaluasiRow';

type Tab = 'menunggu' | 'diproses';

export default function ApprovalPage() {
  const queryClient = useQueryClient();
  const router       = useRouter();
  const [tab, setTab] = useState<Tab>('menunggu');
  const [errorByEvaluasi, setErrorByEvaluasi] = useState<Record<string, string>>({});

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['evaluasi', 'list', { status: 'menunggu_approval' }],
    queryFn:  () => getEvaluasiList({ status: 'menunggu_approval', limit: 50 }),
  });

  const { data: approvedData } = useQuery({
    queryKey: ['evaluasi', 'list', { status: 'approved' }],
    queryFn:  () => getEvaluasiList({ status: 'approved', limit: 50 }),
    enabled:  tab === 'diproses',
  });

  const { data: revisiData } = useQuery({
    queryKey: ['evaluasi', 'list', { status: 'butuh_revisi' }],
    queryFn:  () => getEvaluasiList({ status: 'butuh_revisi', limit: 50 }),
    enabled:  tab === 'diproses',
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, keputusan, komentar }: { id: string; keputusan: ApprovalKeputusan; komentar?: string }) =>
      submitApproval(id, keputusan, komentar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluasi', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['evaluasi', 'summary'] });
    },
  });

  function handleApprove(id: string) {
    setErrorByEvaluasi((prev) => ({ ...prev, [id]: '' }));
    approvalMutation.mutate(
      { id, keputusan: 'approved' },
      { onError: (err: Error) => setErrorByEvaluasi((prev) => ({ ...prev, [id]: err.message || 'Gagal menyetujui evaluasi' })) }
    );
  }

  function handleReject(id: string, komentar: string) {
    setErrorByEvaluasi((prev) => ({ ...prev, [id]: '' }));
    approvalMutation.mutate(
      { id, keputusan: 'rejected', komentar },
      { onError: (err: Error) => setErrorByEvaluasi((prev) => ({ ...prev, [id]: err.message || 'Gagal menolak evaluasi' })) }
    );
  }

  const pendingItems   = pendingData?.items ?? [];
  const processedItems = [...(approvedData?.items ?? []), ...(revisiData?.items ?? [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Approval</h1>
          <p className="text-xs text-gray-400 mt-0.5">Review dan putuskan evaluasi vendor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('menunggu')}
          data-testid="tab-menunggu"
          className={clsx(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'menunggu' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'
          )}
        >
          Menunggu Keputusan{pendingItems.length > 0 ? ` (${pendingItems.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('diproses')}
          data-testid="tab-diproses"
          className={clsx(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'diproses' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'
          )}
        >
          Sudah Diproses
        </button>
      </div>

      {/* Tab: Menunggu Keputusan */}
      {tab === 'menunggu' && (
        <div className="space-y-3" data-testid="tab-menunggu-content">
          {isLoadingPending && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
              <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
              Memuat evaluasi...
            </div>
          )}

          {!isLoadingPending && pendingItems.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              Tidak ada evaluasi yang menunggu keputusan.
            </p>
          )}

          {pendingItems.map((ev) => (
            <div key={ev.id}>
              <ApprovalCard
                evaluasi={{
                  id:               ev.id,
                  judul:            ev.judul,
                  tanggalPengajuan: ev.updated_at,
                  budgetMax:        ev.budget_max,
                }}
                isSubmitting={approvalMutation.isPending}
                onApprove={() => handleApprove(ev.id)}
                onReject={(komentar) => handleReject(ev.id, komentar)}
              />
              {errorByEvaluasi[ev.id] && (
                <p className="text-xs text-red-400 mt-1 px-1">{errorByEvaluasi[ev.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Sudah Diproses */}
      {tab === 'diproses' && (
        <div className="space-y-2" data-testid="tab-diproses-content">
          {processedItems.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              Belum ada evaluasi yang diproses.
            </p>
          )}

          {processedItems.map((ev) => (
            <EvaluasiRow
              key={ev.id}
              evaluasi={{
                id:        ev.id,
                judul:     ev.judul,
                kategori:  ev.kategori,
                status:    ev.status,
                createdAt: ev.created_at,
              }}
              onClick={() => router.push(`/evaluasi/${ev.id}/hasil`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
