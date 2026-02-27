import type { Cell, SwapRejectReason } from '../../types';
import { areAdjacent } from '../../coords';
import { terminalAllowsSwap } from '../terminals/terminals';

function isPassableObstacle(cell: Cell): boolean {
  const obs = cell.obstacle;
  if (!obs) return true;

  // chargedCell is passable (floor overlay)
  if (obs.kind === 'chargedCell') return true;

  if (obs.kind === 'terminal') return terminalAllowsSwap(obs);

  return false;
}

export function canSwap(from: number, to: number, width: number, cells: Cell[]): { ok: true } | { ok: false; reason: SwapRejectReason } {
  if (!areAdjacent(from, to, width)) return { ok: false, reason: 'notAdjacent' };

  const a = cells[from];
  const b = cells[to];
  if (!a || !b) return { ok: false, reason: 'empty' };

  if (a.blocked || b.blocked) return { ok: false, reason: 'blocked' };

  if (!isPassableObstacle(a) || !isPassableObstacle(b)) return { ok: false, reason: 'blocked' };

  if (a.pieceId === null || b.pieceId === null) return { ok: false, reason: 'empty' };

  return { ok: true };
}
