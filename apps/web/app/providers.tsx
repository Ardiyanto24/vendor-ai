'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MSWProvider } from './msw-provider';

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
        {children}
      </MSWProvider>
    </QueryClientProvider>
  );
}
