// src\features\grid\ui\bomb\useBomb3x3Targeting.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import { getBomb3x3IndicesFromTarget } from '@/gamelogic/itemeffects/bomb';
import { POWER_ARM_EVENT, POWER_USE_AT_EVENT, type PowerArmDetail, type PowerUseAtDetail } from '@/context/powerEvents';

import { playSfx, preloadSfx } from '@/features/audio/sfx/sfxPlayer';

import { GAP, TILE_SIZE } from '../../lib/constants';
import type { BombTarget } from './typesBomb';
import type { BombExplosionBurst } from './fx/BombExplosionFxLayer';

type BombPowerUsedEvent = Readonly<{
  type: 'powerUsed';
  requestId: number;
  key: 'bomb';
}>;

function isBombPowerUsedEvent(ev: unknown): ev is BombPowerUsedEvent {
  if (!ev || typeof ev !== 'object') return false;
  const rec = ev as Record<string, unknown>;

  if (rec.type !== 'powerUsed') return false;
  if (typeof rec.requestId !== 'number' || !Number.isFinite(rec.requestId)) return false;

  return rec.key === 'bomb';
}

type Args = {
  width: number;
  height: number;

  // Engine-relevant lockout (prevents overlapping actions).
  inputLocked: boolean;

  // Used for POWER_CONSUME_EVENT (engine ACK = powerUsed)
  engineEvents: readonly unknown[];

  // Reduced motion hint (swapMs===0)
  reducedMotion?: boolean;

  // Optional: stage element id used for viewport-level listeners.
  stageElementId?: string;
};

export type Bomb3x3TargetingApi = Readonly<{
  bombArmed: boolean;
  bombHoverTarget: BombTarget | null;
  bombOverlayIndices: readonly number[];

  // Detonation FX bursts (added only after ACK)
  bombBursts: readonly BombExplosionBurst[];

  boardRef: RefObject<HTMLDivElement | null>;

  onShellPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onShellPointerLeave: () => void;

  onCellPointerDown: (index: number, e: ReactPointerEvent<HTMLButtonElement>) => void;

  disarm: () => void;
}>;

type PendingFx = Readonly<{
  indices: readonly number[];
  center: BombTarget;
}>;

