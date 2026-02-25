// src/features/grid/ui/matchHints/useAutoMatchHints.ts
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Cell, EnginePhase, Piece, PieceId, PieceType } from '@/gamelogic';
import type { PossibleMatchSwap } from '@/gamelogic/match';

export type HintNudge = Readonly<{
  pieceId: PieceId;
  dx: number;
  dy: number;
  transitionMs: number;
}>;

type Args = {
  enabled: boolean;

  // Gate conditions
  phase: EnginePhase;
  inputLocked: boolean;
  isDragging: boolean;

  // Candidates (read-only)
  swaps: readonly PossibleMatchSwap[];

  // For mapping indices -> pieceIds (for blink + mover detection)
  cells: readonly Cell[];
  pieces: Record<PieceId, Piece>;

  // visual scale
  tileDist: number;
};

type State = Readonly<{
  blinkActive: boolean;
  blinkPieceIds: readonly PieceId[];
  nudge: HintNudge | null;
  onActivity: () => void;
}>;

// After this idle time (no activity) the currently selected hint is played.
const IDLE_MS = 2500;

// Placeholder: if > 0, the hint MAY switch while staying in the same stable-idle segment.
// Default = 0 => no switching (hint remains fixed until the next stable idle begins).
const SWITCH_HINT_SAME_TURN_SEC = 0;

// "blink" timing (we toggle ring/glow for a short window)
const BLINK_MS = 290; //220

// nudge sequence: on -> off -> on -> off
// Keep the 2nd nudge AFTER the 1st return finished.
const NUDGE_MS = 300; // 220
const GAP_MS = 150; // 180

function canSelect(args: Pick<Args, 'enabled' | 'phase' | 'swaps'>): boolean {
  if (!args.enabled) return false;
  if (args.phase !== 'idle') return false;
  if (args.swaps.length <= 0) return false;
  return true;
}

function isEligible(args: Pick<Args, 'enabled' | 'phase' | 'inputLocked' | 'isDragging' | 'swaps'>): boolean {
  if (!args.enabled) return false;
  if (args.phase !== 'idle') return false;
  if (args.inputLocked) return false;
  if (args.isDragging) return false;
  if (args.swaps.length <= 0) return false;
  return true;
}

function pickRandomSwap(swaps: readonly PossibleMatchSwap[], avoidKey: string | null): PossibleMatchSwap | null {
  if (swaps.length <= 0) return null;
  if (swaps.length === 1) return swaps[0];

  // Prefer a different swap than last time (best-effort).
  for (let tries = 0; tries < 6; tries += 1) {
    const s = swaps[(Math.random() * swaps.length) | 0]!;
    const key = `${s.from}->${s.to}`;
    if (avoidKey === null || key !== avoidKey) return s;
  }

  return swaps[(Math.random() * swaps.length) | 0]!;
}

function axisAndDir(from: number, to: number): { dx: -1 | 0 | 1; dy: -1 | 0 | 1 } {
  const delta = to - from;
  if (Math.abs(delta) === 1) {
    const dx = delta > 0 ? 1 : -1;
    return { dx: dx as -1 | 0 | 1, dy: 0 };
  }

  // vertical neighbor (down/up)
  const dy = delta > 0 ? 1 : -1;
  return { dx: 0, dy: dy as -1 | 0 | 1 };
}

function typeAtIndex(args: Pick<Args, 'cells' | 'pieces'>, index: number): PieceType | null {
  const cell = args.cells[index];
  if (!cell || cell.blocked || cell.pieceId === null) return null;
  const p = args.pieces[cell.pieceId];
  return p ? p.type : null;
}

/**
 * Mover (Match Hint) — SSOT:
 * - “Mover” is the missing 3rd tile that completes the created match.
 * - We infer it from swap.runs: the run(s) formed at the destination slot determine the mover type.
 */
