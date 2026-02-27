import type { EngineEvent, EngineState } from '../../../types';
import type { UseItemAtAction } from '../actions';

import { beginAnim } from '../../anim';
import { buildFallPlan } from '../../fallPlan';
import { computeFallAnimWaitMs } from '../../fallingTuning';
import { isStableIdle, mkTurnCommitArmedItem, pushEvents } from '../../events';
import { setPhase } from '../../../phaseState';

import { stabilizeBoard } from '../../../cascade/stabilizeBoard';
import { applyItemEffectAt, getItemEffectPreSteps, getItemEffectPreviewIndices } from '../../../itemeffects';

import { LEVEL07_TUNING } from '../../../levels/level-07';

const LASER_ROW_ENGINE_DELAY_MS = 650;
// NOTE: Must match UI intent feel (see src/features/grid/ui/laser/laserTimings.ts LASER_ENGINE_DELAY_MS).
// Engine is the SSOT for lockout and effect timing.

function powerKeyForItem(key: UseItemAtAction['key']): 'gridlaser' | 'laser' | 'extraShuffle' {
  switch (key) {
    case 'bomb3x3':
      return 'gridlaser';
    case 'laserRow':
      return 'laser';
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function matchRushItemBaseUnits(key: UseItemAtAction['key']): number {
  switch (key) {
    case 'bomb3x3':
      return LEVEL07_TUNING.itemUnits.gridlaser3x3;
    case 'laserRow':
      return LEVEL07_TUNING.itemUnits.laserRow;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function handleUseItemAt(state: EngineState, action: UseItemAtAction): EngineState {
  // Only allow when truly stable idle (idle + no pending commit being consumed).
  if (!isStableIdle(state)) return state;

  const target = action.target;
  const preview = getItemEffectPreviewIndices(action.key, target, state.width, state.height);

  // If nothing would be affected -> ignore (UI should also abort)
  if (preview.length === 0) return state;

  const events: EngineEvent[] = [];

  const itemPolicy = state.itemObjectives[action.key];
  const cascadeEffectPolicy = itemPolicy === 'noObjectives' ? 'noObjectives' : undefined;

  // Level 09: a "move" is a confirmed Row-Laser usage (not swaps).
  const countsAsMove = action.key === 'laserRow' && (state.laserRowMatch4Target | 0) > 0;

  const nextMovesLeft = countsAsMove ? Math.max(0, (state.movesLeft | 0) - 1) : state.movesLeft;

  if (countsAsMove && nextMovesLeft !== state.movesLeft) {
    events.push({ type: 'movesSpent', left: nextMovesLeft });
  }

  // Accept => arm turn commit (engine-owned)
  let s: EngineState = {
    ...state,
    movesLeft: nextMovesLeft,
    pendingTurnCommit: {
      kind: 'item',
      spendMove: countsAsMove,
      key: action.key,
      requestId: action.requestId,
      matchOutcomeEmitted: false,
    },
    cascadeEffectPolicy,
  };

  // Observability: instrument every pendingTurnCommit arming
  events.push(mkTurnCommitArmedItem(action.key, target, action.requestId));

  // Also: explicit acceptance event (UI/debug can listen without inferring from side-effects)
  events.push({ type: 'itemAccepted', key: action.key, target, requestId: action.requestId });

  // Clear selection for cleanliness
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input immediately (engine-owned)
  s = setPhase(s, 'inputLock', events);

  // Row-laser: engine-owned delayed execution (closes UI interaction gap).
  if (action.key === 'laserRow') {
    const baseNow = s.nowMs | 0;
    const delay = Math.max(0, LASER_ROW_ENGINE_DELAY_MS | 0);
    const executeAtMs = baseNow > 0 ? baseNow + delay : delay;

    s = {
      ...s,
      pendingLaserRow: {
        executeAtMs,
        target: { x: target.x | 0, y: target.y | 0 },
        requestId: action.requestId,
      },
    };

    // Level 07: Match Rush progress is engine-owned.
    // Count power usage as units (independent of objective-policy for clears).
    if ((s.matchRushTargetUnits | 0) > 0 && s.phase !== 'init') {
      const baseUnits = matchRushItemBaseUnits(action.key);
      const gained = baseUnits * LEVEL07_TUNING.globalMultiplier;
      if (gained > 0) {
        s = {
          ...s,
          matchRushUnits: (s.matchRushUnits | 0) + gained,
        };
      }
    }

    // Ack for UI consume (only after accept)
    events.push({ type: 'powerUsed', key: powerKeyForItem(action.key), requestId: action.requestId });

    return pushEvents(s, events);
  }

  // Other items: execute immediately (legacy behavior)
  const prePieces = s.pieces;

  const preSteps = getItemEffectPreSteps(s, action.key, target);

  if (preSteps !== undefined) {
    // Supported as preSteps. If it would be a no-op, ignore (UI should also abort).
    if (preSteps.length === 0) return state;

    const st = stabilizeBoard(s, { preSteps, maxResolveLoops: 0, maxDeadlockPasses: 0 });
    s = st.state;
    events.push(...st.events);
  } else {
    // Immediate item effect (clear -> gravity -> refill)
    const fx = applyItemEffectAt(s, action.key, target);
    s = fx.state;
    events.push(...fx.events);
  }

  // Level 07: Match Rush progress is engine-owned.
  // Count power usage as units (independent of objective-policy for clears).
  if ((s.matchRushTargetUnits | 0) > 0 && s.phase !== 'init') {
    const baseUnits = matchRushItemBaseUnits(action.key);
    const gained = baseUnits * LEVEL07_TUNING.globalMultiplier;
    if (gained > 0) {
      s = {
        ...s,
        matchRushUnits: (s.matchRushUnits | 0) + gained,
      };
    }
  }

  // Ack for UI consume (only after accept)
  events.push({ type: 'powerUsed', key: powerKeyForItem(action.key), requestId: action.requestId });

  // Enter fall animation phase (engine-owned)
  s = setPhase(s, 'fallAnimating', events);

  const fallPlan = buildFallPlan({ prePieces, postPieces: s.pieces, seed: s.seed, width: s.width });
  const fallWaitMs = computeFallAnimWaitMs(s.swapMs, s.width, fallPlan);

  s = beginAnim(s, 'fall', fallWaitMs, { fallPlan });

  return pushEvents(s, events);
}