export function useBomb3x3Targeting({
  width,
  height,
  inputLocked,
  engineEvents,
  reducedMotion = false,
  stageElementId = 'app-stage',
}: Args): Bomb3x3TargetingApi {
  const [bombArmed, setBombArmed] = useState(false);

  // Warm up SFX when the mode becomes active (keeps first detonation snappy)
  useEffect(() => {
    if (!bombArmed) return;
    void preloadSfx('bombExplosion');
  }, [bombArmed]);

  const [bombHoverTarget, _setBombHoverTarget] = useState<BombTarget | null>(null);

  const bombHoverTargetRef = useRef<BombTarget | null>(null);
  const lastHoverRef = useRef<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const powerReqIdRef = useRef(1);
  const pendingConsumeRef = useRef<Set<number>>(new Set());

  // requestId -> indices/center (used only when ACK arrives)
  const pendingFxRef = useRef<Map<number, PendingFx>>(new Map());

  const [bombBursts, setBombBursts] = useState<readonly BombExplosionBurst[]>([]);
  const burstTimeoutsRef = useRef<Map<number, number>>(new Map());

  const setBombHoverTarget = useCallback((t: BombTarget | null) => {
    bombHoverTargetRef.current = t;
    _setBombHoverTarget(t);
  }, []);

  const clearBombHover = useCallback(() => {
    lastHoverRef.current = null;
    setBombHoverTarget(null);
  }, [setBombHoverTarget]);

  const disarm = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
    }
    clearBombHover();
  }, [clearBombHover]);

  // Listen to global power arm/disarm (GameFooter drives this)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;

      const armed = !!d.armed;
      setBombArmed(armed);
      if (!armed) clearBombHover();
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, [clearBombHover]);

  // Safety: if engine locks while bomb mode is armed, disarm (avoids "stuck crosshair")
  // schedule disarm async (no sync setState in effect body)
  useEffect(() => {
    if (!bombArmed) return;
    if (!inputLocked) return;
    if (typeof window === 'undefined') return;

    const id = window.setTimeout(() => {
      disarm();
    }, 0);

    return () => window.clearTimeout(id);
  }, [bombArmed, inputLocked, disarm]);

  // Consume power + emit detonation burst only after engine ACK event (powerUsed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pendingConsumeRef.current.size === 0) return;

    const ttlMs = reducedMotion ? 220 : 650;

    for (const ev of engineEvents) {
      if (!isBombPowerUsedEvent(ev)) continue;

      const requestId = ev.requestId | 0;
      if (!pendingConsumeRef.current.has(requestId)) continue;

      pendingConsumeRef.current.delete(requestId);

      // 1) ACK drives FX here; inventory spend is emitted by engine bridge
      // 2) Detonation FX burst (also only after ACK)
      const payload = pendingFxRef.current.get(requestId);
      if (payload && payload.indices.length > 0) {
        pendingFxRef.current.delete(requestId);

        // SFX: best-effort (file may be missing during setup)
        playSfx('bombExplosion', { volume: 1 });

        const burst: BombExplosionBurst = {
          id: requestId,
          indices: payload.indices,
          center: payload.center,
          createdAtMs: performance.now(),
        };

        setBombBursts((prev) => [...prev, burst]);

        const tPrev = burstTimeoutsRef.current.get(requestId);
        if (typeof tPrev === 'number') window.clearTimeout(tPrev);

        const timeoutId = window.setTimeout(() => {
          setBombBursts((prev) => prev.filter((b) => b.id !== requestId));
          burstTimeoutsRef.current.delete(requestId);
        }, ttlMs);

        burstTimeoutsRef.current.set(requestId, timeoutId);
      } else {
        pendingFxRef.current.delete(requestId);
      }
    }
  }, [engineEvents, reducedMotion]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;

      for (const id of burstTimeoutsRef.current.values()) {
        window.clearTimeout(id);
      }
      burstTimeoutsRef.current.clear();
    };
  }, []);

  const confirmBombAt = useCallback(
    (target: BombTarget) => {
      // If engine is locked, abort targeting (avoid getting stuck)
      if (inputLocked) {
        disarm();
        return;
      }

      const indices = getBomb3x3IndicesFromTarget(target, width, height);

      // If no red target would exist -> abort targeting
      if (indices.length === 0) {
        disarm();
        return;
      }

      const requestId = powerReqIdRef.current++;
      pendingConsumeRef.current.add(requestId);
      pendingFxRef.current.set(requestId, { indices, center: target });

      if (typeof window !== 'undefined') {
        const detail: PowerUseAtDetail = { key: 'bomb', target, requestId };
        window.dispatchEvent(new CustomEvent<PowerUseAtDetail>(POWER_USE_AT_EVENT, { detail }));
        window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
      }

      clearBombHover();
    },
    [inputLocked, width, height, clearBombHover, disarm],
  );

  const updateBombHoverFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const step = TILE_SIZE + GAP;

      // nearest center among a small candidate neighborhood (incl. off-grid -1/+1)
      const baseCol = Math.floor(x / step);
      const baseRow = Math.floor(y / step);

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

          const dx = x - cx;
          const dy = y - cy;
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
      if (bestD2 > radius * radius) {
        if (lastHoverRef.current !== null) clearBombHover();
        return;
      }

      const key = `${bestCol},${bestRow}`;
      if (lastHoverRef.current !== key) {
        lastHoverRef.current = key;
        setBombHoverTarget({ x: bestCol, y: bestRow });
      }
    },
    [width, height, clearBombHover, setBombHoverTarget],
  );

  // Viewport-level Bomb Targeting (HUD + outside-board)
  // - right click/contextmenu => abort + disarm
  // - left click without red target => abort + disarm
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const stageEl = document.getElementById(stageElementId);
    if (!stageEl) return;

    if (bombArmed) stageEl.classList.add('match3-cursor-crosshair');
    else stageEl.classList.remove('match3-cursor-crosshair');

    if (!bombArmed) return;

    const isInsideStage = (clientX: number, clientY: number) => {
      const r = stageEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const abort = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      disarm();
    };

    const onMove = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) {
        clearBombHover();
        return;
      }
      updateBombHoverFromClient(e.clientX, e.clientY);
    };

    const onLeave = () => {
      clearBombHover();
    };

    const onDown = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;

      // Right click => abort
      if (e.button === 2) {
        abort(e);
        return;
      }

      // Only left click confirms (and owns the click in bomb mode)
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      updateBombHoverFromClient(e.clientX, e.clientY);

      const t = bombHoverTargetRef.current;
      if (!t) {
        // click in viewport without a red target => abort
        disarm();
        return;
      }

      // if this target would not render any red tiles => abort
      const indices = getBomb3x3IndicesFromTarget(t, width, height);
      if (indices.length === 0) {
        disarm();
        return;
      }

      confirmBombAt(t);
    };

    // Context menu (right click) => abort + no browser menu
    const onContextMenu = (e: MouseEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;
      abort(e);
    };

    stageEl.addEventListener('pointermove', onMove);
    stageEl.addEventListener('pointerleave', onLeave);
    stageEl.addEventListener('pointerdown', onDown, { capture: true });
    stageEl.addEventListener('contextmenu', onContextMenu, { capture: true });

    return () => {
      stageEl.removeEventListener('pointermove', onMove);
      stageEl.removeEventListener('pointerleave', onLeave);
      stageEl.removeEventListener('pointerdown', onDown, true);
      stageEl.removeEventListener('contextmenu', onContextMenu, true);
      stageEl.classList.remove('match3-cursor-crosshair');
    };
  }, [stageElementId, bombArmed, clearBombHover, updateBombHoverFromClient, confirmBombAt, disarm, width, height]);

  const bombOverlayIndices = useMemo(() => {
    if (!bombArmed) return [];
    if (!bombHoverTarget) return [];
    return getBomb3x3IndicesFromTarget(bombHoverTarget, width, height);
  }, [bombArmed, bombHoverTarget, width, height]);

  const onShellPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!bombArmed) return;
      updateBombHoverFromClient(e.clientX, e.clientY);
    },
    [bombArmed, updateBombHoverFromClient],
  );

  const onShellPointerLeave = useCallback(() => {
    if (!bombArmed) return;
    clearBombHover();
  }, [bombArmed, clearBombHover]);

  const onCellPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!bombArmed) return;

      // right click on cell => abort
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        disarm();
        return;
      }

      if (e.button !== 0) return;

      const x = index % width;
      const y = Math.floor(index / width);

      confirmBombAt({ x, y });
    },
    [bombArmed, confirmBombAt, disarm, width],
  );

  return {
    bombArmed,
    bombHoverTarget,
    bombOverlayIndices,
    bombBursts,
    boardRef,
    onShellPointerMove,
    onShellPointerLeave,
    onCellPointerDown,
    disarm,
  };
}
