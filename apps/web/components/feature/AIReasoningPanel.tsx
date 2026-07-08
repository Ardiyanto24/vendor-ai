import React from 'react';
import { CheckCircle2, AlertTriangle, Handshake } from 'lucide-react';

export interface AIReasoningPanelProps {
  reasoningUtama: string;
  kelemahanUtama: string;
  rekomendasiNegosiasi: string;
}

export default function AIReasoningPanel({
  reasoningUtama,
  kelemahanUtama,
  rekomendasiNegosiasi,
}: AIReasoningPanelProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-5" data-testid="ai-reasoning-panel">
      <h3 className="text-sm font-semibold text-white">Reasoning AI</h3>

      <div className="space-y-2" data-testid="ai-reasoning-section-utama">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold text-gray-300">Mengapa vendor ini direkomendasikan</p>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed pl-6">{reasoningUtama}</p>
      </div>

      <div className="space-y-2" data-testid="ai-reasoning-section-kelemahan">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-gray-300">Kelemahan yang perlu diwaspadai</p>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed pl-6">{kelemahanUtama}</p>
      </div>

      <div className="space-y-2" data-testid="ai-reasoning-section-negosiasi">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-xs font-semibold text-gray-300">Rekomendasi langkah negosiasi</p>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed pl-6">{rekomendasiNegosiasi}</p>
      </div>
    </div>
  );
}
