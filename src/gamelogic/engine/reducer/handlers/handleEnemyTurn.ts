import type { EngineState } from '../../../types';
import type { EnemyTurnAction } from '../actions';

import { findPossibleMatchSwaps } from '../../../match';
import { rngNextInt } from '../../../rng';
import { isStableIdle } from '../../events';
import { beginSwapAnimating } from '../../swapFlow';

/**
 * Enemy turn: perform one random match-creating swap.
 *
 * Policy:
 * - Only when truly stable idle (SSOT: engine/events.ts:isStableIdle)
 * - Uses engine rngState (deterministic within a run)
 * - Uses the same swap animation + resolve pipeline as a player swap (swapFlow)
 * - Marks the subsequent resolve chain as "enemyMarkActive" so clear slots can be painted red.
 */
export function handleEnemyTurn(state: EngineState, _action: EnemyTurnAction): EngineState {
  if (!isStableIdle(state)) return state;

  const swaps = findPossibleMatchSwaps(state);
  if (swaps.length === 0) return state;

  const r = rngNextInt(state.rngState, swaps.length);
  const pick = swaps[r.value]!;
  const from = pick.from | 0;
  const to = pick.to | 0;

  const armed: EngineState = {
    ...state,
    rngState: r.state,
    enemyMarkActive: true,
  };

  return beginSwapAnimating(armed, from, to, { forceSelectionCleared: true });
}
