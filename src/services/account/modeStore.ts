import { RequestError } from '../../api/transport.ts';
import type { RequestOptions } from '../../api/transport.ts';
import { readCurrentUser } from '../../api/profileShape.ts';
import type { CurrentUser } from '../../api/profileShape.ts';
export type SessionSnapshot = {
  mode: 'demo' | 'account';
  generation: number;
  session: 'none' | 'checking' | 'verified' | 'unknown' | 'expired';
  availability: 'idle' | 'checking' | 'available' | 'unavailable' | 'rejected';
  profileRequest: 'idle' | 'loading' | 'success' | 'error';
  selected: CurrentUser | null;
  profile: CurrentUser | null;
  error?: RequestError;
  logoutUnconfirmed: boolean;
};
export type Transport = <T = unknown>(path: string, options?: RequestOptions) => Promise<T>;
type Envelope = { accessToken: string; user: CurrentUser };
function envelope(value: unknown): Envelope {
  if (!value || typeof value !== 'object' || !('accessToken' in value) || typeof value.accessToken !== 'string' || !value.accessToken || !('user' in value))
    throw new RequestError('protocol');
  return { accessToken: value.accessToken, user: readCurrentUser(value.user) };
}
const initial = (generation = 0): SessionSnapshot => ({
  mode: 'demo',
  generation,
  session: 'none',
  availability: 'idle',
  profileRequest: 'idle',
  selected: null,
  profile: null,
  logoutUnconfirmed: false,
});
export class SessionStore {
  private snapshot = initial();
  private token: string | null = null; // Only memory; deliberately excluded from snapshots and storage.
  private listeners = new Set<() => void>();
  private intent: AbortController | undefined;
  private profileRead: AbortController | undefined;
  private sequence = 0;
  private renewal: { generation: number; promise: Promise<void> } | null = null;
  private cookieTail: Promise<void> = Promise.resolve();
  private transport: Transport;
  constructor(transport: Transport) {
    this.transport = transport;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(next: SessionSnapshot) {
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }
  isCurrent = (generation: number, id?: string) =>
    this.snapshot.mode === 'account' && generation === this.snapshot.generation && (!id || id === this.snapshot.selected?.id);
  private clearReads() {
    this.intent?.abort();
    this.profileRead?.abort();
    this.sequence++;
    this.token = null;
  }
  playDemo = () => {
    this.clearReads();
    this.publish(initial(this.snapshot.generation + 1));
  };
  private begin() {
    this.clearReads();
    const generation = this.snapshot.generation + 1;
    this.intent = new AbortController();
    this.publish({ ...initial(generation), mode: 'account', session: 'checking', availability: 'checking', profileRequest: 'loading' });
    return generation;
  }
  private reject(generation: number, error: unknown) {
    if (!this.isCurrent(generation)) return;
    const e = error instanceof RequestError ? error : new RequestError('protocol');
    this.token = null;
    const expired = e.kind === 'unauthenticated';
    this.publish({
      ...this.snapshot,
      session: expired ? 'expired' : 'unknown',
      availability: expired ? 'rejected' : 'unavailable',
      profileRequest: 'error',
      selected: null,
      profile: null,
      error: e,
    });
  }
  private accept(generation: number, value: Envelope, expectedId?: string) {
    if (!this.isCurrent(generation)) throw new RequestError('cancelled');
    if (expectedId && value.user.id !== expectedId) throw new RequestError('unauthenticated');
    this.token = value.accessToken;
    const accepted =
      this.snapshot.selected?.id === value.user.id && this.snapshot.selected.revision > value.user.revision ? this.snapshot.selected : value.user;
    this.publish({
      ...this.snapshot,
      session: 'verified',
      availability: 'available',
      profileRequest: 'success',
      selected: accepted,
      profile: accepted,
      error: undefined,
    });
  }
  adoptGameplay = (generation: number, value: CurrentUser): boolean => {
    if (!this.isCurrent(generation, value.id) || this.snapshot.session !== 'verified') return false;
    if (this.snapshot.selected && value.revision < this.snapshot.selected.revision) return false;
    this.publish({ ...this.snapshot, selected: value, profile: value, availability: 'available', profileRequest: 'success', error: undefined });
    return true;
  };
  // Serialize cookie-changing operations so logout cannot clear a newly issued login cookie in this app instance.
  private cookie<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const end = performance.now() + 8000;
    const queued = this.cookieTail.then(() => {
      if (signal?.aborted) throw new RequestError('cancelled');
      const remaining = end - performance.now();
      if (remaining <= 0) throw new RequestError('timeout');
      return this.transport<T>(path, { method: 'POST', body: JSON.stringify(body), credentials: 'include', signal, deadlineMs: remaining, retryRead: false });
    });
    this.cookieTail = queued.then(
      () => {},
      () => {},
    );
    return queued;
  }
  async credentials(path: '/api/auth/login' | '/api/auth/register', body: unknown) {
    const generation = this.begin();
    try {
      const value = envelope(await this.cookie(path, body, this.intent!.signal));
      this.accept(generation, value);
      return value.user;
    } catch (error) {
      this.reject(generation, error);
      throw error;
    }
  }
  restore = async () => {
    const generation = this.begin();
    try {
      await this.renew(generation);
    } catch (error) {
      this.reject(generation, error);
    }
  };
  private renew(generation: number): Promise<void> {
    if (this.renewal?.generation === generation) return this.renewal.promise;
    if (!this.isCurrent(generation)) return Promise.reject(new RequestError('cancelled'));
    const expectedId = this.snapshot.selected?.id;
    const promise = (async () => {
      try {
        this.accept(generation, envelope(await this.cookie('/api/auth/refresh', {}, this.intent?.signal)), expectedId);
      } catch (error) {
        this.reject(generation, error);
        throw error;
      }
    })();
    this.renewal = { generation, promise };
    void promise.then(
      () => {
        if (this.renewal?.promise === promise) this.renewal = null;
      },
      () => {
        if (this.renewal?.promise === promise) this.renewal = null;
      },
    );
    return promise;
  }
  // Definitive middleware 401 permits one auth replay. Transport ambiguity never permits replay.
  request: Transport = async <T>(path: string, options: RequestOptions = {}) => {
    const { generation, selected, mode, session } = this.snapshot;
    if (mode !== 'account' || session === 'expired') throw new RequestError('unauthenticated');
    if (!this.token || !selected || session !== 'verified') throw new RequestError('unavailable');
    const owner = selected.id,
      sentToken = this.token;
    const controller = new AbortController();
    let timedOut = false;
    const budget = (options.method ?? 'GET').toUpperCase() === 'GET' ? 10000 : 8000;
    const end = performance.now() + budget;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, budget);
    const cancel = () => controller.abort();
    if (options.signal?.aborted) cancel();
    else options.signal?.addEventListener('abort', cancel, { once: true });
    const check = () => {
      if (controller.signal.aborted) throw new RequestError(timedOut ? 'timeout' : 'cancelled');
      if (!this.isCurrent(generation, owner)) throw new RequestError('cancelled');
    };
    const send = (token: string) => {
      check();
      const headers = new Headers(options.headers);
      headers.set('Authorization', 'Bearer ' + token);
      return this.transport<T>(path, {
        ...options,
        credentials: 'omit',
        headers,
        signal: controller.signal,
        deadlineMs: Math.min(8000, end - performance.now()),
      });
    };
    try {
      let result: T;
      try {
        result = await send(sentToken);
      } catch (error) {
        check();
        if (!(error instanceof RequestError) || error.kind !== 'unauthenticated') throw error;
        // Another request may already have renewed this same session.
        if (this.token === sentToken) {
          await new Promise<void>((resolve, reject) => {
            const stop = () => reject(new RequestError(timedOut ? 'timeout' : 'cancelled'));
            controller.signal.addEventListener('abort', stop, { once: true });
            void this.renew(generation)
              .then(resolve, reject)
              .finally(() => controller.signal.removeEventListener('abort', stop));
          });
        }
        check();
        if (!this.token) throw new RequestError('unauthenticated');
        try {
          result = await send(this.token);
        } catch (replayError) {
          if (replayError instanceof RequestError && replayError.kind === 'unauthenticated') this.reject(generation, replayError);
          throw replayError;
        }
      }
      check();
      return result;
    } catch (error) {
      const failure = timedOut ? new RequestError('timeout') : error;
      if (this.isCurrent(generation, owner) && failure instanceof RequestError && ['timeout', 'unavailable', 'server'].includes(failure.kind)) {
        this.publish({ ...this.snapshot, availability: 'unavailable', profileRequest: 'error', profile: null, error: failure });
      }
      throw failure;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      controller.abort();
    }
  };
  async ownerRequest<T>(ownerId: string, path: string, options: RequestOptions = {}): Promise<T> {
    if (ownerId !== this.snapshot.selected?.id) throw new RequestError('cancelled');
    return this.request<T>(path, options);
  }
  refreshProfile = async (): Promise<CurrentUser | null> => {
    const { generation, selected } = this.snapshot;
    if (!selected || !this.isCurrent(generation, selected.id)) return null;
    this.profileRead?.abort();
    const controller = new AbortController();
    this.profileRead = controller;
    const seq = ++this.sequence;
    this.publish({ ...this.snapshot, profileRequest: 'loading', error: undefined });
    try {
      const value = readCurrentUser(await this.request('/api/auth/me', { signal: controller.signal }));
      if (!this.isCurrent(generation, selected.id) || seq !== this.sequence || controller.signal.aborted) return null;
      if (value.id !== selected.id) throw new RequestError('unauthenticated');
      this.adoptGameplay(generation, value);
      return value;
    } catch (error) {
      if (this.isCurrent(generation) && seq === this.sequence && !controller.signal.aborted) this.reject(generation, error);
      return null;
    } finally {
      if (this.profileRead === controller) this.profileRead = undefined;
    }
  };
  logout = async () => {
    this.playDemo();
    const generation = this.snapshot.generation;
    try {
      await this.cookie('/api/auth/logout', {});
    } catch {
      if (this.snapshot.mode === 'demo' && this.snapshot.generation === generation) this.publish({ ...this.snapshot, logoutUnconfirmed: true });
    }
  };
}
