// src/gamelogic/board/obstacles/counters.ts
import type { Cell } from '../../types';

export function countContamination(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'contamination') count++;
  }
  return count;
}

export function countSealKits(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'sealKit') count++;
  }
  return count;
}
