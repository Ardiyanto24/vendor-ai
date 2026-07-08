import { setupWorker } from 'msw/browser';

// Dev-mode browser worker intentionally does NOT reuse test/handlers — those
// stay MSW-mocked for the Vitest suite (test/server.ts), but F-01–F-10 are
// switched to the real BFF API in local dev now that the Supabase dev
// project is live (see FEATURE_STATUS.md). No handlers means every request
// bypasses to the real network (onUnhandledRequest: 'bypass' in msw-provider).
export const worker = setupWorker();
