'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getSupabaseBrowserClient, setSupabaseAccessToken } from '@/lib/supabase/client';
import type { AgentStatus } from '@/components/atomic/AgentStatusIcon';

export type AgentKey =
  | 'data_collector'
  | 'financial_analyzer'
  | 'risk_assessor'
  | 'performance_scorer'
  | 'negotiation_assistant'
  | 'qualitative_analyzer'
  | 'preference_matcher';

export const AGENT_ORDER: AgentKey[] = [
  'data_collector',
  'financial_analyzer',
  'risk_assessor',
  'performance_scorer',
  'negotiation_assistant',
  'qualitative_analyzer',
  'preference_matcher',
];

export const AGENT_LABELS: Record<AgentKey, string> = {
  data_collector:        'Data Collector',
  financial_analyzer:    'Financial Analyzer',
  risk_assessor:         'Risk Assessor',
  performance_scorer:    'Performance Scorer',
  negotiation_assistant: 'Negotiation Assistant',
  qualitative_analyzer:  'Qualitative Analyzer',
  preference_matcher:    'Preference Matcher',
};

// Dependency graph per FE-03 P-04 dan GUIDE_FRONTEND_ENGINEER F-10: DC, FA, RA
// mulai bersamaan; PS menunggu DC; NA dan QA menunggu PS; PM menunggu NA + QA.
const DEPENDENCIES: Record<AgentKey, AgentKey[]> = {
  data_collector:        [],
  financial_analyzer:    [],
  risk_assessor:         [],
  performance_scorer:    ['data_collector'],
  negotiation_assistant: ['performance_scorer'],
  qualitative_analyzer:  ['performance_scorer'],
  preference_matcher:    ['negotiation_assistant', 'qualitative_analyzer'],
};

interface RawRow {
  agent_key:      AgentKey;
  status:         'idle' | 'running' | 'done' | 'error';
  progress:       number;
  pesan_terakhir: string | null;
  error_detail:   string | null;
}

export interface AgentProgressItem {
  agentKey:      AgentKey;
  label:         string;
  status:        AgentStatus;
  progress:      number;
  pesanTerakhir: string | null;
  errorDetail:   string | null;
}

// Sebelum Realtime pertama kali mengirim update, agent yang masih 'idle' di DB
// tapi dependency-nya belum 'done' ditampilkan sebagai 'waiting' — bukan supaya
// frontend "mengatur" state agent, hanya agar tampilan awal tidak terlihat stuck.
function deriveDisplayStatus(agentKey: AgentKey, rowsByKey: Map<AgentKey, RawRow>): AgentStatus {
  const rawStatus = rowsByKey.get(agentKey)?.status ?? 'idle';
  if (rawStatus !== 'idle') return rawStatus;

  const deps = DEPENDENCIES[agentKey];
  if (deps.length === 0) return 'idle';

  const allDepsDone = deps.every((dep) => rowsByKey.get(dep)?.status === 'done');
  return allDepsDone ? 'idle' : 'waiting';
}

export function useAgentProgress(evaluasiId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rowsByKey, setRowsByKey] = useState<Map<AgentKey, RawRow>>(new Map());
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  // Fetch awal — dibutuhkan untuk kasus halaman di-refresh di tengah proses,
  // sebelum event Realtime pertama datang.
  const { data: initialRows, error: queryError } = useQuery({
    queryKey: ['agent-progress', evaluasiId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('agent_progress')
        .select('agent_key, status, progress, pesan_terakhir, error_detail')
        .eq('evaluasi_id', evaluasiId);

      if (error) throw new Error(error.message);
      return (data ?? []) as RawRow[];
    },
    enabled:   !!evaluasiId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!initialRows) return;
    setRowsByKey((prev) => {
      const next = new Map(prev);
      for (const row of initialRows) {
        if (!next.has(row.agent_key)) next.set(row.agent_key, row);
      }
      return next;
    });
  }, [initialRows]);

  // Subscribe ke channel Realtime saat mount, unsubscribe saat unmount (wajib
  // — mencegah memory leak per FE-05 section 9.1).
  useEffect(() => {
    if (!evaluasiId) return;

    // getSupabaseBrowserClient() throws if Supabase env vars aren't configured —
    // surface that as a hook-level error instead of letting it escape the effect.
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      setSupabaseAccessToken(accessToken);
      supabase = getSupabaseBrowserClient();
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : 'Gagal membuka koneksi real-time.');
      return;
    }

    const channel = supabase
      .channel(`evaluasi-progress-${evaluasiId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_progress', filter: `evaluasi_id=eq.${evaluasiId}` },
        (payload) => {
          const newRow = payload.new as unknown as RawRow;
          if (!newRow?.agent_key) return;

          setRowsByKey((prev) => {
            const next = new Map(prev);
            next.set(newRow.agent_key, newRow);
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSubscriptionError('Koneksi real-time terputus. Status agent mungkin tidak selalu terbaru.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [evaluasiId, accessToken]);

  const agents: AgentProgressItem[] = useMemo(
    () =>
      AGENT_ORDER.map((agentKey) => {
        const row = rowsByKey.get(agentKey);
        return {
          agentKey,
          label:         AGENT_LABELS[agentKey],
          status:        deriveDisplayStatus(agentKey, rowsByKey),
          progress:      row?.progress ?? 0,
          pesanTerakhir: row?.pesan_terakhir ?? null,
          errorDetail:   row?.error_detail ?? null,
        };
      }),
    [rowsByKey]
  );

  const isAllDone = agents.every((a) => a.status === 'done');
  const error     = subscriptionError ?? (queryError instanceof Error ? queryError.message : null);

  return { agents, isAllDone, error };
}
