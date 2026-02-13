// src/gamelogic/cascade/refillPicker.ts
import type { PieceType } from '../types';
import type { RngState } from '../rng';
import { rngNextInt } from '../rng';
import { wouldCreateMatchAt } from '../match';
import type { BoardView } from './boardView';

export type PickRefillTypeResult = {
  chosen: PieceType;
  rngState: RngState;
};

export function pickRefillType(
  board: BoardView,
  cellIndex: number,
  allowedTypes: readonly PieceType[],
  rngState: RngState,
  opts?: { maxAttempts?: number },
): PickRefillTypeResult {
  const maxAttempts = opts?.maxAttempts ?? 24;

  // try to avoid immediate spawn-matches
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = rngNextInt(rngState, allowedTypes.length);
    rngState = r.state;
    const cand = allowedTypes[r.value]!;
    if (!wouldCreateMatchAt(board, cellIndex, cand)) {
      return { chosen: cand, rngState };
    }
  }

  // fallback: accept whatever comes next (still deterministic)
  const r = rngNextInt(rngState, allowedTypes.length);
  rngState = r.state;
  return { chosen: allowedTypes[r.value]!, rngState };
}
