import type { PieceId } from '../types';

/**
 * Falling Animation Tuning (SSOT)
 *
 * All knobs for "true falling" live here.
 * - Engine uses this for deterministic fallPlan delays + fall anim duration.
 * - UI uses this for hole delay, spawn height, fall easing, and duration.
 */
export type FallingTuning = Readonly<{
  /** Pause (ms) before any fall move starts (lets holes be visible). */
  holeDelayMs: number;

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
     * Otherwise explicit duration for fall (ms).
     */
    baseDurationMs: number;
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
  holeDelayMs: 220,

  moveDelay: {
    enabled: true,
    stepMs: 10,
    steps: 5, // 0..40ms in 10ms steps (legacy default)
  },

  spawn: {
    extraRowsAbove: 2,
    heightFactor: 1.0,
  },

  fall: {
    baseDurationMs: 400, // 0 => use swapMs
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
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
 * Fall duration policy:
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
