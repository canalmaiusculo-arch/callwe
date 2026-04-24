import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  subAccountId?: string;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });
      if (!res.ok) {
        clear();
        return null;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function buildHeaders(token: string | null, subAccountId: string | null, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (subAccountId) headers['X-Sub-Account-Id'] = subAccountId;
  return headers;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const subAccountId = opts.subAccountId ?? useTenantStore.getState().subAccountId;
  const body = opts.body ? JSON.stringify(opts.body) : undefined;

  let res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: buildHeaders(token, subAccountId, opts.headers),
    body,
    credentials: 'include',
  });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${BASE_URL}/api${path}`, {
        method,
        headers: buildHeaders(newToken, subAccountId, opts.headers),
        body,
        credentials: 'include',
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};
