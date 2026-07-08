'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export interface CriteriaScore {
  kriteria: string;
  skor: number;
  bobot?: number;
}

export interface CriteriaBarChartProps {
  vendorNama: string;
  scores: CriteriaScore[];
}

function barColor(value: number): string {
  if (value > 80) return '#10b981'; // emerald-500
  if (value > 60) return '#3b82f6'; // blue-500
  if (value >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

export default function CriteriaBarChart({ vendorNama, scores }: CriteriaBarChartProps) {
  const data = {
    labels: scores.map((s) => s.kriteria),
    datasets: [
      {
        label: vendorNama,
        data: scores.map((s) => s.skor),
        backgroundColor: scores.map((s) => barColor(s.skor)),
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => ` Skor: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: '#9ca3af', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d1d5db', font: { size: 11 } },
      },
    },
  };

  return (
    <div
      className="w-full"
      style={{ height: Math.max(scores.length * 32, 96) }}
      data-testid="criteria-bar-chart"
      role="img"
      aria-label={`Grafik skor kriteria untuk ${vendorNama}`}
    >
      <Bar data={data} options={options} />
    </div>
  );
}
