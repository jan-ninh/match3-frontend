import type { EngineState, PieceId } from './types';

export function assertBoardIntegrity(board: Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>, ctx = ''): void {
  const { width, height, cells, pieces } = board;
  const size = width * height;

  if (cells.length !== size) {
    throw new Error(`[integrity] ${ctx} cells.length=${cells.length} expected=${size}`);
  }

  const counts = new Map<number, number>();

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    if (c.blocked && c.pieceId !== null) {
      throw new Error(`[integrity] ${ctx} blocked cell has pieceId at index=${i}`);
    }

    if (c.pieceId !== null) {
      const pid = c.pieceId;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);

      const p = pieces[pid];
      if (!p) throw new Error(`[integrity] ${ctx} cell references missing piece id=${pid} at index=${i}`);
      if (p.cellIndex !== i) throw new Error(`[integrity] ${ctx} piece id=${pid} cellIndex=${p.cellIndex} mismatch cellIndex=${i}`);
    }
  }

  for (const [pid, n] of counts.entries()) {
    if (n !== 1) throw new Error(`[integrity] ${ctx} piece id=${pid} referenced ${n} times in cells`);
  }

  for (const key of Object.keys(pieces)) {
    const pid = Number(key) as PieceId;
    const p = pieces[pid];
    if (!p) continue;

    if (p.cellIndex < 0 || p.cellIndex >= size) {
      throw new Error(`[integrity] ${ctx} piece id=${pid} has out-of-bounds cellIndex=${p.cellIndex}`);
    }

    const c = cells[p.cellIndex];
    if (!c) throw new Error(`[integrity] ${ctx} piece id=${pid} points to missing cellIndex=${p.cellIndex}`);
    if (c.blocked) throw new Error(`[integrity] ${ctx} piece id=${pid} points to blocked cellIndex=${p.cellIndex}`);
    if (c.pieceId !== pid) throw new Error(`[integrity] ${ctx} piece id=${pid} not present in its cellIndex=${p.cellIndex}`);
  }
}