function inferMoverOrigin(args: Pick<Args, 'cells' | 'pieces'>, swap: PossibleMatchSwap): number {
  const tFrom = typeAtIndex(args, swap.from);
  const tTo = typeAtIndex(args, swap.to);
  if (tFrom === null || tTo === null) return swap.from;

  const typeAfterSwapAt = (idx: number): PieceType | null => {
    if (idx === swap.from) return tTo;
    if (idx === swap.to) return tFrom;
    return typeAtIndex(args, idx);
  };

  const runType = (run: { indices: readonly number[] }): PieceType | null => {
    const idx0 = run.indices[0];
    if (idx0 == null) return null;
    return typeAfterSwapAt(idx0);
  };

  const scoreFor = (origin: number): number => {
    const originType = origin === swap.from ? tFrom : tTo;
    const dest = origin === swap.from ? swap.to : swap.from;

    let score = 0;
    for (const r of swap.runs) {
      const rt = runType(r);
      if (rt === null) continue;
      if (rt !== originType) continue;
      // “formed at dest”: the created run touches the destination endpoint.
      if (!r.indices.includes(dest)) continue;
      score += r.indices.length;
    }
    return score;
  };

  const scoreFrom = scoreFor(swap.from);
  const scoreTo = scoreFor(swap.to);

  if (scoreTo > scoreFrom) return swap.to;
  return swap.from;
}

function computeBlinkPieceIds(args: Pick<Args, 'cells' | 'pieces'>, swap: PossibleMatchSwap, moverOrigin: number): readonly PieceId[] {
  const cells = args.cells;

  const moverPid = cells[moverOrigin]?.pieceId ?? null;
  if (moverPid == null) return [];

  const otherOrigin = moverOrigin === swap.from ? swap.to : swap.from;
  const otherPid = cells[otherOrigin]?.pieceId ?? null;

  const moverDest = moverOrigin === swap.from ? swap.to : swap.from;
  const otherDest = moverOrigin === swap.from ? swap.from : swap.to;

  const tFrom = typeAtIndex(args, swap.from);
  const tTo = typeAtIndex(args, swap.to);
  const moverType = moverOrigin === swap.from ? tFrom : tTo;

  const typeAfterSwapAt = (idx: number): PieceType | null => {
    if (tFrom === null || tTo === null) return null;
    if (idx === swap.from) return tTo;
    if (idx === swap.to) return tFrom;
    return typeAtIndex(args, idx);
  };

  // Prefer blinking the run(s) created by the chosen mover (not necessarily all clears).
  const blinkIndices: number[] = [];
  if (moverType !== null) {
    for (const r of swap.runs) {
      const idx0 = r.indices[0];
      if (idx0 == null) continue;
      const rt = typeAfterSwapAt(idx0);
      if (rt !== moverType) continue;
      if (!r.indices.includes(moverDest)) continue;
      blinkIndices.push(...r.indices);
    }
  }

  const indicesToBlink = blinkIndices.length > 0 ? blinkIndices : [...swap.clearIndices];

  const seen = new Set<PieceId>();
  const out: PieceId[] = [];

  const push = (pid: PieceId | null) => {
    if (pid == null) return;
    if (seen.has(pid)) return;
    seen.add(pid);
    out.push(pid);
  };

  for (const idx of indicesToBlink) {
    if (idx === moverDest) {
      push(moverPid);
      continue;
    }
    if (idx === otherDest) {
      push(otherPid);
      continue;
    }
    push(cells[idx]?.pieceId ?? null);
  }

  // Always include the mover itself.
  push(moverPid);

  return out;
}

type SelectedHint = Readonly<{
  swap: PossibleMatchSwap;
  key: string;
  moverOrigin: number;
  moverPieceId: PieceId;
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  blinkPieceIds: readonly PieceId[];
}>;

function buildSelectedHint(args: Pick<Args, 'cells' | 'pieces' | 'tileDist'>, swap: PossibleMatchSwap): SelectedHint | null {
  const moverOrigin = inferMoverOrigin({ cells: args.cells, pieces: args.pieces }, swap);
  const moverPieceId = args.cells[moverOrigin]?.pieceId ?? null;
  if (moverPieceId == null) return null;

  const moverDest = moverOrigin === swap.from ? swap.to : swap.from;
  const { dx, dy } = axisAndDir(moverOrigin, moverDest);

  const blinkPieceIds = computeBlinkPieceIds({ cells: args.cells, pieces: args.pieces }, swap, moverOrigin);

  return {
    swap,
    key: `${swap.from}->${swap.to}`,
    moverOrigin,
    moverPieceId,
    dx,
    dy,
    blinkPieceIds,
  };
}

function hasSwapKey(swaps: readonly PossibleMatchSwap[], key: string): boolean {
  for (const s of swaps) {
    if (`${s.from}->${s.to}` === key) return true;
  }
  return false;
}

