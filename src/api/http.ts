// src/api/http.ts
const API = import.meta.env.VITE_API_URL || '';

type ReqOpts = RequestInit & { skipJson?: boolean };

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'Server error';

  const rec = payload as Record<string, unknown>;
  const err = rec.error;
  if (typeof err === 'string' && err.trim().length > 0) return err;

  const msg = rec.message;
  if (typeof msg === 'string' && msg.trim().length > 0) return msg;

  return 'Server error';
}

type RequestError = Error & { status?: number; payload?: unknown };

export async function request<T = unknown>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { skipJson, ...fetchOpts } = opts;

  const url = `${API}${path}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ensure headers is always an object
  const existingHeaders = fetchOpts.headers as Record<string, string> | undefined;
  fetchOpts.headers = {
    ...defaultHeaders,
    ...(existingHeaders ?? {}),
  };

  const res = await fetch(url, fetchOpts);

  if (skipJson) return res as unknown as T;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid JSON response from server');
  }

  if (!res.ok) {
    const message = getErrorMessage(data);
    const err: RequestError = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data as T;
}
