'use client';

import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Building2, Plus, Send, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import type { Vendor, AddVendorPayload } from 'types';
import { getKategoriPengadaan } from '@/lib/api/konfigurasi';
import {
  createEvaluasi,
  getEvaluasiDetail,
  addVendor,
  removeVendor,
  submitEvaluasi,
  uploadDokumen,
} from '@/lib/api/evaluasi';
import VendorInputCard from '@/components/composite/VendorInputCard';
import UploadVendorCard from '@/components/composite/UploadVendorCard';

interface Step1FormData {
  judul: string;
  kategori: string;
  deskripsi: string;
  budget_min: string;
  budget_max: string;
  deadline: string;
  lampiran_url: string;
}

const STEP_LABELS = ['Requirement', 'Tambah Vendor', 'Konfirmasi'] as const;

type PendingEntry =
  | { kind: 'manual'; localId: string }
  | { kind: 'upload'; localId: string; fileName: string; uploadId: string | null; uploadError: string | null };

const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 ' +
  'outline-none focus:border-blue-500/60 placeholder-gray-600 transition-colors';
const INPUT_ERROR_CLASS =
  'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-red-500/60 ' +
  'outline-none placeholder-gray-600';
const LABEL_CLASS = 'block text-xs text-gray-400 mb-1';
const ERROR_MSG_CLASS = 'mt-1 text-xs text-red-400';

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center" aria-label="Langkah pengerjaan" data-testid="step-indicator">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const done   = step < currentStep;
        const active = step === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                data-testid={`step-circle-${step}`}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  done   && 'border-blue-500 bg-blue-500 text-white',
                  active && 'border-blue-500 bg-transparent text-blue-400',
                  !done && !active && 'border-white/20 bg-transparent text-gray-500'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={clsx(
                  'text-xs whitespace-nowrap',
                  active ? 'text-white font-medium' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={clsx(
                  'h-px flex-1 mx-2 mb-5 transition-colors',
                  done ? 'bg-blue-500' : 'bg-white/10'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main stepper
// ---------------------------------------------------------------------------
export default function EvaluasiStepper() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [step,            setStep]            = useState(1);
  const [evaluasiId,      setEvaluasiId]      = useState<string | null>(null);
  const [pendingEntries,  setPendingEntries]  = useState<PendingEntry[]>([]);
  const [generalError,    setGeneralError]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, trigger, getValues, formState: { errors } } = useForm<Step1FormData>({
    mode: 'onTouched',
    defaultValues: {
      judul:        '',
      kategori:     '',
      deskripsi:    '',
      budget_min:   '',
      budget_max:   '',
      deadline:     '',
      lampiran_url: '',
    },
  });

  const { data: kategoriOptions = [] } = useQuery({
    queryKey:  ['kategori-pengadaan'],
    queryFn:   getKategoriPengadaan,
    staleTime: Infinity,
  });

  const { data: detail } = useQuery({
    queryKey: ['evaluasi', evaluasiId],
    queryFn:  () => getEvaluasiDetail(evaluasiId!),
    enabled:  !!evaluasiId,
  });

  const savedVendors: Vendor[] = detail?.vendors ?? [];

  const createMutation = useMutation({
    mutationFn: createEvaluasi,
    onError:    (err: Error) => setGeneralError(err.message || 'Gagal membuat evaluasi'),
  });

  const addVendorMutation = useMutation({
    mutationFn: (payload: AddVendorPayload) => addVendor(evaluasiId!, payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['evaluasi', evaluasiId] }),
  });

  const removeVendorMutation = useMutation({
    mutationFn: (vendorId: string) => removeVendor(evaluasiId!, vendorId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['evaluasi', evaluasiId] }),
  });

  const uploadDokumenMutation = useMutation({
    mutationFn: (file: File) => uploadDokumen(evaluasiId!, file),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitEvaluasi(evaluasiId!),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['evaluasi'] });
      router.push(`/evaluasi/${evaluasiId}/proses`);
    },
    onError: (err: Error) => setGeneralError(err.message || 'Gagal memulai evaluasi'),
  });

  // ---------------------------------------------------------------------------
  // Step 1 → 2
  // ---------------------------------------------------------------------------
  async function handleStep1Next() {
    const valid = await trigger(['judul', 'kategori', 'deskripsi', 'budget_max', 'deadline']);
    if (!valid) return;

    setGeneralError(null);

    if (!evaluasiId) {
      const values   = getValues();
      const newEval  = await createMutation.mutateAsync({
        judul:      values.judul,
        kategori:   values.kategori,
        deskripsi:  values.deskripsi,
        budgetMin:  values.budget_min ? parseInt(values.budget_min, 10) : undefined,
        budgetMax:  parseInt(values.budget_max, 10),
        deadline:   values.deadline,
        lampiranUrl: values.lampiran_url || undefined,
      });
      setEvaluasiId(newEval.id);
    }
    setStep(2);
  }

  // ---------------------------------------------------------------------------
  // Step 2 — vendor management
  // ---------------------------------------------------------------------------
  function addPendingForm() {
    setPendingEntries(prev => [...prev, { kind: 'manual', localId: `pending-${Date.now()}-${Math.random()}` }]);
  }

  function handleFileSelected(file: File) {
    const localId = `upload-${Date.now()}-${Math.random()}`;
    setPendingEntries(prev => [
      ...prev,
      { kind: 'upload', localId, fileName: file.name, uploadId: null, uploadError: null },
    ]);

    uploadDokumenMutation.mutate(file, {
      onSuccess: (res) => {
        setPendingEntries(prev =>
          prev.map(entry =>
            entry.kind === 'upload' && entry.localId === localId
              ? { ...entry, uploadId: res.uploadId }
              : entry
          )
        );
      },
      onError: (err: Error) => {
        setPendingEntries(prev =>
          prev.map(entry =>
            entry.kind === 'upload' && entry.localId === localId
              ? { ...entry, uploadError: err.message || 'Gagal mengunggah dokumen' }
              : entry
          )
        );
      },
    });
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }

  async function handleSaveVendor(localId: string, payload: AddVendorPayload) {
    await addVendorMutation.mutateAsync(payload);
    setPendingEntries(prev => prev.filter(entry => entry.localId !== localId));
  }

  function handleRemovePending(localId: string) {
    setPendingEntries(prev => prev.filter(entry => entry.localId !== localId));
  }

  async function handleRemoveSavedVendor(vendorId: string) {
    await removeVendorMutation.mutateAsync(vendorId);
  }

  const canGoToStep3 = savedVendors.length >= 2 && pendingEntries.length === 0;

  // ---------------------------------------------------------------------------
  // Step 3 — submit
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    setGeneralError(null);
    await submitMutation.mutateAsync();
  }

  const step1Values = getValues();

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} />

      {generalError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {generalError}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Requirement                                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-5" data-testid="step-1-content">
          <h2 className="text-base font-semibold text-white">Requirement Pengadaan</h2>

          <div className="grid gap-4">
            {/* Judul */}
            <div>
              <label className={LABEL_CLASS}>
                Judul Evaluasi <span className="text-red-400">*</span>
              </label>
              <input
                {...register('judul', { required: 'Judul evaluasi wajib diisi' })}
                placeholder="Contoh: Pengadaan Laptop Kantor 2026"
                className={errors.judul ? INPUT_ERROR_CLASS : INPUT_CLASS}
              />
              {errors.judul && <p className={ERROR_MSG_CLASS}>{errors.judul.message}</p>}
            </div>

            {/* Kategori */}
            <div>
              <label className={LABEL_CLASS}>
                Kategori Pengadaan <span className="text-red-400">*</span>
              </label>
              <select
                {...register('kategori', { required: 'Kategori wajib dipilih' })}
                className={errors.kategori ? INPUT_ERROR_CLASS : INPUT_CLASS}
              >
                <option value="">Pilih kategori...</option>
                {kategoriOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.kategori && <p className={ERROR_MSG_CLASS}>{errors.kategori.message}</p>}
            </div>

            {/* Deskripsi */}
            <div>
              <label className={LABEL_CLASS}>
                Deskripsi Kebutuhan <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register('deskripsi', { required: 'Deskripsi kebutuhan wajib diisi' })}
                rows={4}
                placeholder="Jelaskan kebutuhan pengadaan secara detail..."
                className={clsx('resize-none', errors.deskripsi ? INPUT_ERROR_CLASS : INPUT_CLASS)}
              />
              {errors.deskripsi && <p className={ERROR_MSG_CLASS}>{errors.deskripsi.message}</p>}
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Budget Minimum (IDR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    Rp
                  </span>
                  <input
                    {...register('budget_min')}
                    type="number"
                    min={0}
                    placeholder="Opsional"
                    className={clsx(INPUT_CLASS, 'pl-8')}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  Budget Maksimal (IDR) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    Rp
                  </span>
                  <input
                    {...register('budget_max', {
                      required: 'Budget maksimal wajib diisi',
                      validate: (v) => {
                        const n = parseInt(v, 10);
                        if (!v || isNaN(n)) return 'Budget maksimal wajib diisi';
                        if (n <= 0) return 'Budget harus lebih dari 0';
                        return true;
                      },
                    })}
                    type="number"
                    min={1}
                    placeholder="100000000"
                    className={clsx('pl-8', errors.budget_max ? INPUT_ERROR_CLASS : INPUT_CLASS)}
                  />
                </div>
                {errors.budget_max && <p className={ERROR_MSG_CLASS}>{errors.budget_max.message}</p>}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className={LABEL_CLASS}>
                Deadline <span className="text-red-400">*</span>
              </label>
              <input
                {...register('deadline', { required: 'Deadline wajib diisi' })}
                type="date"
                data-testid="deadline-input"
                className={errors.deadline ? INPUT_ERROR_CLASS : INPUT_CLASS}
              />
              {errors.deadline && <p className={ERROR_MSG_CLASS}>{errors.deadline.message}</p>}
            </div>

            {/* Lampiran */}
            <div>
              <label className={LABEL_CLASS}>URL Lampiran</label>
              <input
                {...register('lampiran_url')}
                placeholder="https://drive.google.com/... (opsional)"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleStep1Next}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
            >
              {createMutation.isPending ? 'Membuat evaluasi...' : 'Lanjut'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Tambah Vendor                                                */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-5" data-testid="step-2-content">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Tambah Vendor</h2>
            <p className="text-xs text-gray-500">{savedVendors.length}/10 vendor</p>
          </div>

          {savedVendors.length < 2 && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
              Minimal 2 vendor harus ditambahkan sebelum melanjutkan.
            </div>
          )}

          <div className="space-y-3">
            {savedVendors.map((v) => (
              <VendorInputCard
                key={v.id}
                vendor={v}
                mode="manual"
                onRemove={() => handleRemoveSavedVendor(v.id)}
                onSave={async () => {}}
              />
            ))}

            {pendingEntries.map((entry) =>
              entry.kind === 'manual' ? (
                <VendorInputCard
                  key={entry.localId}
                  vendor={null}
                  mode="manual"
                  onRemove={() => handleRemovePending(entry.localId)}
                  onSave={(payload) => handleSaveVendor(entry.localId, payload)}
                />
              ) : (
                <UploadVendorCard
                  key={entry.localId}
                  evaluasiId={evaluasiId!}
                  uploadId={entry.uploadId}
                  fileName={entry.fileName}
                  uploadError={entry.uploadError}
                  onRemove={() => handleRemovePending(entry.localId)}
                  onSave={(payload) => handleSaveVendor(entry.localId, payload)}
                />
              )
            )}

            {savedVendors.length + pendingEntries.length < 10 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addPendingForm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border border-dashed border-white/20 text-sm text-gray-400
                    hover:text-white hover:border-white/40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Vendor Manual
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border border-dashed border-white/20 text-sm text-gray-400
                    hover:text-white hover:border-white/40 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Dokumen Penawaran
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileInputChange}
                  className="hidden"
                  data-testid="dokumen-file-input"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400
                hover:text-white transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canGoToStep3}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Konfirmasi                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="space-y-5" data-testid="step-3-content">
          <h2 className="text-base font-semibold text-white">Konfirmasi Evaluasi</h2>

          {/* Summary step 1 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/10">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">Judul</p>
              <p className="text-sm text-white mt-0.5">{step1Values.judul}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">Kategori</p>
              <p className="text-sm text-white mt-0.5 capitalize">
                {step1Values.kategori.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">Deskripsi</p>
              <p className="text-sm text-white mt-0.5 whitespace-pre-wrap">{step1Values.deskripsi}</p>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Budget Maks.</p>
                <p className="text-sm text-white mt-0.5">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(parseInt(step1Values.budget_max, 10))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Deadline</p>
                <p className="text-sm text-white mt-0.5">
                  {new Date(step1Values.deadline).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor list */}
          <div>
            <p className="text-xs text-gray-400 mb-2">{savedVendors.length} Vendor</p>
            <div className="space-y-2">
              {savedVendors.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.02]"
                >
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{v.nama_perusahaan}</p>
                    <p className="text-xs text-gray-400">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        maximumFractionDigits: 0,
                      }).format(v.harga_penawaran)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimasi */}
          <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            Estimasi waktu proses AI: <strong>5–10 menit</strong>. Anda dapat memantau
            perkembangan di halaman proses.
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400
                hover:text-white transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
            >
              <Send className="w-4 h-4" />
              {submitMutation.isPending ? 'Memulai proses...' : 'Mulai Evaluasi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