export function useAutoMatchHints(args: Args): State {
  const { enabled, phase, inputLocked, isDragging, swaps, cells, pieces, tileDist } = args;

  const [blinkActive, setBlinkActive] = useState(false);
  const [blinkPieceIds, setBlinkPieceIds] = useState<readonly PieceId[]>([]);
  const [nudge, setNudge] = useState<HintNudge | null>(null);

  const idleTimerRef = useRef<number | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const playTokenRef = useRef(0);

  // Selected hint for the current stable-idle segment (does NOT change by default).
  const selectedRef = useRef<SelectedHint | null>(null);

  // Best-effort variety across turns: avoid repeating the previous turn’s key.
  const lastTurnKeyRef = useRef<string | null>(null);

  const cfgRef = useRef<Args>(args);
  cfgRef.current = args;

  const startPlaybackRef = useRef<() => void>(() => {});

  const clearIdleTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearSwitchTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (switchTimerRef.current != null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
  }, []);

  const clearPlayTimers = useCallback(() => {
    if (typeof window === 'undefined') return;
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const clearFx = useCallback(() => {
    setBlinkActive(false);
    setBlinkPieceIds([]);
    setNudge(null);
  }, []);

  const cancelTimersAndFx = useCallback(() => {
    clearIdleTimer();
    clearSwitchTimer();
    clearPlayTimers();
    clearFx();
    playTokenRef.current += 1; // invalidate scheduled callbacks
  }, [clearIdleTimer, clearSwitchTimer, clearPlayTimers, clearFx]);

  const ensureSelected = useCallback((avoidKey: string | null) => {
    const cfg = cfgRef.current;

    // If selected is no longer present (candidates drift), re-pick.
    const cur = selectedRef.current;
    if (cur && hasSwapKey(cfg.swaps, cur.key)) return cur;

    selectedRef.current = null;

    if (!canSelect(cfg)) return null;

    const swap = pickRandomSwap(cfg.swaps, avoidKey);
    if (!swap) return null;

    const built = buildSelectedHint({ cells: cfg.cells, pieces: cfg.pieces, tileDist: cfg.tileDist }, swap);
    if (!built) return null;

    selectedRef.current = built;
    return built;
  }, []);

  const scheduleIdle = useCallback(() => {
    if (typeof window === 'undefined') return;

    clearIdleTimer();

    const cfg = cfgRef.current;
    if (!isEligible(cfg)) return;

    // Selection is fixed per stable-idle segment.
    // If not present yet, pick one now (still the same idle segment).
    ensureSelected(lastTurnKeyRef.current);

    const token = playTokenRef.current;

    idleTimerRef.current = window.setTimeout(() => {
      if (playTokenRef.current !== token) return;
      startPlaybackRef.current();
    }, IDLE_MS);
  }, [clearIdleTimer, ensureSelected]);

  const scheduleSwitch = useCallback(() => {
    if (typeof window === 'undefined') return;

    clearSwitchTimer();

    const sec = SWITCH_HINT_SAME_TURN_SEC | 0;
    if (sec <= 0) return;

    const cfg = cfgRef.current;
    if (!isEligible(cfg)) return;

    const token = playTokenRef.current;

    switchTimerRef.current = window.setTimeout(() => {
      if (playTokenRef.current !== token) return;

      const cfgNow = cfgRef.current;
      if (!isEligible(cfgNow)) return;

      const cur = selectedRef.current;
      const avoid = cur ? cur.key : null;

      selectedRef.current = null;
      const next = ensureSelected(avoid);
      if (next) lastTurnKeyRef.current = next.key;

      // Restart the idle timer so the new hint is shown after the same delay.
      cancelTimersAndFx();
      scheduleIdle();
      scheduleSwitch();
    }, sec * 1000);
  }, [clearSwitchTimer, ensureSelected, cancelTimersAndFx, scheduleIdle]);

  const flashBlink = useCallback((token: number, ids: readonly PieceId[]) => {
    if (typeof window === 'undefined') return;

    setBlinkPieceIds(ids);
    setBlinkActive(true);

    const off = window.setTimeout(() => {
      if (playTokenRef.current !== token) return;
      setBlinkActive(false);
    }, BLINK_MS);

    timersRef.current.push(off);
  }, []);

  const startPlayback = useCallback(() => {
    if (typeof window === 'undefined') return;

    const cfg = cfgRef.current;
    if (!isEligible(cfg)) return;

    clearPlayTimers();
    clearFx();

    const hint = ensureSelected(lastTurnKeyRef.current);
    if (!hint) return;

    // "dragging"/nudge must always be the mover (missing 3rd tile).
    const moverPid = hint.moverPieceId;

    // Fix: do NOT switch hints by default; keep the same selected hint across replays.
    lastTurnKeyRef.current = hint.key;

    const token = ++playTokenRef.current;

    const ampPx = Math.max(2, Math.round(cfg.tileDist * 0.12));

    const mkNudge = (amount: number): HintNudge => ({
      pieceId: moverPid,
      dx: hint.dx === 0 ? 0 : hint.dx * amount,
      dy: hint.dy === 0 ? 0 : hint.dy * amount,
      transitionMs: NUDGE_MS,
    });

    // STEP 1: nudge + blink
    setNudge(mkNudge(ampPx));
    flashBlink(token, hint.blinkPieceIds);

    const t1 = window.setTimeout(() => {
      if (playTokenRef.current !== token) return;
      setNudge(mkNudge(0));
    }, NUDGE_MS);

    const t2 = window.setTimeout(
      () => {
        if (playTokenRef.current !== token) return;
        setNudge(mkNudge(ampPx));
        flashBlink(token, hint.blinkPieceIds);
      },
      2 * NUDGE_MS + GAP_MS,
    );

    const t3 = window.setTimeout(
      () => {
        if (playTokenRef.current !== token) return;
        setNudge(mkNudge(0));
      },
      3 * NUDGE_MS + GAP_MS,
    );

    const done = window.setTimeout(
      () => {
        if (playTokenRef.current !== token) return;
        clearFx();
        scheduleIdle(); // repeat same hint after idle delay
      },
      4 * NUDGE_MS + GAP_MS,
    );

    timersRef.current.push(t1, t2, t3, done);
  }, [clearPlayTimers, clearFx, ensureSelected, flashBlink, scheduleIdle]);

  // Keep scheduleIdle calling the latest startPlayback without a circular hook dependency.
  useEffect(() => {
    startPlaybackRef.current = startPlayback;
  }, [startPlayback]);

  const stopAllAndClearSelection = useCallback(() => {
    cancelTimersAndFx();
    selectedRef.current = null;
  }, [cancelTimersAndFx]);

  // Stable-idle boundaries:
  // - On entering idle => pick a random hint ONCE and keep it fixed (no switching by default).
  // - On leaving idle  => clear selection and stop timers.
  const prevPhaseRef = useRef<EnginePhase | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (!enabled) {
      stopAllAndClearSelection();
      return;
    }

    if (phase === 'idle' && prev !== 'idle') {
      // new stable idle segment => choose new random hint immediately
      selectedRef.current = null;

      const cfg = cfgRef.current;
      if (canSelect(cfg)) {
        const picked = ensureSelected(lastTurnKeyRef.current);
        if (picked) lastTurnKeyRef.current = picked.key;
      }

      cancelTimersAndFx();
      scheduleIdle();
      scheduleSwitch();
      return;
    }

    if (prev === 'idle' && phase !== 'idle') {
      stopAllAndClearSelection();
    }
  }, [enabled, phase, ensureSelected, cancelTimersAndFx, scheduleIdle, scheduleSwitch, stopAllAndClearSelection]);

  // Expose an activity hook to reset the idle timer + cancel active hint playback.
  // IMPORTANT: Activity does NOT re-pick a hint (same turn / same stable idle segment).
  const onActivity = useCallback(() => {
    cancelTimersAndFx();
    scheduleIdle();
    scheduleSwitch();
  }, [cancelTimersAndFx, scheduleIdle, scheduleSwitch]);

  // Keep schedule in sync with gates/candidates while staying in idle.
  // If swaps become empty or we become ineligible, stop effects/timers (selection is cleared when leaving idle).
  useEffect(() => {
    if (!enabled) return;

    const cfg = cfgRef.current;
    if (!isEligible(cfg)) {
      cancelTimersAndFx();
      return;
    }

    // If we're eligible and have no timer (e.g. candidates arrived), arm idle.
    scheduleIdle();
    scheduleSwitch();
  }, [enabled, inputLocked, isDragging, swaps, cells, pieces, tileDist, scheduleIdle, scheduleSwitch, cancelTimersAndFx]);

  return { blinkActive, blinkPieceIds, nudge, onActivity };
}
