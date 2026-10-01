import type { EngineEvent, EngineState } from './types';
import { isInputLocked, type EnginePhase } from './phases';

function bumpAnimToken(base: number): number {
  return ((base >>> 0) + 1) >>> 0;
}

export function setPhase(state: EngineState, phase: EnginePhase, events?: EngineEvent[]): EngineState {
  events?.push({ type: 'phase', phase });

  const base: EngineState = { ...state, phase, inputLocked: isInputLocked(phase) };

  // Terminal phases must never keep an animation alive.
  // (Example: Level 09 timer can force-lose while a fall anim is active.)
  if (phase === 'win' || phase === 'lose') {
    return {
      ...base,
      anim: null,
      pendingSwap: null,
      pendingTurnCommit: null,
      animToken: bumpAnimToken(base.animToken),
    };
  }

  // Clear transient cascade policy when we return to idle.
  // Also clear transient enemy marking flag (enemy turn ends when we reach idle).
  if (phase === 'idle') {
    const clearedCascade = base.cascadeEffectPolicy !== undefined ? { ...base, cascadeEffectPolicy: undefined } : base;
    if (clearedCascade.enemyMarkActive === true) {
      return { ...clearedCascade, enemyMarkActive: undefined };
    }
    return clearedCascade;
  }

  // Token invalidation on restart-like phases (prevents stale UI Done from ever matching future anims).
  // Shuffle is a hard "new board arrangement" boundary.
  if (phase === 'shuffle') {
    return { ...base, anim: null, animToken: bumpAnimToken(base.animToken) };
  }

  return base;
}
