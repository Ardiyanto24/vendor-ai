'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

export interface ApprovalCardData {
  id: string;
  judul: string;
  namaStaff?: string | null;
  tanggalPengajuan: string;
  budgetMax: number;
  rekomendasiVendor?: string | null;
  skor?: number | null;
}

export interface ApprovalCardProps {
  evaluasi: ApprovalCardData;
  isSubmitting?: boolean;
  onApprove: () => void;
  onReject: (komentar: string) => void;
}

export default function ApprovalCard({
  evaluasi,
  isSubmitting = false,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const router = useRouter();
  const [komentar, setKomentar] = useState('');

  const formattedTanggal = new Date(evaluasi.tanggalPengajuan).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });

  const formattedBudget = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(evaluasi.budgetMax);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4" data-testid="approval-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{evaluasi.judul}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Diajukan oleh {evaluasi.namaStaff || '—'} · {formattedTanggal}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/evaluasi/${evaluasi.id}/hasil`)}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 shrink-0 transition-colors"
        >
          Lihat Detail Lengkap
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-gray-400">Rekomendasi Vendor</p>
          <p className="text-white mt-0.5 truncate">{evaluasi.rekomendasiVendor || 'Belum tersedia'}</p>
        </div>
        <div>
          <p className="text-gray-400">Skor</p>
          <p className="text-white mt-0.5">{evaluasi.skor != null ? evaluasi.skor.toFixed(2) : '—'}</p>
        </div>
        <div>
          <p className="text-gray-400">Budget Maks.</p>
          <p className="text-white mt-0.5">{formattedBudget}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Komentar</label>
        <textarea
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)}
          rows={2}
          placeholder="Wajib diisi jika menolak evaluasi..."
          data-testid="approval-komentar-input"
          className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10
            outline-none focus:border-blue-500/60 placeholder-gray-600 resize-none transition-colors"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onReject(komentar)}
          disabled={isSubmitting || komentar.trim() === ''}
          data-testid="approval-reject-btn"
          className="px-4 py-2 rounded-xl border border-red-500/30 text-sm text-red-400
            hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Tolak
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isSubmitting}
          data-testid="approval-approve-btn"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Setujui
        </button>
      </div>
    </div>
  );
}
