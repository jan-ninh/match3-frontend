export const GUEST_STORAGE_KEY = 'match3-guest-v1';
export const GUEST_CAMPAIGN_VERSION = 'stages-1-11-sandbox-12-v1';
// Before dev inventory inflation (99a2685): one bomb, one laser, two shuffles.
export const GUEST_STARTING_POWERS = Object.freeze({ bomb: 1, laser: 1, extraShuffle: 2 });
export type GuestPower = keyof typeof GUEST_STARTING_POWERS;
export type GuestAttempt = { attemptId: string; stageId: number; status: 'playing' | 'completed' | 'lost' | 'left' };
export type GuestSave = {
  schemaVersion: 1;
  campaignVersion: typeof GUEST_CAMPAIGN_VERSION;
  runId: string;
  completedStages: number[];
  lastPlayedStage: number;
  powers: Record<GuestPower, number>;
  activeAttempt: GuestAttempt | null;
};
export type GuestSnapshot = { save: GuestSave; persistence: 'device' | 'visit'; recovered: boolean; conflict: boolean; entryId: string | null };
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type Binding = { runId: string; attemptId: string };

export function canonicalGuestPower(key: unknown): GuestPower | null {
  if (key === 'gridlaser' || key === 'bomb') return 'bomb';
  return key === 'laser' || key === 'extraShuffle' ? key : null;
}

export function guestStageAccess(save: GuestSave) {
  const campaignComplete = save.completedStages.length === 11;
  const frontier = campaignComplete ? 12 : save.completedStages.length + 1;
  return { frontier, campaignComplete, playableStages: [frontier], sandboxUnlocked: campaignComplete };
}

export function resolveGuestStage(save: GuestSave, requested: number): number {
  const access = guestStageAccess(save);
  return access.playableStages.includes(requested) ? requested : access.frontier;
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const id = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const stage = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 12;

export function parseGuestSave(raw: string): GuestSave | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (!record(v) || v.schemaVersion !== 1 || v.campaignVersion !== GUEST_CAMPAIGN_VERSION || !id(v.runId)) return null;
    if (!Array.isArray(v.completedStages) || v.completedStages.length > 11 || !v.completedStages.every((n, i) => n === i + 1)) return null;
    if (!stage(v.lastPlayedStage) || v.lastPlayedStage > Math.min(12, v.completedStages.length + 1)) return null;
    if (!record(v.powers) || Object.keys(v.powers).length !== 3) return null;
    const powers = v.powers;
    if (!Object.keys(GUEST_STARTING_POWERS).every((k) => Number.isSafeInteger(powers[k]) && Number(powers[k]) >= 0)) return null;
    const a = v.activeAttempt;
    if (a !== null) {
      if (!record(a) || !id(a.attemptId) || !stage(a.stageId) || !['playing', 'completed', 'lost', 'left'].includes(String(a.status))) return null;
      const frontier = Math.min(12, v.completedStages.length + 1);
      if (a.stageId !== v.lastPlayedStage) return null;
      if (a.status === 'completed' ? a.stageId !== v.completedStages.length : a.stageId !== frontier) return null;
    }
    return {
      schemaVersion: 1,
      campaignVersion: GUEST_CAMPAIGN_VERSION,
      runId: v.runId,
      completedStages: [...v.completedStages],
      lastPlayedStage: v.lastPlayedStage,
      powers: { bomb: Number(powers.bomb), laser: Number(powers.laser), extraShuffle: Number(powers.extraShuffle) },
      activeAttempt: a === null ? null : { attemptId: String(a.attemptId), stageId: Number(a.stageId), status: a.status as GuestAttempt['status'] },
    };
  } catch {
    return null;
  }
}

export class GuestStore {
  private snapshot: GuestSnapshot;
  private listeners = new Set<() => void>();
  private storage: (() => StoragePort) | undefined;
  private makeId: () => string;
  private entry: string | null = null;
  private lease = 0;
  private consumed = new Set<number>();
  private persistedRaw: string | null = null;

  constructor(storage?: () => StoragePort, makeId = () => crypto.randomUUID()) {
    this.storage = storage;
    this.makeId = makeId;
    let save = this.fresh();
    let persistence: GuestSnapshot['persistence'] = storage ? 'device' : 'visit';
    let recovered = false;
    try {
      const raw = storage?.().getItem(GUEST_STORAGE_KEY);
      if (raw !== null && raw !== undefined) {
        const parsed = parseGuestSave(raw);
        if (parsed) save = parsed;
        else recovered = true;
      }
    } catch {
      persistence = 'visit';
    }
    // Restore campaign/inventory, never the live board or a still-playing attempt.
    if (save.activeAttempt?.status === 'playing') save = { ...save, activeAttempt: { ...save.activeAttempt, status: 'left' } };
    this.snapshot = { save, persistence, recovered, conflict: false, entryId: null };
    this.persist();
  }

