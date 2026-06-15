'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ChevronRight, Building2, Calendar, Users } from 'lucide-react';
import type { EvaluasiStatus } from 'types';
import StatusBadge from '@/components/atomic/StatusBadge';

const KATEGORI_LABELS: Record<string, string> = {
  it_hardware:       'IT Hardware',
  it_software:       'IT Software',
  jasa_it:           'Jasa IT',
  jasa_konsultasi:   'Jasa Konsultasi',
  alat_tulis_kantor: 'Alat Tulis Kantor',
};

export interface EvaluasiRowData {
  id: string;
  judul: string;
  kategori: string;
  jumlahVendor?: number;
  status: EvaluasiStatus;
  createdAt: string;
  vendorTerpilih?: string;
}

export interface EvaluasiRowProps {
  evaluasi: EvaluasiRowData;
  onClick?: () => void;
}

export default function EvaluasiRow({ evaluasi, onClick }: EvaluasiRowProps) {
  const { judul, kategori, jumlahVendor, status, createdAt, vendorTerpilih } = evaluasi;

  const formattedDate = new Date(createdAt).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  return (
    <div
      role="row"
      data-testid="evaluasi-row"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/10',
        'bg-white/[0.02] transition-colors',
        onClick ? 'cursor-pointer hover:bg-white/[0.05]' : 'cursor-default'
      )}
    >
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{judul}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Building2 className="w-3 h-3 shrink-0" />
            {KATEGORI_LABELS[kategori] ?? kategori}
          </span>
          {jumlahVendor !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3 shrink-0" />
              {jumlahVendor} vendor
            </span>
          )}
          {vendorTerpilih && (
            <span className="text-xs text-green-400 truncate">
              Dipilih: {vendorTerpilih}
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 shrink-0">
        <Calendar className="w-3 h-3" />
        {formattedDate}
      </div>

      {/* Status badge */}
      <StatusBadge status={status} size="sm" />

      {/* Chevron — only when clickable */}
      {onClick && (
        <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
      )}
    </div>
  );
}
