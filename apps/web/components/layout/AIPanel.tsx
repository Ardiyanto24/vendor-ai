'use client';

import React from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Send, Bot, Sparkles } from 'lucide-react';

export default function AIPanel() {
  const activeContext = useChatStore((state) => state.activeContext);

  // Helper to get user-friendly page context name
  const getContextName = (page: string | null) => {
    if (!page) return 'Umum';
    if (page === '/dashboard') return 'Dashboard';
    if (page === '/evaluasi/baru') return 'Buat Evaluasi';
    if (page.includes('/evaluasi/') && page.includes('/proses')) return 'Proses Evaluasi';
    if (page.includes('/evaluasi/') && page.includes('/hasil')) return 'Hasil Evaluasi';
    if (page === '/riwayat') return 'Riwayat Evaluasi';
    if (page === '/approval') return 'Persetujuan (Approval)';
    if (page === '/settings/kriteria') return 'Konfigurasi Kriteria';
    return 'Umum';
  };

  return (
    <aside className="w-ai-panel-width h-screen bg-[#0d0e12] border-l border-gray-800 flex flex-col flex-shrink-0 font-sans text-gray-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 bg-[#090a0d] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="bg-purple-600/10 p-1.5 rounded-lg border border-purple-500/25">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              AI Assistant
            </h2>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Belum Terhubung
              </span>
            </div>
          </div>
        </div>

        {/* Active Context indicator */}
        <div className="text-right">
          <span className="text-[10px] text-gray-500 block font-semibold uppercase tracking-wider">
            Konteks
          </span>
          <span className="text-[11px] text-purple-400 font-medium truncate max-w-[120px] block">
            {getContextName(activeContext.page)}
          </span>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center text-center">
        <div className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-full mb-4 max-w-max">
          <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200 mb-1">
          Tanyakan sesuatu kepada AI...
        </h3>
        <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
          AI Assistant dapat membantu Anda menganalisis kriteria, merekomendasikan bobot, dan merangkum hasil TOPSIS.
        </p>
      </div>

      {/* Input Area (Disabled in F-02) */}
      <div className="p-4 border-t border-gray-800 bg-[#090a0d]">
        <div className="relative flex items-center bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 transition-all">
          <textarea
            rows={1}
            disabled
            placeholder="AI assistant dinonaktifkan di fase ini..."
            className="flex-1 bg-transparent border-0 outline-none text-xs text-gray-400 placeholder-gray-600 resize-none max-h-24 pr-10 cursor-not-allowed"
          />
          <button
            disabled
            className="absolute right-3 bg-gray-800 text-gray-600 p-1.5 rounded-lg transition-all cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-2.5">
          Koneksi SSE & fitur Chat RAG akan diaktifkan pada modul F-14.
        </p>
      </div>
    </aside>
  );
}
