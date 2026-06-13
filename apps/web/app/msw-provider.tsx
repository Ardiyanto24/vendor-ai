'use client';

import React, { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initMsw() {
      if (process.env.NODE_ENV === 'development') {
        try {
          const { worker } = await import('../test/browser');
          await worker.start({
            onUnhandledRequest: 'bypass',
          });
        } catch (error) {
          console.error('Failed to start MSW:', error);
        }
      }
      setReady(true);
    }

    initMsw();
  }, []);

  if (!ready && process.env.NODE_ENV === 'development') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Initializing mock environment...</p>
      </div>
    );
  }

  return <>{children}</>;
}
