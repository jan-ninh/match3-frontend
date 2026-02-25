import type { LevelDefinition, Piece, PieceId } from '../../types';
import { initRngState } from '../../rng';
import type { BuildBoardResult } from './typesBuild';
import { initCellsFromLevel } from './initCellsFromLevel';
import { pickSpawnType } from './spawnPicker';
import { resolveRandomFirewalls } from './resolveRandomFirewalls';

export function buildInitialBoard(level: LevelDefinition, seed: number): BuildBoardResult {
  const resolvedLevel = resolveRandomFirewalls(level, seed);
  const { width, height, allowedTypes } = resolvedLevel;

  let rngState = initRngState(seed);

  const cells = initCellsFromLevel(resolvedLevel);

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
