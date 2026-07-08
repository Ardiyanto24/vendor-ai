'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDokumenStatus } from '@/lib/api/evaluasi';
import type { DokumenStatusResponse, StatusEkstraksi } from 'types';

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 2 * 60 * 1000;

export type ExtractionStatus = StatusEkstraksi | 'timeout';

function isSettled(status: StatusEkstraksi | undefined): boolean {
  return status === 'done' || status === 'done_partial' || status === 'failed';
}

export function useDocumentExtraction(evaluasiId: string, uploadId: string | null) {
  const startedAtRef = useRef<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const query = useQuery<DokumenStatusResponse>({
    queryKey: ['dokumen-status', evaluasiId, uploadId],
    queryFn: () => getDokumenStatus(evaluasiId, uploadId as string),
    enabled: !!uploadId && !isTimedOut,
    refetchInterval: (q) => (isSettled(q.state.data?.status) ? false : POLL_INTERVAL_MS),
  });

  // Reset timeout tracking whenever a new upload starts polling.
  useEffect(() => {
    startedAtRef.current = uploadId ? Date.now() : null;
    setIsTimedOut(false);
  }, [uploadId]);

  // Track elapsed time independently of refetch cadence so the 2-minute cap
  // is enforced even if the interval callback hasn't fired recently.
  useEffect(() => {
    if (!uploadId || isSettled(query.data?.status)) return;

    const timer = setInterval(() => {
      if (startedAtRef.current !== null && Date.now() - startedAtRef.current >= TIMEOUT_MS) {
        setIsTimedOut(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [uploadId, query.data?.status]);

  const status: ExtractionStatus | undefined = isTimedOut ? 'timeout' : query.data?.status;

  return {
    status,
    hasilEkstraksi: query.data?.hasilEkstraksi ?? null,
    confidenceScore: query.data?.confidenceScore ?? null,
    indexingRagStatus: query.data?.indexingRagStatus ?? null,
    isTimedOut,
  };
}
