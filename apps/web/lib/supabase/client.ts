import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useAuthStore } from '../../stores/authStore';

let browserClient: SupabaseClient | null = null;

// Singleton browser client used only for Supabase Realtime subscriptions and
// direct RLS-scoped reads (e.g. agent_progress in P-04). We don't persist a
// Supabase auth session here — the app's own JWT lives in authStore, so every
// REST request reads the current token at call time via a custom fetch. This
// keeps RLS's auth.uid() resolving to the logged-in user without duplicating
// session/refresh logic that apiFetch() already owns.
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY kosong).');
    }

    browserClient = createClient(url, anonKey, {
      auth:   { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const token   = useAuthStore.getState().accessToken;
          const headers = new Headers(init?.headers);
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      },
    });
  }

  return browserClient;
}

// Authorize the client's Realtime connection with the user's current access
// token, so postgres_changes subscriptions are evaluated under the same RLS
// policies as REST reads (otherwise Realtime treats the connection as anon).
export function setSupabaseAccessToken(accessToken: string | null): void {
  getSupabaseBrowserClient().realtime.setAuth(accessToken ?? undefined);
}
