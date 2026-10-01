import type { FallPlan, PieceId } from '../types';

/**
 * Falling Animation Tuning (SSOT)
 *
 * All knobs for "true falling" live here.
 * - Engine uses this for deterministic fallPlan delays + fall anim duration.
 * - UI uses this for hole delay, spawn height, fall easing, and per-move duration.
 */
export type FallingTuning = Readonly<{
  /** Pause (ms) before any fall move starts (lets holes be visible). */
  holeDelayMs: number;

  /**
   * Row-laser specific pause (ms) before any fall move starts.
   * Applied only when a fallPlan provides holeDelayMs (laserRow sets this).
   */
  laserRowHoleDelayMs: number;

  /** Per-piece deterministic delay (engine-owned). */
  moveDelay: Readonly<{
    enabled: boolean;
    /** Delay step size (ms). */
    stepMs: number;
    /** Number of steps. Total jitter range = (steps-1)*stepMs. */
    steps: number;
  }>;

  /** Spawn start height for moves with fromIndex=null. */
  spawn: Readonly<{
    /** Additional rows above the target slot (default 1 => same as old behavior). */
    extraRowsAbove: number;
    /** Multiplier for extra height (1.0 = unchanged). */
    heightFactor: number;
  }>;

  /** Fall timing and curve. */
  fall: Readonly<{
    /**
     * If <= 0 => follow `swapMs` (keeps legacy feel).
     * Otherwise explicit duration for fall (ms) when speed-mode is disabled.
     */
    baseDurationMs: number;

    /**
     * Constant-speed mode (recommended):
     * - If msPerRow > 0 => per-move duration scales with traveled rows.
     * - Duration is clamped to [minMoveMs, maxMoveMs].
     * - Engine anim.durationMs becomes max(holeDelay + jitter + per-move duration).
     */
    msPerRow: number;
    minMoveMs: number;
    maxMoveMs: number;

    /**
     * CSS easing for fall (e.g. 'linear' or cubic-bezier).
     * Swap easing remains separate (UI constants).
     */
    easing: string;
  }>;
}>;

//============================================================
// TRUE FALLING ANIMATION
//============================================================
export const FALLING_TUNING: FallingTuning = {
  holeDelayMs: 300,
  // Default: keep the same feel unless you explicitly tune it.
  laserRowHoleDelayMs: 480,

  moveDelay: {
    enabled: true,
    stepMs: 10,
    steps: 5, // 0..40ms in 10ms steps (legacy default)
  },

  // SPAWN HÖHE
  spawn: {
    extraRowsAbove: 1,
    heightFactor: 2.0,
  },

  fall: {
    // Fixed-duration fallback (used only when msPerRow <= 0)
    baseDurationMs: 600, // 0 => use swapMs

    // Constant-speed mode (ms per row). Set <=0 to disable.
    msPerRow: 70,
    minMoveMs: 140,
    maxMoveMs: 520,

    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Deterministic per-move delay (engine-owned).
 * Keeps fall asymmetry stable across replays.
 */
export function computeFallMoveDelayMs(seed: number, id: PieceId, toIndex: number, width: number): number {
  const cfg = FALLING_TUNING.moveDelay;
  if (cfg.enabled !== true) return 0;

  const stepMs = clampInt(cfg.stepMs, 0, 10_000);
  const steps = clampInt(cfg.steps, 1, 1000);
  if (stepMs === 0 || steps <= 1) return 0;

  const col = width > 0 ? toIndex % width : 0;

  // Stable hash: seed ^ id ^ col (with mix constants).
  const x = ((seed >>> 0) ^ ((id * 2654435761) >>> 0) ^ ((col * 1597334677) >>> 0)) >>> 0;

  const pick = x % steps; // 0..steps-1
  return pick * stepMs;
}

/**
 * Fall duration policy (fixed-duration mode):
 * - reduced motion (swapMs===0) => 0
 * - baseDurationMs<=0 => follow swapMs (legacy coupling)
 * - else => baseDurationMs
 */
export function computeEffectiveFallDurationMs(swapMs: number, baseDurationMs: number): number {
  const s = clampInt(swapMs, 0, 60_000);
  if (s === 0) return 0;

  const base = clampInt(baseDurationMs, -1, 60_000);
  if (base <= 0) return s;

  return base;
}

function computeMoveDistanceRows(fromIndex: number | null, toIndex: number, width: number): number {
  const w = clampInt(width, 1, 10_000);
  const toY = Math.floor(toIndex / w);

  if (fromIndex === null) {
    const extraRows = clampInt(FALLING_TUNING.spawn.extraRowsAbove, 0, 50);
    const hFactor = clampNum(FALLING_TUNING.spawn.heightFactor, 0, 10);
    return (toY + extraRows) * hFactor;
  }

  const fromY = Math.floor(fromIndex / w);
  const dy = Math.abs(toY - fromY);
  if (dy > 0) return dy;

  const fromX = fromIndex % w;
  const toX = toIndex % w;
  const dx = Math.abs(toX - fromX);
  return dx;
}

/**
 * Per-move duration for a single FallMove.
 * - If fall.msPerRow > 0: duration scales with rows traveled (clamped).
 * - Otherwise: duration is fixed via computeEffectiveFallDurationMs(swapMs, baseDurationMs).
 */
export function computeFallMoveDurationMs(swapMs: number, fromIndex: number | null, toIndex: number, width: number): number {
  const s = clampInt(swapMs, 0, 60_000);
  if (s === 0) return 0;

  const cfg = FALLING_TUNING.fall;

  const msPerRow = clampInt(cfg.msPerRow, 0, 60_000);
  if (msPerRow > 0) {
    const distRows = computeMoveDistanceRows(fromIndex, toIndex, width);
    const raw = distRows * msPerRow;

    const minMs = clampInt(cfg.minMoveMs, 0, 60_000);
    const maxMs = clampInt(cfg.maxMoveMs, 0, 60_000);

    const rounded = Math.round(raw);
    const hi = maxMs > 0 ? maxMs : 60_000;

    return Math.max(minMs, Math.min(hi, rounded));
  }

  return computeEffectiveFallDurationMs(s, cfg.baseDurationMs);
}

/**
 * Total engine wait time for a fall-phase.
 * Must cover: holeDelay + per-move jitter + per-move duration (max across moves).
 *
 * Engine uses this as anim.durationMs so it never advances the resolve chain
 * while the UI is still mid-fall.
 */
export function computeFallAnimWaitMs(swapMs: number, width: number, plan: FallPlan): number {
  const s = clampInt(swapMs, 0, 60_000);
  if (s === 0) return 0;

  const holeDelayMs = clampInt(plan.holeDelayMs ?? FALLING_TUNING.holeDelayMs, 0, 60_000);
  const msPerRow = clampInt(FALLING_TUNING.fall.msPerRow, 0, 60_000);

  let maxMs = 0;

  for (const mv of plan.moves) {
    // Keep jitter within a single row-step to prevent "stack inversion" (top starts before bottom).
    const jitter = clampInt(mv.delayMs, 0, 60_000);
    const jitterSafe = msPerRow > 0 ? jitter % msPerRow : jitter;

    // Additional spawn stacking delay (engine-owned; 0 for non-spawns).
    const stackDelay = clampInt(mv.spawnStackDelayMs ?? 0, 0, 60_000);

    const moveMs = computeFallMoveDurationMs(s, mv.fromIndex, mv.toIndex, width);
    const end = holeDelayMs + stackDelay + jitterSafe + moveMs;
    if (end > maxMs) maxMs = end;
  }

  return maxMs;
}
