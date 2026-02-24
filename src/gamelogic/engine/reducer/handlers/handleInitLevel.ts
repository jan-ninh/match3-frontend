// src/gamelogic/engine/reducer/handlers/handleInitLevel.ts
import type { EngineEvent, EngineState } from '../../../types';

import { getLevelDefinition } from '../../../levels';
import { randomSeed32 } from '../../../rng';
import { nextAnimToken } from '../../anim';
import { mkHardBoundary } from '../../events';
import { createState } from '../../state';
import { setPhase } from '../../../phaseState';

import { beginAnim } from '../../anim';
import { pushEvents } from '../../events';
import { buildSpawnFallPlan } from '../../fallPlan';
import { computeFallAnimWaitMs } from '../../fallingTuning';
import type { InitLevelAction } from '../actions';

function normalizeSeed(raw: unknown): number | null {
  if (typeof raw !== 'number') return null;
  if (!Number.isFinite(raw)) return null;
  const i = Math.floor(raw) >>> 0;
  return (i === 0 ? 1 : i) >>> 0;
}

function resolveInitSeed(levelBaseSeed: number, action: InitLevelAction): number {
  const override = normalizeSeed(action.seed);
  if (override !== null) return override;

  if (action.seedPolicy === 'fixedBase') {
    const fixed = normalizeSeed(levelBaseSeed);
    return fixed ?? 1;
  }

  // default: random per init
  return randomSeed32();
}

export function handleInitLevel(state: EngineState, action: InitLevelAction): EngineState {
  const level = getLevelDefinition(action.levelId);
  const base = nextAnimToken(state.animToken);

  const hardBoundary = mkHardBoundary('initLevel', state.nowMs, base);

  const seed = resolveInitSeed(level.baseSeed, action);

  // Hard boundary: carry forward monotonic nowMs (never regress to 0)
  const created = createState(action.levelId, seed, [hardBoundary], base, state.swapMs, state.nowMs);

  // Intro: treat all pieces as spawned during a fall animation (UI spawn hack will animate them even before true-fall UI).
  const events: EngineEvent[] = [];
  const fallPlan = buildSpawnFallPlan(created.pieces, created.seed, created.width);

  let s: EngineState = setPhase(created, 'fallAnimating', events);

  const fallWaitMs = computeFallAnimWaitMs(s.swapMs, s.width, fallPlan);
  s = beginAnim(s, 'fall', fallWaitMs, { fallPlan });

  return pushEvents(s, events);
}