  private fresh(): GuestSave {
    return {
      schemaVersion: 1,
      campaignVersion: GUEST_CAMPAIGN_VERSION,
      runId: this.makeId(),
      completedStages: [],
      lastPlayedStage: 1,
      powers: { ...GUEST_STARTING_POWERS },
      activeAttempt: null,
    };
  }
  getSnapshot = (): GuestSnapshot => this.snapshot;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private persist() {
    if (this.snapshot.persistence === 'visit') return;
    try {
      const raw = JSON.stringify(this.snapshot.save);
      this.storage?.().setItem(GUEST_STORAGE_KEY, raw);
      this.persistedRaw = raw;
    } catch {
      this.snapshot = { ...this.snapshot, persistence: 'visit' };
    }
  }
  // Idle tabs adopt the shared save; a live attempt must never overwrite another tab.
  syncExternal = (raw: string | null) => {
    if (this.snapshot.persistence === 'visit' || raw === this.persistedRaw) return;
    if (this.entry !== null || this.snapshot.conflict) {
      this.snapshot = { ...this.snapshot, conflict: true };
    } else {
      const parsed = raw === null ? null : parseGuestSave(raw);
      this.persistedRaw = raw;
      this.snapshot = { ...this.snapshot, save: parsed ?? this.fresh(), recovered: raw !== null && !parsed, entryId: null };
    }
    this.listeners.forEach((fn) => fn());
  };
  private writable(): boolean {
    if (this.snapshot.conflict) return false;
    if (this.snapshot.persistence === 'device') {
      try {
        const raw = this.storage!().getItem(GUEST_STORAGE_KEY);
        this.syncExternal(raw);
      } catch {
        this.snapshot = { ...this.snapshot, persistence: 'visit' };
      }
    }
    return !this.snapshot.conflict;
  }
  private publish(save: GuestSave) {
    this.snapshot = { ...this.snapshot, save, entryId: this.entry };
    this.persist();
    this.listeners.forEach((fn) => fn());
  }
  reset = () => {
    if (!this.writable()) return;
    this.entry = null;
    this.consumed.clear();
    this.publish(this.fresh());
  };

  enter(stageId: number, entryId: string): { binding: Binding; lease: number } | null {
    if (!this.writable()) return null;
    const save = this.snapshot.save;
    if (this.entry !== entryId && resolveGuestStage(save, stageId) !== stageId) throw new Error('Guest stage is locked');
    this.lease++;
    if (this.entry !== entryId || !save.activeAttempt) {
      this.entry = entryId;
      this.consumed.clear();
      this.publish({ ...save, lastPlayedStage: stageId, activeAttempt: { attemptId: this.makeId(), stageId, status: 'playing' } });
    }
    return { binding: { runId: this.snapshot.save.runId, attemptId: this.snapshot.save.activeAttempt!.attemptId }, lease: this.lease };
  }
  release(lease: number) {
    // React StrictMode reattaches synchronously. Only an actual route leave ends the lease.
    queueMicrotask(() => {
      if (this.lease === lease) this.leave();
    });
  }
  leave = () => {
    if (!this.writable()) return;
    this.entry = null;
    const save = this.snapshot.save;
    this.publish(save.activeAttempt?.status === 'playing' ? { ...save, activeAttempt: { ...save.activeAttempt, status: 'left' } } : save);
  };
  finish(binding: Binding, outcome: 'WIN' | 'LOSS'): boolean {
    if (!this.writable()) return false;
    const save = this.snapshot.save;
    const a = save.activeAttempt;
    if (save.runId !== binding.runId || a?.attemptId !== binding.attemptId || a.status !== 'playing') return false;
    if (outcome === 'WIN' && a.stageId === 12) return false; // sandbox is not a campaign objective
    this.publish({
      ...save,
      completedStages: outcome === 'WIN' ? [...save.completedStages, a.stageId] : save.completedStages,
      activeAttempt: { ...a, status: outcome === 'WIN' ? 'completed' : 'lost' },
    });
    return true;
  }
  consume(binding: Binding, key: GuestPower, amount: number, requestId: number): boolean {
    if (!this.writable()) return false;
    const save = this.snapshot.save;
    if (save.runId !== binding.runId || save.activeAttempt?.attemptId !== binding.attemptId || save.activeAttempt.status !== 'playing') return false;
    if (!Number.isSafeInteger(requestId) || requestId <= 0 || !Number.isSafeInteger(amount) || amount <= 0 || this.consumed.has(requestId)) return false;
    this.consumed.add(requestId);
    this.publish({ ...save, powers: { ...save.powers, [key]: Math.max(0, save.powers[key] - amount) } });
    return true;
  }
}
