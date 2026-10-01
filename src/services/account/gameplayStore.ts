import { RequestError } from '../../api/transport.ts';
import { readCurrentUser, validUUID } from '../../api/profileShape.ts';
import type { CurrentUser, ActiveAccountAttempt, CanonicalPowers } from '../../api/profileShape.ts';
import type { SessionStore } from './modeStore.ts';
import { persistenceFailure } from './outcomeStore.ts';
export const ACCOUNT_JOURNAL_KEY = 'match3-account-operations-v1';
export type Usage = { id: number; power: keyof CanonicalPowers };
type Common = { operationId: string; expectedRevision: number };
export type CommandBody = Common &
  (
    | { stageNumber: number }
    | { attemptId: string; outcome: 'WIN' | 'LOSS' | 'ABANDON'; usage: Usage[] }
    | { attemptId: string; power: keyof CanonicalPowers }
    | Record<never, never>
  );
export type PendingOperation = {
  ownerId: string;
  command: 'START' | 'TERMINAL' | 'REWARD' | 'LEGACY_ABANDON' | 'NEW_RUN';
  runId: string | null;
  createdAt: number;
  body: CommandBody;
};
type JournalRow = { ownerId: string; pending: PendingOperation | null; usageAttemptId: string | null; usage: Usage[] };
export type GameplayState = {
  ownerId: string | null;
  generation: number;
  status: 'idle' | 'reconciling' | 'saving' | 'saved' | 'unconfirmed' | 'not-accepted';
  binding: ActiveAccountAttempt | null;
  liveEntryId: string | null;
  pending: PendingOperation | null;
  data: CurrentUser | null;
  powers: CanonicalPowers;
  lastCommand: PendingOperation['command'] | null;
  storage: 'device' | 'visit-only' | 'recovered';
  safeToRetry: boolean;
  error?: string;
};
type StoragePort = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const owner = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const power = (v: unknown): v is keyof CanonicalPowers => v === 'bomb' || v === 'laser' || v === 'extraShuffle';
export const accountPower = (v: string): keyof CanonicalPowers | null => (v === 'gridlaser' || v === 'bomb' ? 'bomb' : power(v) ? v : null);
function usage(value: unknown): value is Usage[] {
  return (
    Array.isArray(value) &&
    value.length <= 1024 &&
    value.every((e) => record(e) && Object.keys(e).length === 2 && integer(e.id) && Number(e.id) > 0 && power(e.power)) &&
    new Set(value.map((e) => e.id)).size === value.length
  );
}
function parseRow(value: unknown): JournalRow | null {
  if (!record(value) || !owner(value.ownerId) || !usage(value.usage) || (value.usageAttemptId !== null && !validUUID(value.usageAttemptId))) return null;
  if (value.pending !== null) {
    const p = value.pending;
    if (
      !record(p) ||
      p.ownerId !== value.ownerId ||
      !integer(p.createdAt) ||
      (p.runId !== null && !validUUID(p.runId)) ||
      !record(p.body) ||
      !validUUID(p.body.operationId) ||
      !integer(p.body.expectedRevision)
    )
      return null;
    const b = p.body,
      keys = Object.keys(b).sort().join(',');
    if (p.command === 'START') {
      if (keys !== 'expectedRevision,operationId,stageNumber' || !Number.isInteger(b.stageNumber) || Number(b.stageNumber) < 1 || Number(b.stageNumber) > 12)
        return null;
    } else if (p.command === 'TERMINAL') {
      if (
        keys !== 'attemptId,expectedRevision,operationId,outcome,usage' ||
        !validUUID(b.attemptId) ||
        !['WIN', 'LOSS', 'ABANDON'].includes(String(b.outcome)) ||
        !usage(b.usage)
      )
        return null;
    } else if (p.command === 'REWARD') {
      if (keys !== 'attemptId,expectedRevision,operationId,power' || !validUUID(b.attemptId) || !power(b.power)) return null;
    } else if (p.command === 'LEGACY_ABANDON' || p.command === 'NEW_RUN') {
      if (keys !== 'expectedRevision,operationId') return null;
    } else return null;
  }
  // Select fields only: tokens, board state and arbitrary extra values cannot be copied into storage.
  const p = value.pending as PendingOperation | null;
  return {
    ownerId: value.ownerId,
    pending: p
      ? { ownerId: p.ownerId, command: p.command, runId: p.runId, createdAt: p.createdAt, body: JSON.parse(JSON.stringify(p.body)) as CommandBody }
      : null,
    usageAttemptId: value.usageAttemptId as string | null,
    usage: value.usage.map((e) => ({ id: e.id, power: e.power })),
  };
}
const blank = (generation = 0, storage: GameplayState['storage'] = 'device'): GameplayState => ({
  ownerId: null,
  generation,
  status: 'idle',
  binding: null,
  liveEntryId: null,
  pending: null,
  data: null,
  powers: { bomb: 0, laser: 0, extraShuffle: 0 },
  lastCommand: null,
  storage,
  safeToRetry: false,
});
const paths = {
  START: '/api/game/attempts/start',
  TERMINAL: '/api/game/attempts/terminal',
  REWARD: '/api/game/rewards/claim',
  NEW_RUN: '/api/game/new-run',
  LEGACY_ABANDON: '/api/game/legacy-abandon',
};
export class AccountGameplayStore {
  private state = blank();
  private rows = new Map<string, JournalRow>();
  private listeners = new Set<() => void>();
  private flights = new Map<string, Promise<void>>();
  private recovery: { key: string; promise: Promise<void> } | null = null;
  private startEntries = new Map<string, { entryId: string; generation: number }>();
  private leases = new Map<string, number>();
  private starts = new Map<string, Promise<void>>();
  private terminalAttempts = new Set<string>();
  private session: SessionStore;
  private storage: () => StoragePort | undefined;
  private uuid: () => string;
  private unsubscribe: () => void;
  constructor(session: SessionStore, storage: () => StoragePort | undefined = () => undefined, uuid = () => crypto.randomUUID()) {
    this.session = session;
    this.storage = storage;
    this.uuid = uuid;
    let raw: string | null = null;
    try {
      raw = storage()?.getItem(ACCOUNT_JOURNAL_KEY) ?? null;
    } catch {
      this.state = { ...this.state, storage: 'visit-only' };
    }
    try {
      if (raw) {
        const envelope: unknown = JSON.parse(raw);
        if (!record(envelope) || envelope.schemaVersion !== 1 || !Array.isArray(envelope.entries) || envelope.entries.length > 4)
          throw Error('invalid journal');
        for (const v of envelope.entries) {
          const row = parseRow(v);
          if (!row || this.rows.has(row.ownerId)) throw Error('invalid journal');
          this.rows.set(row.ownerId, row);
        }
      }
    } catch {
      this.rows.clear();
      this.state = { ...this.state, storage: 'recovered' };
    }
    this.unsubscribe = session.subscribe(this.onSession);
    this.onSession();
  }
  dispose() {
    this.unsubscribe();
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(next: GameplayState) {
    this.state = next;
    this.listeners.forEach((fn) => fn());
  }
  private save() {
    try {
      const storage = this.storage();
      if (!storage) throw Error('storage unavailable');
      storage.setItem(ACCOUNT_JOURNAL_KEY, JSON.stringify({ schemaVersion: 1, entries: [...this.rows.values()] }));
    } catch {
      this.state = { ...this.state, storage: 'visit-only' };
    }
  }
  private row(id: string): JournalRow {
    let row = this.rows.get(id);
    if (!row) {
      if (this.rows.size >= 4) throw new RequestError('conflict');
      row = { ownerId: id, pending: null, usageAttemptId: null, usage: [] };
      this.rows.set(id, row);
    }
    return row;
  }
  private current(id: string, generation: number) {
    return this.session.isCurrent(generation, id);
  }
  private projection(data: CurrentUser, binding: ActiveAccountAttempt | null) {
    const result = { ...data.powers };
    const row = this.rows.get(data.id);
    if (binding && data.activeAttempt?.attemptId === binding.attemptId && row?.usageAttemptId === binding.attemptId) {
      Object.assign(result, binding.initialPowers);
      if (!binding.scenarioVersion.endsWith(':laserrow-match4-training')) for (const e of row.usage) result[e.power] = Math.max(0, result[e.power] - 1);
    }
    return result;
  }
  private onSession = () => {
    const auth = this.session.getSnapshot();
    if (auth.mode === 'demo') {
      this.leases.clear();
      this.publish(blank(auth.generation, this.state.storage));
      return;
    }
    if (!auth.selected || auth.session !== 'verified') {
      if (auth.generation !== this.state.generation) {
        this.leases.clear();
        this.publish(blank(auth.generation, this.state.storage));
      }
      return; // An acknowledged board survives expiry/outage within its own generation.
    }
    const data = auth.selected,
      isNew = this.state.ownerId !== data.id || this.state.generation !== auth.generation;
    if (isNew) {
      this.leases.clear();
      this.terminalAttempts.clear();
      this.starts.clear();
      this.startEntries.clear();
      const pending = this.rows.get(data.id)?.pending ?? null;
      this.publish({
        ...blank(auth.generation, this.state.storage),
        ownerId: data.id,
        data,
        powers: { ...data.powers },
        pending,
        status: pending ? 'reconciling' : 'idle',
        lastCommand: pending?.command ?? null,
      });
      if (pending) void this.reconcile(false);
      return;
    }
    if (this.state.data && data.revision < this.state.data.revision) return;
    this.publish({ ...this.state, data, powers: this.projection(data, this.state.binding) });
  };
  blocked(ownerId: string) {
    return !!this.rows.get(ownerId)?.pending || this.state.ownerId !== ownerId || this.state.status === 'reconciling';
  }
  capacityReached() {
    const id = this.state.ownerId;
    return !!id && !this.rows.has(id) && this.rows.size >= 4;
  }
  canStart() {
    const auth = this.session.getSnapshot(),
      data = this.state.data;
    return (
      auth.mode === 'account' &&
      auth.session === 'verified' &&
      auth.availability === 'available' &&
      !!data &&
      !this.blocked(data.id) &&
      !data.activeAttempt &&
      !data.legacyInterrupted &&
      !data.campaignNeedsReset &&
      (this.rows.has(data.id) || this.rows.size < 4)
    );
  }
  retain(entryId: string) {
    this.leases.set(entryId, (this.leases.get(entryId) ?? 0) + 1);
  }
  release(entryId: string) {
    const lease = this.leases.get(entryId),
      generation = this.state.generation;
    queueMicrotask(() => {
      if (this.leases.get(entryId) !== lease || this.state.generation !== generation) return;
      this.leases.delete(entryId);
      this.starts.delete(generation + ':' + entryId);
      if (this.state.liveEntryId === entryId)
        this.publish({ ...this.state, binding: null, liveEntryId: null, powers: { ...(this.state.data?.powers ?? { bomb: 0, laser: 0, extraShuffle: 0 }) } });
    });
  }
  private pending(command: PendingOperation['command'], body: CommandBody): PendingOperation {
    const data = this.state.data;
    if (!data || this.blocked(data.id)) throw new RequestError('conflict');
    const p: PendingOperation = { ownerId: data.id, command, runId: data.runId, createdAt: Date.now(), body };
    // Freeze the immutable retry payload before journaling/sending it.
    if ('usage' in body) {
      body.usage.forEach(Object.freeze);
      Object.freeze(body.usage);
    }
    Object.freeze(body);
    Object.freeze(p);
    this.row(data.id).pending = p;
    this.save();
    this.publish({ ...this.state, pending: p, status: 'saving', lastCommand: command, safeToRetry: false, error: undefined });
    return p;
  }
  private adopt(p: PendingOperation, value: unknown, generation: number) {
    if (
      !record(value) ||
      !record(value.receipt) ||
      value.receipt.operationId !== p.body.operationId ||
      value.receipt.status !== 'committed' ||
      value.receipt.command !== p.command ||
      (p.command === 'NEW_RUN' ? value.receipt.attemptId !== null : !validUUID(value.receipt.attemptId))
    )
      throw new RequestError('protocol');
    if ('attemptId' in p.body && value.receipt.attemptId !== p.body.attemptId) throw new RequestError('protocol');
    const data = readCurrentUser(value.snapshot);
    if (data.id !== p.ownerId || !integer(value.receipt.resultingRevision) || data.revision < Number(value.receipt.resultingRevision))
      throw new RequestError('protocol');
    const row = this.rows.get(p.ownerId);
    if (row?.pending?.body.operationId === p.body.operationId) {
      row.pending = null;
      if (p.command === 'TERMINAL' || p.command === 'LEGACY_ABANDON' || p.command === 'NEW_RUN') {
        row.usageAttemptId = null;
        row.usage = [];
      }
      if (!row.pending && !row.usageAttemptId) this.rows.delete(p.ownerId);
      this.save();
    }
    if (!this.current(p.ownerId, generation)) return;
    this.session.adoptGameplay(generation, data);
    const canonical = this.session.getSnapshot().selected ?? data;
    const entry = this.startEntries.get(p.body.operationId);
    if (
      p.command === 'START' &&
      entry?.generation === generation &&
      this.leases.has(entry.entryId) &&
      canonical.activeAttempt?.startOperationId === p.body.operationId
    ) {
      const binding = canonical.activeAttempt,
        row = this.row(data.id);
      row.usageAttemptId = binding.attemptId;
      row.usage = [];
      this.save();
      this.publish({ ...this.state, binding, liveEntryId: entry.entryId });
    }
    this.startEntries.delete(p.body.operationId);
    this.publish({
      ...this.state,
      data: canonical,
      pending: null,
      status: 'saved',
      lastCommand: p.command,
      safeToRetry: false,
      error: undefined,
      powers: this.projection(canonical, this.state.binding),
    });
  }
  private send(p: PendingOperation, generation: number): Promise<void> {
    const running = this.flights.get(p.body.operationId);
    if (running) return running;
    const work = (async () => {
      try {
        const value = await this.session.ownerRequest(p.ownerId, paths[p.command], { method: 'POST', body: JSON.stringify(p.body), retryRead: false });
        this.adopt(p, value, generation);
      } catch (e) {
        const kind = e instanceof RequestError ? e.kind : 'protocol';
        const rejected = persistenceFailure(e) === 'not-accepted';
        if (rejected) {
          const row = this.rows.get(p.ownerId);
          if (row?.pending?.body.operationId === p.body.operationId) {
            row.pending = null;
            if (!row.usageAttemptId) this.rows.delete(p.ownerId);
            this.save();
          }
        }
        if (this.state.ownerId === p.ownerId && this.state.generation === generation) {
          this.publish({ ...this.state, status: rejected ? 'not-accepted' : 'unconfirmed', pending: rejected ? null : p, safeToRetry: false, error: kind });
        }
        if (rejected && this.current(p.ownerId, generation)) void this.session.refreshProfile();
      } finally {
        this.flights.delete(p.body.operationId);
      }
    })();
    this.flights.set(p.body.operationId, work);
    return work;
  }
  start(stageNumber: number, entryId: string): Promise<void> {
    const data = this.state.data,
      generation = this.state.generation,
      key = generation + ':' + entryId;
    const previous = this.starts.get(key);
    if (previous) return previous;
    if (!data || !this.canStart()) return Promise.reject(new RequestError('conflict'));
    try {
      const p = this.pending('START', { operationId: this.uuid(), expectedRevision: data.revision, stageNumber });
      this.startEntries.set(p.body.operationId, { entryId, generation });
      const promise = this.send(p, generation);
      this.starts.set(key, promise);
      return promise;
    } catch (e) {
      return Promise.reject(e);
    }
  }
  consume(attemptId: string, key: string, id: number) {
    const binding = this.state.binding,
      data = this.state.data,
      canonical = accountPower(key);
    if (
      !data ||
      !binding ||
      binding.attemptId !== attemptId ||
      !this.state.liveEntryId ||
      this.terminalAttempts.has(attemptId) ||
      !canonical ||
      !Number.isSafeInteger(id) ||
      id <= 0
    )
      return;
    const row = this.row(data.id);
    if (row.usageAttemptId !== attemptId || row.usage.some((e) => e.id === id) || row.usage.length >= 1024) return;
    if (!binding.scenarioVersion.endsWith(':laserrow-match4-training') && this.state.powers[canonical] <= 0) return;
    row.usage.push({ id, power: canonical });
    this.save();
    this.publish({ ...this.state, powers: this.projection(data, binding) });
  }
  finish(attemptId: string, outcome: 'WIN' | 'LOSS' | 'ABANDON', present: () => void = () => {}): Promise<void> {
    const data = this.state.data,
      binding = this.state.binding ?? data?.activeAttempt;
    if (!data || !binding || binding.attemptId !== attemptId || (this.terminalAttempts.has(attemptId) && outcome !== 'ABANDON')) return Promise.resolve();
    if (this.rows.get(data.id)?.pending) return Promise.resolve();
    this.terminalAttempts.add(attemptId);
    const row = this.row(data.id),
      observations = row.usageAttemptId === attemptId ? row.usage.map((e) => ({ ...e })) : [];
    const p = this.pending('TERMINAL', { operationId: this.uuid(), expectedRevision: data.revision, attemptId, outcome, usage: observations });
    present();
    return this.send(p, this.state.generation);
  }
  abandon = () => {
    const data = this.state.data;
    if (!data || this.capacityReached()) return Promise.resolve();
    if (data.activeAttempt) return this.finish(data.activeAttempt.attemptId, 'ABANDON');
    if (data.legacyInterrupted) {
      const p = this.pending('LEGACY_ABANDON', { operationId: this.uuid(), expectedRevision: data.revision });
      return this.send(p, this.state.generation);
    }
    return Promise.resolve();
  };
  newRun = () => {
    const auth = this.session.getSnapshot(),
      data = this.state.data;
    if (
      !data ||
      auth.session !== 'verified' ||
      auth.availability !== 'available' ||
      data.activeAttempt ||
      data.legacyInterrupted ||
      this.blocked(data.id) ||
      this.capacityReached()
    )
      return Promise.resolve();
    const p = this.pending('NEW_RUN', { operationId: this.uuid(), expectedRevision: data.revision });
    return this.send(p, this.state.generation);
  };
  claimReward = (attemptId: string, power: keyof CanonicalPowers) => {
    const data = this.state.data;
    if (!data || data.activeAttempt || !data.pendingRewards.some((r) => r.attemptId === attemptId) || this.blocked(data.id) || this.capacityReached())
      return Promise.resolve();
    const p = this.pending('REWARD', { operationId: this.uuid(), expectedRevision: data.revision, attemptId, power });
    return this.send(p, this.state.generation);
  };
  reconcile = (retry = false): Promise<void> => {
    const auth = this.session.getSnapshot(),
      id = auth.selected?.id,
      generation = auth.generation;
    if (auth.mode !== 'account' || auth.session !== 'verified' || !id) return Promise.resolve();
    const p = this.rows.get(id)?.pending;
    if (!p) return Promise.resolve();
    const key = generation + ':' + p.body.operationId;
    if (this.recovery?.key === key) return this.recovery.promise;
    this.publish({ ...this.state, status: 'reconciling', pending: p });
    const promise = (async () => {
      try {
        const value = await this.session.ownerRequest<unknown>(id, '/api/game/operations/' + p.body.operationId);
        if (!this.current(id, generation)) return;
        if (!record(value)) throw new RequestError('protocol');
        if (value.status === 'committed') {
          this.adopt(p, value, generation);
          return;
        }
        if (value.status !== 'not-found' || value.safeToRetry !== true) throw new RequestError('protocol');
        const data = readCurrentUser(value.snapshot);
        if (data.id !== id) throw new RequestError('protocol');
        this.session.adoptGameplay(generation, data);
        this.publish({ ...this.state, status: retry ? 'saving' : 'unconfirmed', safeToRetry: true, pending: p });
        if (retry) await this.send(p, generation);
      } catch (e) {
        if (this.current(id, generation)) {
          const rejected = e instanceof RequestError && ['forbidden', 'validation', 'conflict'].includes(e.kind);
          if (rejected) {
            const row = this.rows.get(id);
            if (row?.pending?.body.operationId === p.body.operationId) {
              row.pending = null;
              this.save();
            }
          }
          this.publish({
            ...this.state,
            status: rejected ? 'not-accepted' : 'unconfirmed',
            pending: rejected ? null : p,
            safeToRetry: false,
            error: e instanceof RequestError ? e.kind : 'protocol',
          });
        }
      }
    })();
    this.recovery = { key, promise };
    void promise.finally(() => {
      if (this.recovery?.promise === promise) this.recovery = null;
    });
    return promise;
  };
}
