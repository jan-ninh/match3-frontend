import type { EngineState, PieceType } from '../../../types';
import type { CascadeEffect, PreClearArgs, StageResult } from '../typesEffects';

import { applyStoneTileDamageAtIndices } from '../../../board/obstacles/stoneTile';

type Axis = 'h' | 'v';

type Run = {
  axis: Axis;
  yOrX: number; // row for h, col for v
  start: number; // start x (h) or start y (v)
  end: number; // end x (h) or end y (v)
  t: PieceType;
};

function pieceTypeAt(state: EngineState, idx: number): PieceType | null {
  const c = state.cells[idx];
  if (!c || c.blocked || c.pieceId === null) return null;
  const p = state.pieces[c.pieceId];
  return p ? p.type : null;
}

function matchDamageForLen(len: number): number {
  const l = len | 0;
  if (l >= 5) return 7;
  if (l === 4) return 3;
  if (l === 3) return 1;
  return 0;
}

/**
 * Reconstructs match runs from `match.clearIndices` + current board types.
 * (Does NOT depend on `match.runs` existing.)
 */
function computeRuns(state: EngineState, clearIndices: readonly number[]): Run[] {
  const w = state.width | 0;
  const h = state.height | 0;
  if (w <= 0 || h <= 0) return [];

  const clearSet = new Set<number>(clearIndices.map((x) => x | 0));
  const out: Run[] = [];

  const seenH = new Set<string>();
  const seenV = new Set<string>();

  for (const raw of clearIndices) {
    const idx = raw | 0;
    if (!clearSet.has(idx)) continue;

    const t = pieceTypeAt(state, idx);
    if (t == null) continue;

    const x0 = idx % w;
    const y0 = Math.floor(idx / w);

    // Horizontal expand
    {
      let xL = x0;
      while (xL - 1 >= 0) {
        const i = y0 * w + (xL - 1);
        if (!clearSet.has(i)) break;
        if (pieceTypeAt(state, i) !== t) break;
        xL -= 1;
      }

      let xR = x0;
      while (xR + 1 < w) {
        const i = y0 * w + (xR + 1);
        if (!clearSet.has(i)) break;
        if (pieceTypeAt(state, i) !== t) break;
        xR += 1;
      }

      const len = (xR - xL + 1) | 0;
      if (len >= 3) {
        const key = `h:${y0}:${xL}-${xR}:${t}`;
        if (!seenH.has(key)) {
          seenH.add(key);
          out.push({ axis: 'h', yOrX: y0, start: xL, end: xR, t });
        }
      }
    }

    // Vertical expand
    {
      let yT = y0;
      while (yT - 1 >= 0) {
        const i = (yT - 1) * w + x0;
        if (!clearSet.has(i)) break;
        if (pieceTypeAt(state, i) !== t) break;
        yT -= 1;
      }

      let yB = y0;
      while (yB + 1 < h) {
        const i = (yB + 1) * w + x0;
        if (!clearSet.has(i)) break;
        if (pieceTypeAt(state, i) !== t) break;
        yB += 1;
      }

      const len = (yB - yT + 1) | 0;
      if (len >= 3) {
        const key = `v:${x0}:${yT}-${yB}:${t}`;
        if (!seenV.has(key)) {
          seenV.add(key);
          out.push({ axis: 'v', yOrX: x0, start: yT, end: yB, t });
        }
      }
    }
  }

  return out;
}

function orthogonalNeighbors(state: EngineState, idx: number): number[] {
  const w = state.width | 0;
  const h = state.height | 0;
  const x = idx % w;
  const y = Math.floor(idx / w);

  const out: number[] = [];

  // left
  if (x - 1 >= 0) out.push(idx - 1);
  // right
  if (x + 1 < w) out.push(idx + 1);
  // up
  if (y - 1 >= 0) out.push(idx - w);
  // down
  if (y + 1 < h) out.push(idx + w);

  return out;
}

function applyRunDamageToAdjacentStones(state: EngineState, run: Run): EngineState {
  const w = state.width | 0;
  const dmg = matchDamageForLen((run.end - run.start + 1) | 0);
  if (dmg <= 0) return state;

  const targets = new Set<number>();

  if (run.axis === 'h') {
    const y = run.yOrX | 0;
    for (let x = run.start | 0; x <= (run.end | 0); x += 1) {
      const idx = y * w + x;
      for (const n of orthogonalNeighbors(state, idx)) targets.add(n | 0);
    }
  } else {
    const x = run.yOrX | 0;
    for (let y = run.start | 0; y <= (run.end | 0); y += 1) {
      const idx = y * w + x;
      for (const n of orthogonalNeighbors(state, idx)) targets.add(n | 0);
    }
  }

  if (targets.size === 0) return state;
  return applyStoneTileDamageAtIndices(state, targets.values(), dmg);
}

export const stoneTileDamageEffect: CascadeEffect = {
  id: 'level08/stoneTileDamage',
  preClear: (args: PreClearArgs): StageResult => {
    if ((args.state.stoneTilesTotal | 0) <= 0) return { state: args.state, ctx: args.ctx };

    const clear = args.match.clearIndices;
    if (!clear || clear.length === 0) return { state: args.state, ctx: args.ctx };

    const runs = computeRuns(args.state, clear);
    if (runs.length === 0) return { state: args.state, ctx: args.ctx };

    let s = args.state;
    for (const r of runs) {
      s = applyRunDamageToAdjacentStones(s, r);
    }

    return { state: s, ctx: args.ctx };
  },
};
