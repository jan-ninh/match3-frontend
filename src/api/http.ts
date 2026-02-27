// src/api/http.ts
const API = import.meta.env.VITE_API_URL || '';

// Debug: Log API URL on app start
if (typeof window !== 'undefined') {
  console.log('⚙️ API URL configured:', API || '(Will use relative paths)');
}

type ReqOpts = RequestInit & { skipJson?: boolean };

export async function request<T = unknown>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { skipJson, ...fetchOpts } = opts;

  const url = `${API}${path}`;
  console.log(`📡 Requesting: ${url}`);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ensure headers is always an object
  const existingHeaders = fetchOpts.headers as Record<string, string> | undefined;
  fetchOpts.headers = {
    ...defaultHeaders,
    ...existingHeaders,
  };

  const res = await fetch(url, {
    ...fetchOpts,
    credentials: 'include', // Always send cookies
  });

  console.log(`📨 Response status: ${res.status} ${res.statusText}`);

  if (skipJson) return res as unknown as T;

  let data: T;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Invalid JSON response from server');
  }

  if (!res.ok) {
    const message = (data as any)?.error || (data as any)?.message || 'Server error';
    const err: any = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

const TOKEN_STORAGE_KEY = 'authToken';

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}
