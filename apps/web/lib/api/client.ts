import { useAuthStore } from '../../stores/authStore';

export class APIError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const isBrowser = typeof window !== 'undefined';
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let token = options.token;
  if (!token) {
    if (isBrowser) {
      token = useAuthStore.getState().accessToken || undefined;
    } else {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        token = cookieStore.get('sb-access-token')?.value || undefined;
      } catch {
        // cookies() is not available (not in request context)
      }
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorJson: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      errorJson = await response.json();
    } catch {
      // Ignored
    }

    const code = errorJson.error?.code || 'UNKNOWN_ERROR';
    const message = errorJson.error?.message || `HTTP Error ${response.status}`;

    // Token refresh handler on 401 Unauthorized (browser only)
    if (response.status === 401 && code === 'TOKEN_EXPIRED' && isBrowser) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            const newToken = data.accessToken || data.data?.accessToken;
            if (newToken) {
              useAuthStore.getState().setUser({ accessToken: newToken });
              onRefreshed(newToken);
              isRefreshing = false;
              // Retry current request
              headers.set('Authorization', `Bearer ${newToken}`);
              const retryResponse = await fetch(url, { ...options, headers });
              if (retryResponse.ok) {
                const result = await retryResponse.json();
                return (result.success ? result.data : result) as T;
              }
            }
          }
        } catch (err) {
          console.error('Auto-refresh token failed:', err);
        } finally {
          isRefreshing = false;
          useAuthStore.getState().clearUser();
        }
      } else {
        // Wait for token refresh to complete
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              headers.set('Authorization', `Bearer ${newToken}`);
              const retryResponse = await fetch(url, { ...options, headers });
              if (retryResponse.ok) {
                const result = await retryResponse.json();
                resolve((result.success ? result.data : result) as T);
              } else {
                reject(new APIError('Retry failed after refresh', 'RETRY_FAILED', retryResponse.status));
              }
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    throw new APIError(message, code, response.status, errorJson.error?.details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const result = await response.json();
  if (result && typeof result === 'object' && 'success' in result && result.success === true) {
    return result.data as T;
  }

  return result as T;
}
