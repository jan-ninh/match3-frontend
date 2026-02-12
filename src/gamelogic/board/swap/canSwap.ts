// src/gamelogic/board/swap/canSwap.ts
import type { Cell, SwapRejectReason } from '../../types';
import { areAdjacent } from '../../coords';

export function canSwap(from: number, to: number, width: number, cells: Cell[]): { ok: true } | { ok: false; reason: SwapRejectReason } {
  if (!areAdjacent(from, to, width)) return { ok: false, reason: 'notAdjacent' };

  const a = cells[from];
  const b = cells[to];
  if (!a || !b) return { ok: false, reason: 'empty' };

  if (a.blocked || b.blocked) return { ok: false, reason: 'blocked' };

  // Obstacle check with terminal exception
  if (a.obstacle) {
    // Terminal cells: can swap FROM if open (keycard leaving)
    if (a.obstacle.kind !== 'terminal' || a.obstacle.state !== 'open') {
      return { ok: false, reason: 'blocked' };
    }
  }

  if (b.obstacle) {
    // Terminal cells: can swap INTO if open (keycard entering)
    if (b.obstacle.kind !== 'terminal' || b.obstacle.state !== 'open') {
      return { ok: false, reason: 'blocked' };
    }
  }

  if (a.pieceId === null || b.pieceId === null) return { ok: false, reason: 'empty' };

  return { ok: true };
}
