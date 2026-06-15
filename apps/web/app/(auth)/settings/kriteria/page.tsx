'use client';

import React from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';

export default function SettingsKriteriaPage() {
  const router = useRouter();
  const { role } = useAuthStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#07080a] text-gray-200 p-6">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0d0e12]/70 backdrop-blur-xl shadow-lg relative">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 mb-3">
            <Settings className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Konfigurasi Kriteria</h1>
          <p className="text-xs text-gray-400 mt-1">Akses diizinkan (Peran: {role})</p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
    </main>
  );
}
