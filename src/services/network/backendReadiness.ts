import { RequestError } from '../../api/transport.ts';
import type { Transport } from '../account/modeStore.ts';

export type Readiness = 'idle' | 'starting' | 'ready' | 'unavailable';
// A single wake-up request, never a keep-alive loop. Ordinary requests retain their own budgets.
export class BackendReadiness {
  private status: Readiness = 'idle';
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private transport: Transport;
  private deadlineMs: number;
  constructor(transport: Transport, deadlineMs = 90000) {
    this.transport = transport;
    this.deadlineMs = deadlineMs;
  }
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(status: Readiness) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
  start = () => {
    if (this.status !== 'idle') return;
    const controller = new AbortController();
    this.controller = controller;
    this.publish('starting');
    void this.transport<{ ready: boolean }>('/ready', { signal: controller.signal, credentials: 'omit', deadlineMs: this.deadlineMs, retryRead: false }).then(
      (value) => {
        if (this.controller === controller) this.publish(value?.ready === true ? 'ready' : 'unavailable');
      },
      () => {
        if (this.controller === controller) this.publish('unavailable');
      },
    );
  };
  retry = () => {
    this.controller?.abort();
    this.controller = undefined;
    this.publish('idle');
    this.start();
  };
  waitForReady = (signal?: AbortSignal): Promise<void> => {
    this.start();
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      const finish = (error?: RequestError) => {
        unsubscribe();
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => finish(new RequestError('cancelled'));
      const check = () => {
        if (signal?.aborted) cancel();
        else if (this.status === 'ready') finish();
        else if (this.status === 'unavailable') finish(new RequestError('unavailable'));
      };
      unsubscribe = this.subscribe(check);
      signal?.addEventListener('abort', cancel, { once: true });
      check();
    });
  };
}
