import { GAP, TILE_SIZE } from '../../lib/constants';

import { getBomb3x3IndicesFromTarget } from '@/gamelogic/itemeffects/bomb';
import type { BombTarget } from './typesBomb';

export function computeBombOverlayIndices(target: BombTarget, width: number, height: number): number[] {
  return getBomb3x3IndicesFromTarget(target, width, height);
}

type PickArgs = {
  localX: number;
  localY: number;
  width: number;
  height: number;
};

export function pickBombHoverTargetFromLocal({ localX, localY, width, height }: PickArgs): BombTarget | null {
  const step = TILE_SIZE + GAP;

  // nearest center among a small candidate neighborhood (incl. off-grid -1/+1)
  const baseCol = Math.floor(localX / step);
  const baseRow = Math.floor(localY / step);

  const colCandidates = [baseCol - 1, baseCol, baseCol + 1, baseCol + 2];
  const rowCandidates = [baseRow - 1, baseRow, baseRow + 1, baseRow + 2];

  let bestCol = 0;
  let bestRow = 0;
  let bestD2 = Number.POSITIVE_INFINITY;

  for (const c of colCandidates) {
    if (c < -1 || c > width) continue;
    const cx = c * step + TILE_SIZE * 0.5;

    for (const r of rowCandidates) {
      if (r < -1 || r > height) continue;
      const cy = r * step + TILE_SIZE * 0.5;

      const dx = localX - cx;
      const dy = localY - cy;
      const d2 = dx * dx + dy * dy;

      if (d2 < bestD2) {
        bestD2 = d2;
        bestCol = c;
        bestRow = r;
      }
    }
  }

  // "near enough" gate: prevents selecting a target when you're far away in the HUD
  const radius = Math.max(12, step * 0.8);
  if (bestD2 > radius * radius) return null;

  return { x: bestCol, y: bestRow };
}
