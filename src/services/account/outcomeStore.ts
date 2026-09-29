import { RequestError } from '../../api/transport.ts';
export type PersistenceState = 'saving' | 'saved' | 'unconfirmed' | 'not-accepted';
export type AccountOutcome = {
  ownerId: string;
  id: string;
  stage: number;
  status: PersistenceState;
  result?: unknown;
  rewardFromLevel?: number;
  rewardClaimed?: boolean;
};
export function persistenceFailure(error: unknown): PersistenceState {
  return error instanceof RequestError && ['unauthenticated', 'forbidden', 'conflict', 'validation', 'configuration'].includes(error.kind)
    ? 'not-accepted'
    : 'unconfirmed';
}
export class OutcomeStore {
  private snapshot: AccountOutcome | null = null;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(next: AccountOutcome) {
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }
  blocked(ownerId: string) {
    return this.snapshot?.ownerId === ownerId && ['saving', 'unconfirmed'].includes(this.snapshot.status);
  }
  start(input: {
    ownerId: string;
    id: string;
    stage: number;
    rewardFromLevel?: number;
    write: () => Promise<unknown>;
    present: () => void;
    confirmed?: () => void;
  }) {
    if (this.snapshot?.id === input.id || this.blocked(input.ownerId)) return;
    const outcome: AccountOutcome = { ownerId: input.ownerId, id: input.id, stage: input.stage, rewardFromLevel: input.rewardFromLevel, status: 'saving' };
    this.publish(outcome);
    input.present(); // Engine result is presented before any remote work.
    void input.write().then(
      (result) => {
        if (this.snapshot?.id !== input.id) return;
        this.publish({ ...outcome, status: 'saved', result });
        input.confirmed?.();
      },
      (error) => {
        if (this.snapshot?.id === input.id) this.publish({ ...outcome, status: persistenceFailure(error) });
      },
    );
  }
  claimReward(id: string, write: () => Promise<unknown>) {
    const current = this.snapshot;
    if (!current || current.id !== id || current.status !== 'saved' || current.rewardClaimed) return;
    this.publish({ ...current, status: 'saving', rewardClaimed: true });
    void write().then(
      () => {
        if (this.snapshot?.id === id) this.publish({ ...current, status: 'saved', rewardClaimed: true });
      },
      (error) => {
        if (this.snapshot?.id === id) this.publish({ ...current, status: persistenceFailure(error), rewardClaimed: true });
      },
    );
  }
}
