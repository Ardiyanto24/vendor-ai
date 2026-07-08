'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, CheckCircle2 } from 'lucide-react';
import { getEvaluasiDetail, kirimKeApproval } from '@/lib/api/evaluasi';
import { getHasilEvaluasi } from '@/lib/api/hasil';
import { APIError } from '@/lib/api/client';
import RecommendationCard from '@/components/feature/RecommendationCard';
import VendorRankingTable from '@/components/feature/VendorRankingTable';
import AIReasoningPanel from '@/components/feature/AIReasoningPanel';

// Bagian 2 (RecommendationCard) menampilkan ringkasan 2 kalimat, bukan
// reasoning_utama lengkap — narasi penuh tetap ada di Bagian 6 (AIReasoningPanel).
function firstTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= 2) return text;
  return sentences.slice(0, 2).join(' ').trim();
}

export default function HasilEvaluasiPage() {
  const params      = useParams<{ id: string }>();
  const evaluasiId  = params.id;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: evaluasi, isLoading: isLoadingEvaluasi } = useQuery({
    queryKey: ['evaluasi', evaluasiId],
    queryFn:  () => getEvaluasiDetail(evaluasiId),
  });

  const { data: hasil, isLoading: isLoadingHasil, error: hasilError } = useQuery({
    queryKey:  ['evaluasi', evaluasiId, 'hasil'],
    queryFn:   () => getHasilEvaluasi(evaluasiId),
    staleTime: 5 * 60 * 1000,
    retry:     false,
  });

  const kirimMutation = useMutation({
    mutationFn: () => kirimKeApproval(evaluasiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluasi', evaluasiId] });
      queryClient.invalidateQueries({ queryKey: ['evaluasi', 'summary'] });
    },
    onError: (err: Error) => setError(err.message || 'Gagal mengirim evaluasi ke approval'),
  });

  if (isLoadingEvaluasi) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const canKirim = evaluasi?.status === 'selesai';
  const hasilBelumTersedia = hasilError instanceof APIError && hasilError.code === 'HASIL_NOT_FOUND';

  const vendorRekomendasi = hasil?.vendors.find((v) => v.vendor_id === hasil.vendor_rekomendasi_id);
  const narasiPengantar = hasil?.preference_matching_result?.narasi_pengantar
    ?? 'Hasil evaluasi berdasarkan metrik terukur TOPSIS.';

  return (
    <div className="space-y-6" data-testid="hasil-evaluasi-page">
      <div>
        <h1 className="text-xl font-bold text-white">{evaluasi?.judul ?? 'Hasil Evaluasi'}</h1>
        <p className="text-xs text-gray-400 mt-0.5">Hasil rekomendasi vendor</p>
      </div>

      {isLoadingHasil && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {!isLoadingHasil && hasilBelumTersedia && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center" data-testid="hasil-belum-tersedia">
          <p className="text-sm text-gray-500">Hasil evaluasi akan muncul di sini setelah proses AI selesai.</p>
        </div>
      )}

      {!isLoadingHasil && hasil && (
        <>
          {/* Bagian 1 — Narasi pengantar */}
          <p className="text-sm text-gray-400 italic" data-testid="hasil-narasi-pengantar">
            {narasiPengantar}
          </p>

          {/* Bagian 2 — Rekomendasi utama */}
          <RecommendationCard
            vendorNama={hasil.vendor_rekomendasi_nama}
            rankBadge={1}
            skorTotal={vendorRekomendasi?.skor_total ?? 0}
            reasoningSingkat={firstTwoSentences(hasil.reasoning_utama)}
          />

          {/* Bagian 3 — Ranking semua vendor */}
          <VendorRankingTable vendors={hasil.vendors} konfigurasi={hasil.kriteria} />

          {/* Bagian 6 — Reasoning AI */}
          <AIReasoningPanel
            reasoningUtama={hasil.reasoning_utama}
            kelemahanUtama={hasil.kelemahan_utama}
            rekomendasiNegosiasi={hasil.rekomendasi_negosiasi}
          />
        </>
      )}

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
