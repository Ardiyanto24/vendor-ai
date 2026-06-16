'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Save, X, Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Vendor, AddVendorPayload } from 'types';

export type VendorMode = 'manual' | 'extracted' | 'loading' | 'error';

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

export default function VendorInputCard({ vendor, mode, onRemove, onSave }: VendorInputCardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    defaultValues: {
      nama_perusahaan: '',
      kontak_atau_website: '',
      harga_penawaran: '',
      catatan: '',
    },
  });

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

  // Edit mode — empty form for manual input
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-testid="vendor-input-form"
      className="px-4 py-4 rounded-xl border border-blue-500/30 bg-white/[0.02] space-y-3"
    >
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

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-medium transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
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
