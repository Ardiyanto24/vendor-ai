'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { logoutUser } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { nama, email, role, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearUser();
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#07080a] text-gray-200 p-6">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0d0e12]/70 backdrop-blur-xl shadow-lg relative">
        {/* Top glowing ambient accent */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Dashboard Utama</h1>
          <p className="text-xs text-gray-400 mt-1">Sesi Terautentikasi Berhasil</p>
        </div>

        <div className="space-y-4 border-t border-b border-white/5 py-4 my-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Nama:</span>
            <span className="font-semibold text-white">{nama || 'Tidak diketahui'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Email:</span>
            <span className="font-semibold text-white">{email || 'Tidak diketahui'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Peran:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {role || 'staff'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </main>
  );
}
