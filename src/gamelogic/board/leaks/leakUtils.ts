// src/gamelogic/board/leaks/leakUtils.ts
import type { Cell } from '../../types';
import { manhattanDist } from '../math/distance';
import { getOrthogonalNeighbors } from '../math/neighbors';

export function getNearestOpenLeakId(fromIndex: number, width: number, cells: Cell[]): number | null {
  let best: { id: number; dist: number } | null = null;

  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (obs?.kind !== 'leak') continue;
    if (obs.progress >= obs.required) continue;

    const dist = manhattanDist(fromIndex, i, width);
    if (!best || dist < best.dist || (dist === best.dist && obs.id < best.id)) {
      best = { id: obs.id, dist };
    }
  }

  return best?.id ?? null;
}

export function getSpreadCandidates(leakIndex: number, width: number, height: number, cells: Cell[]): number[] {
  const neighbors = getOrthogonalNeighbors(leakIndex, width, height);

  return neighbors.filter((i) => {
    const cell = cells[i];
    if (!cell) return false;
    if (cell.blocked) return false;
    if (cell.obstacle) return false;
    return true;
  });
}
