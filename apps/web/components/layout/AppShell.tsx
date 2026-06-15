'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import Sidebar from './Sidebar';
import AIPanel from './AIPanel';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setContext = useChatStore((state) => state.setContext);

  useEffect(() => {
    let evaluasiId: string | null = null;
    if (pathname) {
      const match = pathname.match(/\/evaluasi\/([^/]+)/);
      // Ensure we don't treat 'baru' as an ID
      if (match && match[1] !== 'baru') {
        evaluasiId = match[1];
      }
    }
    setContext({ page: pathname || null, evaluasiId });
  }, [pathname, setContext]);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#07080a] text-gray-200">
      {/* Sidebar kiri (lebar 220px tetap) */}
      <Sidebar />

      {/* Konten Tengah (flex-1) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#07080a]">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>

      {/* Panel AI Kanan (lebar 360px tetap) */}
      <AIPanel />
    </div>
  );
}
