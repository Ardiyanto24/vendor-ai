import React from 'react';
import { clsx } from 'clsx';

export interface ScoreBarProps {
  value: number;
  label: string;
  weight?: number;
}

export default function ScoreBar({ value, label, weight }: ScoreBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Determine bar color based on value range
  let barColorClass = 'bg-red-500';
  if (clampedValue >= 40 && clampedValue <= 60) {
    barColorClass = 'bg-amber-500';
  } else if (clampedValue > 60 && clampedValue <= 80) {
    barColorClass = 'bg-blue-500';
  } else if (clampedValue > 80) {
    barColorClass = 'bg-emerald-500';
  }

  return (
    <div className="w-full font-sans">
      <div className="flex justify-between items-center mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{label}</span>
          {weight !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (Bobot: {weight}%)
            </span>
          )}
        </div>
        <span className="font-bold text-gray-800 dark:text-gray-100">
          {clampedValue}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', barColorClass)}
          style={{ width: `${clampedValue}%` }}
          data-testid="score-bar-fill"
        />
      </div>
    </div>
  );
}
