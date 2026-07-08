import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DokumenStatusResponse } from 'types';

vi.mock('@/lib/api/evaluasi', () => ({
  getDokumenStatus: vi.fn(),
}));

// eslint-disable-next-line import/first
import { getDokumenStatus } from '@/lib/api/evaluasi';
// eslint-disable-next-line import/first
import { useDocumentExtraction } from '../useDocumentExtraction';

const mockedGetStatus = vi.mocked(getDokumenStatus);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const PROCESSING: DokumenStatusResponse = {
  uploadId: 'up-1',
  status: 'processing',
  hasilEkstraksi: null,
  confidenceScore: null,
  indexingRagStatus: null,
  chunkCount: null,
  updatedAt: '2026-07-01T00:00:00Z',
};

const DONE: DokumenStatusResponse = {
  uploadId: 'up-1',
  status: 'done',
  hasilEkstraksi: null,
  confidenceScore: 0.9,
  indexingRagStatus: 'done',
  chunkCount: 4,
  updatedAt: '2026-07-01T00:00:03Z',
};

const FAILED: DokumenStatusResponse = {
  uploadId: 'up-1',
  status: 'failed',
  hasilEkstraksi: null,
  confidenceScore: null,
  indexingRagStatus: null,
  chunkCount: null,
  updatedAt: '2026-07-01T00:00:03Z',
};

async function flushMicrotasks() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    // TanStack Query batches subscriber notifications via setTimeout(0), which
    // needs one more tick to flush after the queryFn promise resolves.
    await vi.advanceTimersByTimeAsync(50);
  });
}

describe('useDocumentExtraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedGetStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('does not fetch when uploadId is null', async () => {
    renderHook(() => useDocumentExtraction('eval-1', null), { wrapper: createWrapper() });
    await flushMicrotasks();
    expect(mockedGetStatus).not.toHaveBeenCalled();
  });

  test('polls every 3s while processing, then stops once status is done', async () => {
    mockedGetStatus.mockResolvedValueOnce(PROCESSING).mockResolvedValueOnce(DONE);

    const { result } = renderHook(() => useDocumentExtraction('eval-1', 'up-1'), {
      wrapper: createWrapper(),
    });

    await flushMicrotasks();
    expect(result.current.status).toBe('processing');
    expect(mockedGetStatus).toHaveBeenCalledTimes(1);

    await advance(3000);
    expect(result.current.status).toBe('done');
    expect(mockedGetStatus).toHaveBeenCalledTimes(2);

    // No further polling once settled, even after several more intervals.
    await advance(30_000);
    expect(mockedGetStatus).toHaveBeenCalledTimes(2);
  });

  test('stops polling once status is failed', async () => {
    mockedGetStatus.mockResolvedValueOnce(PROCESSING).mockResolvedValueOnce(FAILED);

    const { result } = renderHook(() => useDocumentExtraction('eval-1', 'up-1'), {
      wrapper: createWrapper(),
    });

    await flushMicrotasks();
    await advance(3000);

    expect(result.current.status).toBe('failed');

    await advance(30_000);
    expect(mockedGetStatus).toHaveBeenCalledTimes(2);
  });

  test('reports timeout and stops polling after 2 minutes without settling', async () => {
    mockedGetStatus.mockResolvedValue(PROCESSING);

    const { result } = renderHook(() => useDocumentExtraction('eval-1', 'up-1'), {
      wrapper: createWrapper(),
    });

    await flushMicrotasks();
    expect(result.current.status).toBe('processing');
    expect(result.current.isTimedOut).toBe(false);

    await advance(2 * 60 * 1000 + 1000);

    expect(result.current.isTimedOut).toBe(true);
    expect(result.current.status).toBe('timeout');

    const callsAtTimeout = mockedGetStatus.mock.calls.length;

    await advance(10_000);
    expect(mockedGetStatus).toHaveBeenCalledTimes(callsAtTimeout);
  });
});
