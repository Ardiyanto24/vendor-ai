import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface RawRow {
  agent_key: string;
  status: string;
  progress: number;
  pesan_terakhir: string | null;
  error_detail: string | null;
}

const mocks = vi.hoisted(() => {
  let capturedCallback: ((payload: { new: RawRow }) => void) | null = null;
  let capturedSubscribeCb: ((status: string) => void) | null = null;
  let initialRows: RawRow[] = [];
  let queryError: { message: string } | null = null;
  let throwOnGetClient = false;
  const removeChannelMock = vi.fn();

  function buildChannelMock(): any {
    const channel = {
      on: (_event: string, _filter: unknown, cb: (payload: { new: RawRow }) => void) => {
        capturedCallback = cb;
        return channel;
      },
      subscribe: (cb?: (status: string) => void) => {
        capturedSubscribeCb = cb ?? null;
        return channel;
      },
    };
    return channel;
  }

  const supabaseMock = {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: initialRows, error: queryError }),
      }),
    }),
    channel: () => buildChannelMock(),
    removeChannel: removeChannelMock,
    realtime: { setAuth: vi.fn() },
  };

  return {
    supabaseMock,
    removeChannelMock,
    getCallback: () => capturedCallback,
    getSubscribeCb: () => capturedSubscribeCb,
    shouldThrowOnGetClient: () => throwOnGetClient,
    setInitialRows: (rows: RawRow[]) => { initialRows = rows; },
    setQueryError: (err: { message: string } | null) => { queryError = err; },
    setThrowOnGetClient: (v: boolean) => { throwOnGetClient = v; },
    reset: () => {
      capturedCallback = null;
      capturedSubscribeCb = null;
      initialRows = [];
      queryError = null;
      throwOnGetClient = false;
    },
  };
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => {
    if (mocks.shouldThrowOnGetClient()) {
      throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY kosong).');
    }
    return mocks.supabaseMock;
  },
  setSupabaseAccessToken: () => {
    if (mocks.shouldThrowOnGetClient()) {
      throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY kosong).');
    }
  },
}));

// eslint-disable-next-line import/first
import { useAgentProgress } from '../useAgentProgress';

const ALL_AGENT_KEYS = [
  'data_collector',
  'financial_analyzer',
  'risk_assessor',
  'performance_scorer',
  'negotiation_assistant',
  'qualitative_analyzer',
  'preference_matcher',
];

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function emit(agentKey: string, status: string, progress: number, pesan: string | null = null, errorDetail: string | null = null) {
  mocks.getCallback()?.({
    new: { agent_key: agentKey, status, progress, pesan_terakhir: pesan, error_detail: errorDetail },
  });
}

describe('useAgentProgress', () => {
  beforeEach(() => {
    mocks.reset();
    mocks.removeChannelMock.mockClear();
  });

  test('renders all 7 agents; DC/FA/RA idle and their dependents waiting before anything starts', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.agents).toHaveLength(7));

    const byKey = Object.fromEntries(result.current.agents.map((a) => [a.agentKey, a]));
    expect(byKey.data_collector.status).toBe('idle');
    expect(byKey.financial_analyzer.status).toBe('idle');
    expect(byKey.risk_assessor.status).toBe('idle');
    expect(byKey.performance_scorer.status).toBe('waiting');
    expect(byKey.negotiation_assistant.status).toBe('waiting');
    expect(byKey.qualitative_analyzer.status).toBe('waiting');
    expect(byKey.preference_matcher.status).toBe('waiting');
  });

  test('seeds initial state from the TanStack Query fetch (e.g. page refresh mid-process)', async () => {
    mocks.setInitialRows([
      { agent_key: 'data_collector', status: 'running', progress: 50, pesan_terakhir: 'Mengumpulkan data...', error_detail: null },
    ]);

    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      const dc = result.current.agents.find((a) => a.agentKey === 'data_collector');
      expect(dc?.status).toBe('running');
    });

    const dc = result.current.agents.find((a) => a.agentKey === 'data_collector')!;
    expect(dc.progress).toBe(50);
    expect(dc.pesanTerakhir).toBe('Mengumpulkan data...');
  });

  test('updates agent state from realtime postgres_changes events', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.getCallback()).not.toBeNull());

    act(() => {
      emit('data_collector', 'running', 40, 'Mencari data vendor...');
    });

    await waitFor(() => {
      const dc = result.current.agents.find((a) => a.agentKey === 'data_collector');
      expect(dc?.status).toBe('running');
    });

    const dc = result.current.agents.find((a) => a.agentKey === 'data_collector')!;
    expect(dc.progress).toBe(40);
    expect(dc.pesanTerakhir).toBe('Mencari data vendor...');

    // Dependent agent still waiting since DC isn't done yet.
    const ps = result.current.agents.find((a) => a.agentKey === 'performance_scorer')!;
    expect(ps.status).toBe('waiting');
  });

  test('performance_scorer stops waiting once data_collector reports done', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.getCallback()).not.toBeNull());

    act(() => {
      emit('data_collector', 'done', 100, 'Selesai');
    });

    await waitFor(() => {
      const ps = result.current.agents.find((a) => a.agentKey === 'performance_scorer');
      expect(ps?.status).toBe('idle');
    });
  });

  test('surfaces error_detail on the agent when status is error', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.getCallback()).not.toBeNull());

    act(() => {
      emit('risk_assessor', 'error', 30, null, 'Tavily API timeout setelah 2 percobaan');
    });

    await waitFor(() => {
      const ra = result.current.agents.find((a) => a.agentKey === 'risk_assessor');
      expect(ra?.status).toBe('error');
    });

    const ra = result.current.agents.find((a) => a.agentKey === 'risk_assessor')!;
    expect(ra.errorDetail).toBe('Tavily API timeout setelah 2 percobaan');
  });

  test('isAllDone is true only when all 7 agents report done', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.getCallback()).not.toBeNull());

    expect(result.current.isAllDone).toBe(false);

    act(() => {
      ALL_AGENT_KEYS.slice(0, 6).forEach((key) => emit(key, 'done', 100, 'Selesai'));
    });
    expect(result.current.isAllDone).toBe(false);

    act(() => {
      emit(ALL_AGENT_KEYS[6], 'done', 100, 'Selesai');
    });
    await waitFor(() => expect(result.current.isAllDone).toBe(true));
  });

  test('unsubscribes from the realtime channel on unmount', async () => {
    const { result, unmount } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.agents).toHaveLength(7));

    unmount();
    expect(mocks.removeChannelMock).toHaveBeenCalledTimes(1);
  });

  test('surfaces a connection error when the realtime subscription reports CHANNEL_ERROR', async () => {
    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.getSubscribeCb()).not.toBeNull());

    act(() => {
      mocks.getSubscribeCb()?.('CHANNEL_ERROR');
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  test('surfaces a config error instead of crashing when Supabase env vars are missing', async () => {
    mocks.setThrowOnGetClient(true);

    const { result } = renderHook(() => useAgentProgress('eval-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.agents).toHaveLength(7);
  });
});
