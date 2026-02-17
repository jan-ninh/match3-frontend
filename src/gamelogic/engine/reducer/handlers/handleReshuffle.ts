// src/gamelogic/engine/reducer/handlers/handleReshuffle.ts
import type { EngineEvent, EngineState } from '../../../types';
import type { ReshuffleAction } from '../actions';

import { assertBoardIntegrity, assertPhaseInvariants } from '../../../invariants';
import { setPhase } from '../../../phaseState';
import { hasAnyMoves } from '../../../match';
import { shuffleUntilValid, stabilizeBoard } from '../../../cascade';

import { beginAnim } from '../../anim';
import { isStableIdle, pushEvents } from '../../events';

type PieceValue = EngineState['pieces'][keyof EngineState['pieces']];
type PiecesRecord = Record<number, PieceValue>;

/**
 * Defensive normalization: drop orphan pieces (pieces not referenced by any cell)
 * and re-align piece.cellIndex to the actual cell index.
 *
 * Why here:
 * - Reshuffle is a "free action" that can be triggered after any prior effects.
 * - Orphan pieces break rendering and DEV integrity asserts.
 * - A piece removed from `cells` should not remain in `pieces`.
 */
function normalizePiecesForCells(state: EngineState): EngineState {
  const idxByPid = new Map<number, number>();

  for (let i = 0; i < state.cells.length; i++) {
    const pid = state.cells[i]!.pieceId;
    if (pid == null) continue;

    // If duplicates exist (same pid referenced by multiple cells), keep the first.
    if (!idxByPid.has(pid)) idxByPid.set(pid, i);
  }

  const pieces = state.pieces as unknown as PiecesRecord;

  let changed = false;
  const nextPieces: PiecesRecord = {};

  for (const key of Object.keys(pieces)) {
    const pid = Number(key);
    const idx = idxByPid.get(pid);

    // Orphan => drop
    if (idx == null) {
      changed = true;
      continue;
    }

    const p = pieces[pid];
    if (!p) continue;

    const curIdx = (p as unknown as { cellIndex: number }).cellIndex;

    if (curIdx !== idx) {
      changed = true;
      nextPieces[pid] = { ...(p as unknown as Record<string, unknown>), cellIndex: idx } as unknown as PieceValue;
    } else {
      nextPieces[pid] = p;
    }
  }

  if (!changed) return state;

  return { ...state, pieces: nextPieces as unknown as EngineState['pieces'] };
}

export function handleReshuffle(state: EngineState, action: ReshuffleAction): EngineState {
  // Free action: only from stable idle (prevents overlapping commits / separators)
  if (!isStableIdle(state)) return state;

  const events: EngineEvent[] = [];

  // Defensive: normalize first (prevents reshuffle crashing due to prior orphan pieces)
  let s: EngineState = normalizePiecesForCells(state);

  // Clear selection for cleanliness
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input + shuffle
  s = setPhase(s, 'inputLock', events);
  s = setPhase(s, 'shuffle', events);

  const sh = shuffleUntilValid(s, 200);
  s = sh.state;
  s = normalizePiecesForCells(s);
  events.push({ type: 'shuffled', attempts: sh.attempts });

  // Guarantee playable: if still deadlocked, stabilize as last resort
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (!hasMove) {
    const stabilized = stabilizeBoard(s, { maxShuffleAttempts: 400 });
    s = stabilized.state;
    s = normalizePiecesForCells(s);
    events.push(...stabilized.events);

    const hasMove2 = hasAnyMoves(s);
    events.push({ type: 'deadlockCheck', hasMove: hasMove2 });
  }

  // Ack for UI consume (only after accept)
  events.push({ type: 'powerUsed', key: 'extraShuffle', requestId: action.requestId });

  // Enter fall animation phase (engine-owned) to give the player a visual beat
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  const final = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(final, 'reshuffle');
    assertPhaseInvariants(final, 'reshuffle');
  }

  return final;
}
