'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface CriteriaWeightInputProps {
  label: string;
  bobot: number;
  thresholdMin: number;
  isInvalid: boolean;
  onChange: (bobot: number, thresholdMin: number) => void;
}

export default function CriteriaWeightInput({
  label,
  bobot,
  thresholdMin,
  isInvalid,
  onChange,
}: CriteriaWeightInputProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-4 px-4 py-3 rounded-xl border bg-white/[0.02] transition-colors',
        isInvalid ? 'border-red-500/60' : 'border-white/10'
      )}
      data-testid="criteria-weight-input"
    >
      {/* Criteria label */}
      <span className="flex-1 text-sm text-gray-200 font-medium truncate">{label}</span>

      {/* Bobot input */}
      <label className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 w-12 text-right">Bobot</span>
        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            value={bobot}
            onChange={(e) => onChange(Number(e.target.value), thresholdMin)}
            className={clsx(
              'w-16 px-2 py-1.5 pr-6 rounded-lg text-sm text-white text-right bg-white/[0.06] border outline-none',
              'focus:ring-1 focus:ring-blue-500 transition-colors appearance-none',
              isInvalid ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500/50'
            )}
            aria-label={`Bobot ${label}`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
        </div>
      </label>

      {/* Threshold min input */}
      <label className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 w-20 text-right">Min. Skor</span>
        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            value={thresholdMin}
            onChange={(e) => onChange(bobot, Number(e.target.value))}
            className={clsx(
              'w-16 px-2 py-1.5 pr-6 rounded-lg text-sm text-white text-right bg-white/[0.06] border outline-none',
              'focus:ring-1 focus:ring-blue-500 transition-colors appearance-none',
              'border-white/10 focus:border-blue-500/50'
            )}
            aria-label={`Threshold minimum ${label}`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
        </div>
      </label>
    </div>
  );
}
