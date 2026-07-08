'use client';

import React, { useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Building2, Users } from 'lucide-react';
import { getEvaluasiDetail } from '@/lib/api/evaluasi';
import AgentProgressPanel from '@/components/feature/AgentProgressPanel';

const KATEGORI_LABELS: Record<string, string> = {
  it_hardware:       'IT Hardware',
  it_software:       'IT Software',
  jasa_it:           'Jasa IT',
  jasa_konsultasi:   'Jasa Konsultasi',
  alat_tulis_kantor: 'Alat Tulis Kantor',
};

// Delay kecil sebelum redirect ke P-05 agar user sempat melihat semua agent
// berstatus 'done' terlebih dahulu, sebelum halaman berpindah.
const REDIRECT_DELAY_MS = 1500;

export default function ProsesEvaluasiPage() {
  const params     = useParams<{ id: string }>();
  const router     = useRouter();
  const evaluasiId = params.id;
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: evaluasi, isLoading } = useQuery({
    queryKey: ['evaluasi', evaluasiId],
    queryFn:  () => getEvaluasiDetail(evaluasiId),
  });

  const handleAllAgentsDone = useCallback(() => {
    redirectTimerRef.current = setTimeout(() => {
      router.push(`/evaluasi/${evaluasiId}/hasil`);
    }, REDIRECT_DELAY_MS);
  }, [evaluasiId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="proses-evaluasi-page">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{evaluasi?.judul ?? 'Memproses Evaluasi'}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Building2 className="w-3 h-3 shrink-0" />
              {evaluasi ? (KATEGORI_LABELS[evaluasi.kategori] ?? evaluasi.kategori) : '—'}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3 shrink-0" />
              {evaluasi?.vendors?.length ?? 0} vendor sedang dianalisa
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <AgentProgressPanel evaluasiId={evaluasiId} onAllAgentsDone={handleAllAgentsDone} />
      </div>

      <p className="text-xs text-gray-500 text-center">
        Anda boleh meninggalkan halaman ini — proses evaluasi tetap berjalan di background.
      </p>
    </div>
  );
}
