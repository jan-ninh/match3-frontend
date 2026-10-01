import type { CascadeEffect } from '../typesEffects';

import { LEVEL07_TUNING } from '../../../levels/level-07';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function matchRushUnitsForRunLen(len: number): number {
  const l = clampInt(len, 0, 99);
  if (l >= 5) return LEVEL07_TUNING.matchUnits.match5;
  if (l === 4) return LEVEL07_TUNING.matchUnits.match4;
  if (l === 3) return LEVEL07_TUNING.matchUnits.match3;
  return 0;
}

export const matchRushProgressEffect: CascadeEffect = {
  id: 'level07.matchRushProgress',
  preClear: ({ state, match, ctx }) => {
    if ((state.matchRushTargetUnits | 0) <= 0) return { state, ctx };
    if (state.phase === 'init') return { state, ctx };

    const runs = match.runs;
    if (!runs || runs.length === 0) return { state, ctx };

    let baseUnits = 0;
    for (const r of runs) {
      baseUnits += matchRushUnitsForRunLen(r.len);
    }
    if (baseUnits <= 0) return { state, ctx };

    const gained = baseUnits * LEVEL07_TUNING.globalMultiplier;
    if (gained <= 0) return { state, ctx };

    return {
      state: {
        ...state,
        matchRushUnits: (state.matchRushUnits | 0) + gained,
      },
      ctx,
    };
  },
};
