'use client';

import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import AgentStatusIcon from '@/components/atomic/AgentStatusIcon';
import { useAgentProgress } from '@/hooks/useAgentProgress';

export interface AgentProgressPanelProps {
  evaluasiId: string;
  onAllAgentsDone?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle:    'Menunggu giliran',
  waiting: 'Menunggu agent lain',
  running: 'Sedang berjalan',
  done:    'Selesai',
  error:   'Gagal',
};

export default function AgentProgressPanel({ evaluasiId, onAllAgentsDone }: AgentProgressPanelProps) {
  const { agents, isAllDone, error } = useAgentProgress(evaluasiId);
  const hasNotifiedDone = useRef(false);

  useEffect(() => {
    if (isAllDone && !hasNotifiedDone.current) {
      hasNotifiedDone.current = true;
      onAllAgentsDone?.();
    }
  }, [isAllDone, onAllAgentsDone]);

  const doneCount    = agents.filter((a) => a.status === 'done').length;
  const hasAnyError  = agents.some((a) => a.status === 'error');

  return (
    <div className="space-y-4" data-testid="agent-progress-panel">
      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400" data-testid="agent-progress-connection-warning">
          {error}
        </div>
      )}

      {hasAnyError && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400" data-testid="agent-error-warning">
          Salah satu agent mengalami kendala. Proses tetap dilanjutkan untuk agent lainnya.
        </div>
      )}

      <div className="space-y-2.5">
        {agents.map((agent) => (
          <div
            key={agent.agentKey}
            data-testid={`agent-row-${agent.agentKey}`}
            className={clsx(
              'flex items-start gap-3 px-4 py-3 rounded-xl border bg-white/[0.02]',
              agent.status === 'error' ? 'border-red-500/30' : 'border-white/10'
            )}
          >
            <div className="pt-0.5">
              <AgentStatusIcon status={agent.status} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{agent.label}</p>
                <span
                  className={clsx(
                    'text-xs shrink-0',
                    agent.status === 'waiting' ? 'text-amber-400' : 'text-gray-500'
                  )}
                  data-testid={`agent-status-label-${agent.agentKey}`}
                >
                  {STATUS_LABELS[agent.status]}
                </span>
              </div>

              <p
                className={clsx(
                  'text-xs mt-0.5 truncate',
                  agent.status === 'error' ? 'text-red-400' : 'text-gray-400'
                )}
                data-testid={`agent-message-${agent.agentKey}`}
              >
                {agent.status === 'error'
                  ? agent.errorDetail ?? 'Terjadi kesalahan saat memproses agent ini.'
                  : agent.pesanTerakhir ?? '—'}
              </p>

              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-300',
                    agent.status === 'error' ? 'bg-red-500' : agent.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${agent.progress}%` }}
                  data-testid={`agent-progress-bar-${agent.agentKey}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span data-testid="agent-progress-summary">{doneCount} dari {agents.length} agent selesai</span>
        <span>Estimasi waktu proses: 5–10 menit</span>
      </div>
    </div>
  );
}
