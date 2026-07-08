import React from 'react';
import RankBadge from '@/components/atomic/RankBadge';

export interface RecommendationCardProps {
  vendorNama: string;
  rankBadge?: number;
  skorTotal: number;
  reasoningSingkat: string;
  isLoading?: boolean;
}

export default function RecommendationCard({
  vendorNama,
  rankBadge = 1,
  skorTotal,
  reasoningSingkat,
  isLoading = false,
}: RecommendationCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-6 animate-pulse"
        data-testid="recommendation-card-loading"
      >
        <div className="h-4 w-32 bg-white/10 rounded mb-4" />
        <div className="h-7 w-64 bg-white/10 rounded mb-3" />
        <div className="h-16 w-full bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-6"
      data-testid="recommendation-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <RankBadge rank={rankBadge} />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
          Rekomendasi Utama
        </span>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <h2 className="text-2xl font-bold text-white" data-testid="recommendation-card-vendor-nama">
          {vendorNama}
        </h2>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-amber-400" data-testid="recommendation-card-skor">
            {skorTotal.toFixed(1)}
          </p>
          <p className="text-xs text-gray-400">Skor TOPSIS</p>
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed" data-testid="recommendation-card-reasoning">
        {reasoningSingkat}
      </p>
    </div>
  );
}
