'use client';

import { clsx } from 'clsx';

const MAX_LENGTH = 1000;

interface PreferenceInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreferenceInput({ value, onChange }: PreferenceInputProps) {
  const count = value.length;
  const overLimit = count > MAX_LENGTH;

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        Preferensi atau Prioritas Perusahaan (opsional)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={MAX_LENGTH}
        placeholder="Contoh: Utamakan vendor lokal dengan pengalaman kerja sama jangka panjang, atau prioritaskan kecepatan pengiriman dibanding harga termurah."
        data-testid="preferensi-input"
        className={clsx(
          'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border resize-none',
          'outline-none focus:border-blue-500/60 placeholder-gray-600 transition-colors',
          overLimit ? 'border-red-500/60' : 'border-white/10'
        )}
      />
      <p
        data-testid="preferensi-counter"
        className={clsx('mt-1 text-xs text-right', overLimit ? 'text-red-400' : 'text-gray-500')}
      >
        {count}/{MAX_LENGTH}
      </p>
    </div>
  );
}
