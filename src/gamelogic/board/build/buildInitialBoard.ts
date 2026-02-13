// src/gamelogic/board/build/buildInitialBoard.ts
import type { LevelDefinition, Piece, PieceId } from '../../types';
import { initRngState } from '../../rng';
import type { BuildBoardResult } from './types';
import { initCellsFromLevel } from './initCellsFromLevel';
import { pickSpawnType } from './spawnPicker';

export function buildInitialBoard(level: LevelDefinition, seed: number): BuildBoardResult {
  const { width, height, allowedTypes } = level;

  let rngState = initRngState(seed);

  const cells = initCellsFromLevel(level);

  const pieces: Record<PieceId, Piece> = {};
  let nextPieceId = 0;

  const size = width * height;

  for (let index = 0; index < size; index++) {
    if (cells[index].blocked) continue;
    if (cells[index].obstacle) continue;

    const picked = pickSpawnType(rngState, allowedTypes, index, width, cells, pieces);
    rngState = picked.rngState;

    const id = nextPieceId as PieceId;
    nextPieceId++;

    pieces[id] = { id, type: picked.chosen, cellIndex: index };
    cells[index].pieceId = id;
  }

  return { cells, pieces, nextPieceId, rngState };
}
