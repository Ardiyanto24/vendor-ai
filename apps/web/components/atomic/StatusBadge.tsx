import React from 'react';
import { EvaluasiStatus } from 'types';
import { clsx } from 'clsx';

export interface StatusBadgeProps {
  status: EvaluasiStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  EvaluasiStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-status-draft/10 text-status-draft border-status-draft/20',
  },
  processing: {
    label: 'Processing',
    className: 'bg-status-processing/10 text-status-processing border-status-processing/20',
  },
  selesai: {
    label: 'Selesai',
    className: 'bg-status-selesai/10 text-status-selesai border-status-selesai/20',
  },
  menunggu_approval: {
    label: 'Menunggu Approval',
    className: 'bg-status-menunggu-approval/10 text-status-menunggu-approval border-status-menunggu-approval/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-status-approved/10 text-status-approved border-status-approved/20',
  },
  butuh_revisi: {
    label: 'Butuh Revisi',
    className: 'bg-status-butuh-revisi/10 text-status-butuh-revisi border-status-butuh-revisi/20',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-medium border rounded-full font-sans transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
