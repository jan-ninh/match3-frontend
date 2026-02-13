// src/gamelogic/cascade/stabilizeBoard.ts
import type { EngineEvent, EngineState } from '../types';
import type { EnginePhase } from '../phases';
import { detectMatches, hasAnyMoves } from '../match';
import { setPhase } from '../phaseState';
import { assertPhaseInvariants } from '../invariants';

import type { StabilizeOpts } from './types';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';
import { shuffleUntilValid } from './shuffleUntilValid';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

export function stabilizeBoard(state: EngineState, opts?: StabilizeOpts): { state: EngineState; events: EngineEvent[] } {
  const maxResolveLoops = opts?.maxResolveLoops ?? 64;
  const maxShuffleAttempts = opts?.maxShuffleAttempts ?? 200;
  const maxDeadlockPasses = opts?.maxDeadlockPasses ?? 4;

  let s: EngineState = state;
  const events: EngineEvent[] = [];

  const effects = getCascadeEffectsForState(s);

  // “once per move” charged-set (reset on shuffle)
  let chargedIds = new Set<number>();
  let ctx = { chargedIds };

  const dev = import.meta.env.DEV;
  const devAssert = (tag: string) => {
    if (dev) assertPhaseInvariants(s, tag);
  };

  const toPhase = (phase: EnginePhase) => {
    s = setPhase(s, phase, events);
    devAssert(`stabilize:${phase}`);
  };

  // ensure inputLock (avoid duplicate phase event if already in inputLock)
  if (s.phase !== 'inputLock') {
    toPhase('inputLock');
  } else {
    s = setPhase(s, 'inputLock');
    devAssert('stabilize:inputLock');
  }

  const resolveLoop = (label: string) => {
    for (let loop = 0; loop < maxResolveLoops; loop++) {
      toPhase('detect');
      const m = detectMatches(s);
      if (m.clearIndices.length === 0) break;

      events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

      const pre = runPreClearEffects(effects, s, m, ctx, events);
      s = pre.state;
      ctx = pre.ctx;

      toPhase('mark');
      // (future) spawnPlan/specials go here

      toPhase('clear');
      s = clearCellsAndPieces(s, m.clearIndices);
      devAssert(`${label}:clearCellsAndPieces`);
      events.push({ type: 'cleared', count: m.clearIndices.length });

      const postClear = runPostClearEffects(effects, s, ctx, events);
      s = postClear.state;
      ctx = postClear.ctx;

      toPhase('gravity');
      s = applyGravity(s);
      devAssert(`${label}:applyGravity`);
      events.push({ type: 'gravity' });

      const postGravity = runPostGravityEffects(effects, s, ctx, events);
      s = postGravity.state;
      ctx = postGravity.ctx;

      toPhase('refill');
      const ref = applyRefill(s);
      s = ref.state;
      devAssert(`${label}:applyRefill`);
      events.push({ type: 'refilled', count: ref.spawned });

      const postRefill = runPostRefillEffects(effects, s, ctx, events);
      s = postRefill.state;
      ctx = postRefill.ctx;

      toPhase('settle');
      // (instant settle for now)
    }
  };

  resolveLoop('stabilize');

  // deadlock -> shuffle -> post-resolve -> recheck (bounded passes)
  for (let pass = 0; pass < maxDeadlockPasses; pass++) {
    toPhase('deadlockCheck');
    const hasMove = hasAnyMoves(s);
    events.push({ type: 'deadlockCheck', hasMove });

    if (hasMove) break;

    const attemptsCap = pass === maxDeadlockPasses - 1 ? maxShuffleAttempts * 5 : maxShuffleAttempts;

    toPhase('shuffle');
    const sh = shuffleUntilValid(s, attemptsCap);
    s = sh.state;
    devAssert('stabilize:shuffleUntilValid');
    events.push({ type: 'shuffled', attempts: sh.attempts });

    // reset “once per move”
    chargedIds = new Set<number>();
    ctx = { chargedIds };

    // post-shuffle safety resolve
    resolveLoop('stabilize:postShuffle');
  }

  toPhase('idle');
  return { state: s, events };
}
