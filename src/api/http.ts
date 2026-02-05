// src/api/http.ts
const API = import.meta.env.VITE_API_URL || '';

type ReqOpts = RequestInit & { skipJson?: boolean };

export async function request<T = unknown>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { skipJson, ...fetchOpts } = opts;

  const url = `${API}${path}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  fetchOpts.headers = {
    ...defaultHeaders,
    ...(fetchOpts.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, fetchOpts);

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
