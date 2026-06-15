'use client';

import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, RotateCcw, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { KategoriPengadaan, KriteriaItem } from 'types';
import {
  getKategoriPengadaan,
  getKonfigurasiKriteria,
  updateKonfigurasiKriteria,
} from '@/lib/api/konfigurasi';
import CriteriaWeightInput from '@/components/composite/CriteriaWeightInput';

// ---------------------------------------------------------------------------
// Form shape
// ---------------------------------------------------------------------------
type FormValues = {
  kriteria: KriteriaItem[];
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsKriteriaPage() {
  const queryClient = useQueryClient();

  const [selectedKategori, setSelectedKategori] = React.useState<KategoriPengadaan | ''>('');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Store original fetched data so Reset button can restore it
  const originalKriteriaRef = useRef<KriteriaItem[]>([]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const { data: kategoriOptions = [] } = useQuery({
    queryKey: ['kategori-pengadaan'],
    queryFn: getKategoriPengadaan,
  });

  const { data: konfigurasi, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['konfigurasi-kriteria', selectedKategori],
    queryFn: () => getKonfigurasiKriteria(selectedKategori as KategoriPengadaan),
    enabled: selectedKategori !== '',
  });

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  const { watch, setValue, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { kriteria: [] },
  });

  const kriteriaValues = watch('kriteria');
  const totalBobot = kriteriaValues.reduce((sum, k) => sum + (Number(k.bobot) || 0), 0);
  const isInvalid = kriteriaValues.length > 0 && totalBobot !== 100;

  // Sync form when konfigurasi loads
  useEffect(() => {
    if (konfigurasi?.kriteria) {
      reset({ kriteria: konfigurasi.kriteria });
      originalKriteriaRef.current = konfigurasi.kriteria;
    }
  }, [konfigurasi, reset]);

  // Clear form when kategori changes
  useEffect(() => {
    reset({ kriteria: [] });
    setFeedback(null);
  }, [selectedKategori, reset]);

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------
  const mutation = useMutation({
    mutationFn: (kriteria: KriteriaItem[]) =>
      updateKonfigurasiKriteria(selectedKategori as KategoriPengadaan, kriteria),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['konfigurasi-kriteria', selectedKategori] });
      originalKriteriaRef.current = data.kriteria;
      setFeedback({ type: 'success', message: 'Konfigurasi berhasil disimpan.' });
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan konfigurasi.' });
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleKriteriaChange = (index: number, bobot: number, thresholdMin: number) => {
    const updated = kriteriaValues.map((k, i) =>
      i === index ? { ...k, bobot, threshold_min: thresholdMin } : k
    );
    setValue('kriteria', updated, { shouldDirty: true });
    setFeedback(null);
  };

  const handleReset = () => {
    reset({ kriteria: originalKriteriaRef.current });
    setFeedback(null);
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values.kriteria);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const hasKriteria = kriteriaValues.length > 0;
  const canSave = hasKriteria && totalBobot === 100 && !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Konfigurasi Kriteria</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Atur bobot dan skor minimum per kriteria evaluasi
          </p>
        </div>
      </div>

      {/* Kategori selector */}
      <div className="space-y-1.5">
        <label htmlFor="kategori-select" className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Kategori Pengadaan
        </label>
        <select
          id="kategori-select"
          value={selectedKategori}
          onChange={(e) => setSelectedKategori(e.target.value as KategoriPengadaan)}
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white
            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500/50 transition-colors"
        >
          <option value="" disabled className="bg-[#0d0e12]">
            — Pilih kategori —
          </option>
          {kategoriOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0d0e12]">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {selectedKategori && isLoadingConfig && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
          Memuat konfigurasi...
        </div>
      )}

      {/* Form */}
      {hasKriteria && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Total bobot indicator */}
          <div
            className={clsx(
              'flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              totalBobot === 100
                ? 'border-green-500/30 bg-green-500/5 text-green-400'
                : 'border-red-500/30 bg-red-500/5 text-red-400'
            )}
            aria-live="polite"
          >
            <span>Total Bobot</span>
            <span>{totalBobot}%</span>
          </div>

          {/* Criteria rows */}
          <div className="space-y-2">
            {kriteriaValues.map((k, i) => (
              <CriteriaWeightInput
                key={k.key}
                label={k.label}
                bobot={k.bobot}
                thresholdMin={k.threshold_min}
                isInvalid={isInvalid}
                onChange={(bobot, thresholdMin) => handleKriteriaChange(i, bobot, thresholdMin)}
              />
            ))}
          </div>

          {/* Validation hint */}
          {isInvalid && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Total bobot harus tepat 100%. Kurangi atau tambahkan bobot pada kriteria di atas.
            </p>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm',
                feedback.type === 'success'
                  ? 'border-green-500/30 bg-green-500/5 text-green-400'
                  : 'border-red-500/30 bg-red-500/5 text-red-400'
              )}
              role="alert"
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10
                bg-white/[0.02] hover:bg-white/[0.06] text-sm text-gray-300 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              type="submit"
              disabled={!canSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                text-sm text-white font-medium transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state — kategori selected but no data yet */}
      {selectedKategori && !isLoadingConfig && !hasKriteria && (
        <p className="text-sm text-gray-500 py-4">
          Tidak ada konfigurasi ditemukan untuk kategori ini.
        </p>
      )}
    </div>
  );
}
