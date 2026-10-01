export type FailureKind =
  | 'timeout'
  | 'cancelled'
  | 'unavailable'
  | 'unauthenticated'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'protocol'
  | 'configuration';
export class RequestError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;
  constructor(kind: FailureKind, status?: number) {
    const messages: Record<FailureKind, string> = {
      timeout: 'Request timed out',
      cancelled: 'Request cancelled',
      unavailable: 'Service unavailable',
      unauthenticated: 'Account request rejected (401)',
      forbidden: 'Operation not permitted',
      conflict: 'Account state conflict',
      validation: 'Request not accepted',
      server: 'Server unavailable',
      protocol: 'Unexpected server response',
      configuration: 'Invalid service configuration',
    };
    super(messages[kind]);
    this.name = 'RequestError';
    this.kind = kind;
    this.status = status;
  }
}
export type RequestOptions = RequestInit & { skipJson?: boolean; retryRead?: boolean; deadlineMs?: number };
const transient = (e: unknown) => e instanceof RequestError && ['timeout', 'unavailable', 'server'].includes(e.kind);
export function createRequester(base: string, config: { fetch?: typeof fetch; deadlineMs?: number; readBudgetMs?: number; retryDelayMs?: number } = {}) {
  const fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
  const deadline = config.deadlineMs ?? 8000,
    readBudget = config.readBudgetMs ?? 10000,
    delay = config.retryDelayMs ?? 1000;
  async function attempt<T>(path: string, options: RequestOptions, timeout: number): Promise<T> {
    const { signal, skipJson, retryRead: _retry, deadlineMs: _deadline, ...init } = options;
    void _retry;
    void _deadline;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onCancel: () => void = () => {};
    const stop = new Promise<never>((_, reject) => {
      const cancel = (kind: FailureKind) => {
        controller.abort();
        reject(new RequestError(kind));
      };
      onCancel = () => cancel('cancelled');
      if (signal?.aborted) onCancel();
      else signal?.addEventListener('abort', onCancel, { once: true });
      timer = setTimeout(() => cancel('timeout'), Math.max(1, timeout));
    });
    try {
      return await Promise.race([
        stop,
        (async () => {
          if (signal?.aborted) throw new RequestError('cancelled');
          let response: Response;
          try {
            response = await fetcher(base + path, { ...init, signal: controller.signal });
          } catch {
            throw new RequestError('unavailable');
          }
          // Buffer the body inside the deadline even when the caller wants a Response.
          const bytes = await response.arrayBuffer();
          if (!response.ok) {
            const status = response.status;
            throw new RequestError(
              status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status >= 500 ? 'server' : 'validation',
              status,
            );
          }
          if (skipJson) return new Response(bytes, { status: response.status, headers: response.headers }) as T;
          if (response.status === 204) return undefined as T;
          try {
            return JSON.parse(new TextDecoder().decode(bytes)) as T;
          } catch {
            throw new RequestError('protocol');
          }
        })(),
      ]);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError('unavailable');
    } finally {
      controller.abort();
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCancel);
    }
  }
  return async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    if (
      base &&
      (!(base.startsWith('https://') || base.startsWith('http://')) ||
        (() => {
          try {
            const u = new URL(base);
            return Boolean(u.username || u.password || u.search || u.hash);
          } catch {
            return true;
          }
        })())
    )
      throw new RequestError('configuration');
    if (!path.startsWith('/') || path.startsWith('//')) throw new RequestError('configuration');
    const safeRead = (options.method ?? 'GET').toUpperCase() === 'GET' && options.retryRead !== false;
    const end = performance.now() + (safeRead ? readBudget : (options.deadlineMs ?? deadline));
    for (let n = 0; ; n++) {
      try {
        return await attempt<T>(path, options, Math.min(options.deadlineMs ?? deadline, end - performance.now()));
      } catch (error) {
        if (!safeRead || n >= 1 || !transient(error) || end - performance.now() <= delay) throw error;
        await new Promise<void>((resolve, reject) => {
          const cancel = () => {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', cancel);
            reject(new RequestError('cancelled'));
          };
          const timer = setTimeout(() => {
            options.signal?.removeEventListener('abort', cancel);
            resolve();
          }, delay);
          if (options.signal?.aborted) cancel();
          else options.signal?.addEventListener('abort', cancel, { once: true });
        });
      }
    }
  };
}
