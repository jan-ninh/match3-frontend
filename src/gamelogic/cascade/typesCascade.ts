import type { EngineEvent, EngineState } from '../types';

export type CascadePreStep =
  | {
      kind: 'itemLaserRowClear';
      row: number;
      indices: number[];
    };

export type CascadeContext = {
  // “once per move” guard (used by terminal effects)
  chargedIds: Set<number>;

  // Level 05: indices collected during preClear to be charged after clear
  signalChargedIds?: Set<number>;
};

export type ResolveOnceResult = {
  state: EngineState;
  events: EngineEvent[];
  didResolve: boolean;
  chargedIds: Set<number>;
};

export type StabilizeOpts = {
  maxResolveLoops?: number;
  maxShuffleAttempts?: number;
  maxDeadlockPasses?: number;

  // First-class step injection (e.g. item clears) processed BEFORE detect.
  preSteps?: CascadePreStep[];
};

export type ResolveOnceOpts = {
  // First-class step injection (e.g. item clears) processed BEFORE detect.
  preSteps?: CascadePreStep[];
};
