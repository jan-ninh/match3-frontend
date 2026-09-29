import { RequestError } from '../../api/transport.ts';
export type LegacyIdentity = { id: string; username: string; avatar?: string };
export type AccountAvailability = 'idle' | 'checking' | 'available' | 'unavailable' | 'rejected';
export type ModeSnapshot<I, P> = {
  mode: 'demo' | 'legacy-account';
  generation: number;
  availability: AccountAvailability;
  profileRequest: 'idle' | 'loading' | 'success' | 'error';
  selected: I | null;
  profile: P | null;
  error?: RequestError;
};
// Availability is an observation of a legacy API, never proof of authenticated identity.
export class ModeStore<I extends LegacyIdentity, P> {
  private snapshot: ModeSnapshot<I, P> = { mode: 'demo', generation: 0, availability: 'idle', profileRequest: 'idle', selected: null, profile: null };
  private listeners = new Set<() => void>();
  private read: AbortController | undefined;
  private sequence = 0;
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(s: ModeSnapshot<I, P>) {
    this.snapshot = s;
    this.listeners.forEach((fn) => fn());
  }
  isCurrent = (generation: number, id?: string) =>
    this.snapshot.generation === generation && this.snapshot.mode === 'legacy-account' && (!id || this.snapshot.selected?.id === id);
  playDemo = () => {
    this.read?.abort();
    this.sequence++;
    this.publish({ mode: 'demo', generation: this.snapshot.generation + 1, availability: 'idle', profileRequest: 'idle', selected: null, profile: null });
  };
  beginAccount = (identity: I | null) => {
    this.read?.abort();
    this.sequence++;
    const generation = this.snapshot.generation + 1;
    this.publish({ mode: 'legacy-account', generation, availability: 'checking', profileRequest: 'loading', selected: identity, profile: null });
    return generation;
  };
  rejectIntent = (generation: number, error: unknown) => {
    if (!this.isCurrent(generation)) return;
    const e = error instanceof RequestError ? error : new RequestError('protocol');
    this.publish({
      ...this.snapshot,
      availability: ['unauthenticated', 'forbidden', 'validation', 'conflict'].includes(e.kind) ? 'rejected' : 'unavailable',
      profile: null,
      profileRequest: 'error',
      error: e,
    });
  };
  setIdentity = (generation: number, identity: I) => {
    if (!this.isCurrent(generation)) return false;
    this.publish({ ...this.snapshot, selected: identity });
    return true;
  };
  async refresh(load: (id: string, signal: AbortSignal) => Promise<P>): Promise<P | null> {
    const { generation, selected, mode } = this.snapshot;
    if (mode !== 'legacy-account' || !selected) return null;
    this.read?.abort();
    const controller = new AbortController();
    this.read = controller;
    const seq = ++this.sequence;
    this.publish({ ...this.snapshot, availability: this.snapshot.profile ? 'available' : 'checking', profileRequest: 'loading', error: undefined });
    try {
      const profile = await load(selected.id, controller.signal);
      if (!this.isCurrent(generation, selected.id) || seq !== this.sequence || controller.signal.aborted) return null;
      this.publish({ ...this.snapshot, availability: 'available', profileRequest: 'success', profile, error: undefined });
      return profile;
    } catch (error) {
      if (this.isCurrent(generation, selected.id) && seq === this.sequence && !controller.signal.aborted) this.rejectIntent(generation, error);
      return null;
    } finally {
      if (this.read === controller) this.read = undefined;
    }
  }
}
export function readLegacyHint(storage: () => Pick<Storage, 'getItem'>): LegacyIdentity | null {
  try {
    const raw = storage().getItem('user');
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object') return null;
    const x = v as Record<string, unknown>;
    return typeof x.id === 'string' && x.id.length > 0 && typeof x.username === 'string'
      ? { id: x.id, username: x.username, avatar: typeof x.avatar === 'string' ? x.avatar : undefined }
      : null;
  } catch {
    return null;
  }
}
