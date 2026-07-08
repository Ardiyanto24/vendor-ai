'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Save, X, Building2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Vendor, AddVendorPayload, HasilEkstraksi, IndexingRagStatus } from 'types';

export type VendorMode = 'manual' | 'extracted' | 'loading' | 'error';

const LOW_CONFIDENCE_THRESHOLD = 0.6;

interface VendorFormData {
  nama_perusahaan: string;
  kontak_atau_website: string;
  harga_penawaran: string;
  catatan: string;
}

export interface VendorInputCardProps {
  vendor: Vendor | null;
  mode: VendorMode;
  onRemove: () => void;
  onSave: (data: AddVendorPayload) => Promise<void>;
  /** Mode `loading` — nama file yang sedang diekstrak. */
  fileName?: string;
  /** Mode `extracted` — hasil ekstraksi AI untuk pre-fill form. */
  hasilEkstraksi?: HasilEkstraksi | null;
  confidenceScore?: number | null;
  indexingRagStatus?: IndexingRagStatus | null;
  /** Mode `error` — pesan error dan fallback ke input manual. */
  errorMessage?: string;
  onRetryManual?: () => void;
}

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 ' +
  'outline-none focus:border-blue-500/60 placeholder-gray-600 transition-colors';
const INPUT_ERROR_CLASS =
  'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-red-500/60 ' +
  'outline-none focus:border-red-500/40 placeholder-gray-600';

function buildDefaultValues(hasilEkstraksi?: HasilEkstraksi | null): VendorFormData {
  return {
    nama_perusahaan: hasilEkstraksi?.nama_perusahaan.nilai ?? '',
    kontak_atau_website: hasilEkstraksi?.kontak.nilai ?? '',
    harga_penawaran:
      hasilEkstraksi?.harga_penawaran.nilai != null ? String(hasilEkstraksi.harga_penawaran.nilai) : '',
    catatan: hasilEkstraksi?.catatan_ekstraksi ?? '',
  };
}

