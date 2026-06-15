'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MSWProvider } from './msw-provider';
import { useAuthStore } from '../stores/authStore';
import { getMe, refreshToken } from '../lib/api/auth';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function initSession() {
      if (isAuthenticated) {
        setLoading(false);
        return;
      }

      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      try {
        const refreshData = await refreshToken();
        if (refreshData?.accessToken) {
          const user = await getMe();
          setUser({
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            accessToken: refreshData.accessToken,
          });
        } else {
          clearUser();
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        clearUser();
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [isAuthenticated, pathname, router, setUser, clearUser]);

  if (loading && pathname !== '/login') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#07080a] text-gray-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-gray-400 font-sans">Memuat sesi Anda...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute default stale time
            retry: 2, // Retry queries twice
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0, // Do not retry mutations automatically
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MSWProvider>
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </MSWProvider>
    </QueryClientProvider>
  );
}
