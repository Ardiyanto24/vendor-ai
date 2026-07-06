'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, CheckCircle2 } from 'lucide-react';
import { getEvaluasiDetail, kirimKeApproval } from '@/lib/api/evaluasi';

export default function HasilEvaluasiPage() {
  const params       = useParams<{ id: string }>();
  const evaluasiId   = params.id;
  const queryClient  = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: evaluasi, isLoading } = useQuery({
    queryKey: ['evaluasi', evaluasiId],
    queryFn:  () => getEvaluasiDetail(evaluasiId),
  });

  const kirimMutation = useMutation({
    mutationFn: () => kirimKeApproval(evaluasiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluasi', evaluasiId] });
      queryClient.invalidateQueries({ queryKey: ['evaluasi', 'summary'] });
    },
    onError: (err: Error) => setError(err.message || 'Gagal mengirim evaluasi ke approval'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const canKirim = evaluasi?.status === 'selesai';

  return (
    <div className="space-y-6" data-testid="hasil-evaluasi-page">
      <div>
        <h1 className="text-xl font-bold text-white">{evaluasi?.judul ?? 'Hasil Evaluasi'}</h1>
        <p className="text-xs text-gray-400 mt-0.5">Hasil rekomendasi vendor</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-gray-500">Hasil evaluasi akan muncul di sini.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => kirimMutation.mutate()}
          disabled={!canKirim || kirimMutation.isPending}
          data-testid="kirim-approval-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
        >
          {!canKirim ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Sudah dikirim — menunggu persetujuan
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {kirimMutation.isPending ? 'Mengirim...' : 'Kirim ke Manager untuk Approval'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
