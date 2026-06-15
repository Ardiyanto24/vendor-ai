import React from 'react';

export interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-sans font-extrabold shadow-sm text-sm border-2 border-amber-300">
        1
      </span>
    );
  }

  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 border border-slate-300 font-sans font-bold text-xs">
        2
      </span>
    );
  }

  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-sans font-bold text-xs">
        3
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 font-sans">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        {rank}
      </span>
    </span>
  );
}
