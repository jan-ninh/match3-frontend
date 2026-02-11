// src/gamelogic/invariants.ts
import type { EngineState, PieceId } from './types';
import { animKindForPhase, isAnimatingPhase, isInputLocked } from './phases';

export function assertBoardIntegrity(board: Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>, ctx = ''): void {
  const { width, height, cells, pieces } = board;
  const size = width * height;

  if (cells.length !== size) {
    throw new Error(`[integrity] ${ctx} cells.length=${cells.length} expected=${size}`);
  }

  const counts = new Map<number, number>();

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;

    // Blocked cells or cells with obstacles should not have pieces
    if ((c.blocked || c.obstacle) && c.pieceId !== null) {
      throw new Error(`[integrity] ${ctx} blocked/obstacle cell has pieceId at index=${i}`);
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
    if (c.obstacle) throw new Error(`[integrity] ${ctx} piece id=${pid} points to obstacle cellIndex=${p.cellIndex}`);
    if (c.pieceId !== pid) throw new Error(`[integrity] ${ctx} piece id=${pid} not present in its cellIndex=${p.cellIndex}`);
  }
}

export function assertPhaseInvariants(state: Pick<EngineState, 'phase' | 'inputLocked' | 'anim' | 'animToken' | 'pendingSwap'>, ctx = ''): void {
  const tag = ctx ? ` ${ctx}` : '';
  const { phase, inputLocked, anim, animToken, pendingSwap } = state;

  const expectedLocked = isInputLocked(phase);
  if (inputLocked !== expectedLocked) {
    throw new Error(`[phase]${tag} inputLocked drift phase=${phase} inputLocked=${String(inputLocked)} expected=${String(expectedLocked)}`);
  }

  const expectedAnimating = isAnimatingPhase(phase);
  const hasAnim = anim !== null;

  if (expectedAnimating !== hasAnim) {
    throw new Error(`[phase]${tag} anim invariant phase=${phase} anim=${hasAnim ? anim!.kind : 'null'}`);
  }

  if (hasAnim) {
    const expectedKind = animKindForPhase(phase);
    if (!expectedKind) {
      throw new Error(`[phase]${tag} anim exists but phase is not animating phase=${phase} anim=${anim!.kind}`);
    }
    if (anim!.kind !== expectedKind) {
      throw new Error(`[phase]${tag} anim.kind mismatch phase=${phase} anim.kind=${anim!.kind} expected=${expectedKind}`);
    }
    if (animToken !== anim!.token) {
      throw new Error(`[phase]${tag} animToken drift animToken=${animToken} anim.token=${anim!.token}`);
    }
  }

  // pendingSwap is allowed only while swapAnimating
  if (phase === 'swapAnimating') {
    if (pendingSwap === null) {
      throw new Error(`[phase]${tag} pendingSwap missing in swapAnimating`);
    }
  } else {
    if (pendingSwap !== null) {
      throw new Error(`[phase]${tag} pendingSwap must be null outside swapAnimating (phase=${phase})`);
    }
  }

  if (phase === 'idle') {
    if (inputLocked !== false) throw new Error(`[phase]${tag} idle requires inputLocked=false`);
    if (anim !== null) throw new Error(`[phase]${tag} idle requires anim=null`);
    if (pendingSwap !== null) throw new Error(`[phase]${tag} idle requires pendingSwap=null`);
  }

  if (phase === 'swapBackAnimating') {
    if (pendingSwap !== null) throw new Error(`[phase]${tag} swapBackAnimating requires pendingSwap=null`);
  }
}