export default function VendorInputCard({
  vendor,
  mode,
  onRemove,
  onSave,
  fileName,
  hasilEkstraksi,
  confidenceScore,
  indexingRagStatus,
  errorMessage,
  onRetryManual,
}: VendorInputCardProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    defaultValues: buildDefaultValues(mode === 'extracted' ? hasilEkstraksi : null),
  });

  // Pre-fill the form once extraction results arrive — useForm's defaultValues
  // are only read on first render, so a later transition to `extracted` needs
  // an explicit reset.
  useEffect(() => {
    if (mode === 'extracted' && hasilEkstraksi) {
      reset(buildDefaultValues(hasilEkstraksi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasilEkstraksi]);

  async function onSubmit(data: VendorFormData) {
    await onSave({
      namaPerusahaan:    data.nama_perusahaan,
      kontakAtauWebsite: data.kontak_atau_website || undefined,
      hargaPenawaran:    parseInt(data.harga_penawaran, 10),
      catatan:           data.catatan || undefined,
      sumberInput:       mode === 'extracted' ? 'extracted' : 'manual',
    });
  }

  // View mode — vendor is already saved on the server
  if (vendor !== null) {
    return (
      <div
        data-testid="vendor-card-saved"
        className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.02]"
      >
        <Building2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{vendor.nama_perusahaan}</p>
          {vendor.kontak_atau_website && (
            <p className="text-xs text-gray-400 mt-0.5">{vendor.kontak_atau_website}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{formatIDR(vendor.harga_penawaran)}</p>
          {vendor.catatan && (
            <p className="text-xs text-gray-500 mt-0.5 italic">{vendor.catatan}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Hapus vendor"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Mode: loading — AI sedang mengekstrak dokumen
  if (mode === 'loading') {
    return (
      <div
        data-testid="vendor-card-loading"
        className="px-4 py-4 rounded-xl border border-blue-500/20 bg-white/[0.02] space-y-3"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
          <div className="min-w-0">
            <p className="text-sm text-white">AI sedang membaca dokumen...</p>
            {fileName && <p className="text-xs text-gray-500 truncate mt-0.5">{fileName}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded bg-white/10 w-3/4 animate-pulse" />
          <div className="h-3 rounded bg-white/10 w-1/2 animate-pulse" />
          <div className="h-3 rounded bg-white/10 w-2/3 animate-pulse" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10
            text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Batal
        </button>
      </div>
    );
  }

  // Mode: error — ekstraksi gagal atau timeout
  if (mode === 'error') {
    return (
      <div
        data-testid="vendor-card-error"
        className="px-4 py-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{errorMessage ?? 'Ekstraksi dokumen gagal.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetryManual}
            data-testid="btn-input-manual"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
              text-xs text-white font-medium transition-colors"
          >
            Input Manual
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10
              text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>
      </div>
    );
  }

  // Mode: manual (empty form) or extracted (pre-filled, editable form)
  const isExtracted = mode === 'extracted';
  const isLowConfidence =
    isExtracted && (confidenceScore ?? hasilEkstraksi?.confidence_overall ?? 1) < LOW_CONFIDENCE_THRESHOLD;
  const isIndexing = isExtracted && (indexingRagStatus === 'pending' || indexingRagStatus === 'processing');
  const isIndexed = isExtracted && indexingRagStatus === 'done';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-testid="vendor-input-form"
      className={clsx(
        'px-4 py-4 rounded-xl border bg-white/[0.02] space-y-3',
        isExtracted ? 'border-emerald-500/30' : 'border-blue-500/30'
      )}
    >
      {isLowConfidence && (
        <div
          data-testid="low-confidence-indicator"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Harap verifikasi hasil ini — tingkat kepercayaan ekstraksi rendah
        </div>
      )}

      {/* Nama perusahaan */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Nama Perusahaan <span className="text-red-400">*</span>
        </label>
        <input
          {...register('nama_perusahaan', { required: 'Nama perusahaan wajib diisi' })}
          placeholder="PT. Contoh Indonesia"
          className={errors.nama_perusahaan ? INPUT_ERROR_CLASS : INPUT_CLASS}
        />
        {errors.nama_perusahaan && (
          <p className="mt-1 text-xs text-red-400">{errors.nama_perusahaan.message}</p>
        )}
      </div>

      {/* Kontak / website */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Kontak / Website</label>
        <input
          {...register('kontak_atau_website')}
          placeholder="www.contoh.co.id atau +62 812-xxxx"
          className={INPUT_CLASS}
        />
      </div>

      {/* Harga penawaran */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Harga Penawaran (IDR) <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            Rp
          </span>
          <input
            {...register('harga_penawaran', {
              required: 'Harga penawaran wajib diisi',
              validate: (v) => {
                const n = parseInt(v, 10);
                if (isNaN(n) || n <= 0) return 'Harga harus lebih dari 0';
                return true;
              },
            })}
            type="number"
            min={1}
            placeholder="50000000"
            className={clsx(
              'pl-8',
              errors.harga_penawaran ? INPUT_ERROR_CLASS : INPUT_CLASS
            )}
          />
        </div>
        {errors.harga_penawaran && (
          <p className="mt-1 text-xs text-red-400">{errors.harga_penawaran.message}</p>
        )}
      </div>

      {/* Catatan */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Catatan</label>
        <textarea
          {...register('catatan')}
          rows={2}
          placeholder="Catatan tambahan (opsional)"
          className={clsx(INPUT_CLASS, 'resize-none')}
        />
      </div>

      {(isIndexing || isIndexed) && (
        <div
          data-testid="rag-indexing-indicator"
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
            isIndexing
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          )}
        >
          {isIndexing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              Mengindeks dokumen untuk AI Chat...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Dokumen terindeks untuk AI Chat
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-medium transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {isSubmitting ? 'Menyimpan...' : isExtracted ? 'Konfirmasi' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10
            text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Batal
        </button>
      </div>
    </form>
  );
}
