// src/gamelogic/cascade/refill.ts
import type { EngineState, Piece, PieceId, PieceType } from '../types';
import { makeBoardView } from './boardView';
import { pickRefillType } from './refillPicker';

export function applyRefill(state: EngineState): { state: EngineState; spawned: number } {
  const { width, height, allowedTypes } = state;

  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  let rngState = state.rngState;
  let nextPieceId = state.nextPieceId;
  let spawned = 0;

  const board = makeBoardView(width, height, nextCells, nextPieces);

  for (let idx = 0; idx < nextCells.length; idx++) {
    const c = nextCells[idx]!;

    if (c.blocked) continue;

    // Most obstacles never get random spawns.
    // chargedCell is passable -> allow spawns there.
    if (c.obstacle && c.obstacle.kind !== 'chargedCell') continue;

    if (c.pieceId !== null) continue;

    const pick = pickRefillType(board, idx, allowedTypes as readonly PieceType[], rngState);
    rngState = pick.rngState;

    const id = nextPieceId as PieceId;
    nextPieceId++;

    nextPieces[id] = { id, type: pick.chosen, cellIndex: idx };
    nextCells[idx] = { ...c, pieceId: id };
    spawned++;
  }

  return {
    state: { ...state, cells: nextCells, pieces: nextPieces, nextPieceId, rngState },
    spawned,
  };
}
